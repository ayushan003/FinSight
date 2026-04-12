import { db } from "@/lib/prisma";

const QUIZ_SIZE = 10;
const K_FACTOR = 32; // Elo K-factor
const DEFAULT_ABILITY = 0.5;

/**
 * Select questions adaptively for a user based on:
 * 1. Spaced repetition — prioritize questions due for review
 * 2. Ability targeting — select difficulty near user's estimated ability
 * 3. Topic coverage — spread across available topics
 * 4. Avoid recent repeats
 */
export async function selectQuestions(userId, industry) {
  // Get user's topic abilities
  const abilities = await db.userTopicAbility.findMany({
    where: { userId },
  });

  const abilityMap = {};
  for (const a of abilities) {
    abilityMap[a.topic] = a.ability;
  }

  // 1. Check for spaced repetition candidates (due for review)
  const now = new Date();
  const dueForReview = await db.questionResponse.findMany({
    where: {
      userId,
      isCorrect: false,
      nextReviewAt: { lte: now },
    },
    select: { questionId: true },
    take: 3, // Max 3 review questions per quiz
  });

  const reviewIds = dueForReview.map((r) => r.questionId);

  // 2. Get recently answered question IDs to avoid repeats
  const recentResponses = await db.questionResponse.findMany({
    where: { userId },
    orderBy: { answeredAt: "desc" },
    take: 50,
    select: { questionId: true },
  });
  const recentIds = new Set(recentResponses.map((r) => r.questionId));

  // 3. Get all available questions for this industry
  const allQuestions = await db.question.findMany({
    where: { industry },
    select: { id: true, topic: true, difficulty: true },
  });

  if (allQuestions.length === 0) {
    return []; // No questions seeded yet
  }

  // 4. Score each question for selection
  const scored = allQuestions
    .filter((q) => !recentIds.has(q.id) || reviewIds.includes(q.id))
    .map((q) => {
      const userAbility = abilityMap[q.topic] ?? DEFAULT_ABILITY;
      // Prefer questions near user's ability (optimal challenge point)
      const difficultyMatch = 1 - Math.abs(q.difficulty - userAbility);
      // Boost review questions
      const reviewBoost = reviewIds.includes(q.id) ? 2.0 : 0;
      // Small random factor for variety
      const jitter = Math.random() * 0.1;

      return {
        ...q,
        score: difficultyMatch + reviewBoost + jitter,
      };
    });

  // 5. Sort by score descending, pick top N with topic diversity
  scored.sort((a, b) => b.score - a.score);

  const selected = [];
  const topicCounts = {};

  for (const q of scored) {
    if (selected.length >= QUIZ_SIZE) break;
    // Max 3 questions per topic for diversity
    const count = topicCounts[q.topic] || 0;
    if (count >= 3) continue;
    selected.push(q.id);
    topicCounts[q.topic] = count + 1;
  }

  // If we don't have enough, fill with any available
  if (selected.length < QUIZ_SIZE) {
    for (const q of allQuestions) {
      if (selected.length >= QUIZ_SIZE) break;
      if (!selected.includes(q.id)) {
        selected.push(q.id);
      }
    }
  }

  return selected;
}

/**
 * Update user's topic abilities using Elo-style rating after a quiz.
 * Each correct/incorrect answer adjusts ability toward the question's difficulty.
 */
export async function updateAbilities(userId, results) {
  for (const r of results) {
    const question = await db.question.findUnique({
      where: { id: r.questionId },
      select: { topic: true, difficulty: true },
    });

    if (!question) continue;

    // Get or create ability record
    let ability = await db.userTopicAbility.upsert({
      where: { userId_topic: { userId, topic: question.topic } },
      update: {},
      create: { userId, topic: question.topic, ability: DEFAULT_ABILITY },
    });

    // Elo update: expected score based on ability vs difficulty
    const expected = 1 / (1 + Math.pow(10, (question.difficulty - ability.ability) * 4));
    const actual = r.isCorrect ? 1 : 0;
    const newAbility = Math.max(0, Math.min(1, ability.ability + (K_FACTOR / 100) * (actual - expected)));

    await db.userTopicAbility.update({
      where: { id: ability.id },
      data: {
        ability: newAbility,
        attempts: { increment: 1 },
        correct: r.isCorrect ? { increment: 1 } : undefined,
      },
    });

    // Update spaced repetition schedule
    await db.questionResponse.create({
      data: {
        questionId: r.questionId,
        userId,
        userAnswer: r.userAnswer,
        isCorrect: r.isCorrect,
        nextReviewAt: r.isCorrect
          ? null // Correct — don't schedule review
          : new Date(Date.now() + (ability.attempts <= 1 ? 1 : Math.min(ability.attempts * 2, 30)) * 24 * 60 * 60 * 1000),
        interval: r.isCorrect ? 0 : Math.min((ability.attempts || 1) * 2, 30),
      },
    });
  }
}

/**
 * Seed questions for an industry using Gemini.
 * Generates questions across multiple topics with varied difficulty.
 */
export async function seedQuestions(industry, topics, model) {
  const existingCount = await db.question.count({ where: { industry } });
  if (existingCount >= 50) return existingCount; // Already seeded

  const prompt = `
    Generate 50 finance assessment questions for the "${industry}" sector.
    Distribute across these topics: ${topics.join(", ")}.

    For each question, assign a difficulty from 0.0 (easy) to 1.0 (hard).
    Mix difficulties: ~15 easy (0.1-0.3), ~20 medium (0.4-0.6), ~15 hard (0.7-0.9).

    Return ONLY valid JSON:
    {
      "questions": [
        {
          "topic": "string",
          "difficulty": number,
          "question": "string",
          "options": ["Full text of option 1", "Full text of option 2", "Full text of option 3", "Full text of option 4"],
          "correctAnswer": "Full text of the correct option (must EXACTLY match one of the options strings)",
          "explanation": "string"
        }
      ]
    }

    STRICT RULES:
    1. The correctAnswer must be the EXACT same string as one of the options. Do NOT use letters like "A" or "B".
    2. ALL FOUR OPTIONS MUST BE SIMILAR IN LENGTH AND DETAIL. Do not make the correct answer longer or more detailed than the wrong answers. If the correct answer is 10 words, every wrong answer must also be approximately 10 words. This is critical.
    3. Wrong answers must be plausible and well-explained, not obviously short throwaway text.
    4. Distribute correct answer positions evenly across all 4 positions — do not favor any position.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```(?:\w*)\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid question format");
    }

    // Shuffle options to eliminate LLM position bias (Gemini favors option B)
    for (const q of parsed.questions) {
      if (Array.isArray(q.options) && q.options.length === 4 && q.correctAnswer) {
        const correctText = q.correctAnswer;
        // Fisher-Yates shuffle
        for (let i = q.options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
        }
        // correctAnswer stays as the full text — it still matches after shuffle
      }
    }

    let inserted = 0;
    for (const q of parsed.questions) {
      try {
        await db.question.create({
          data: {
            industry,
            topic: q.topic,
            difficulty: Math.max(0, Math.min(1, q.difficulty || 0.5)),
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          },
        });
        inserted++;
      } catch (err) {
        console.error("Error inserting question:", err.message);
      }
    }

    return inserted;
  } catch (err) {
    console.error("Error seeding questions:", err.message);
    return 0;
  }
}
