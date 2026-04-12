"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { selectQuestions, updateAbilities, seedQuestions } from "@/lib/assessment/adaptive";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const QUIZ_TOPICS = [
  "Financial Theory",
  "Valuation Methods",
  "Market Mechanics",
  "Risk Assessment",
  "Portfolio Management",
];

function sanitizeForPrompt(str) {
  if (!str) return "";
  return str.replace(/---/g, "").replace(/```/g, "").replace(/\\/g, "").slice(0, 500);
}

export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, industry: true },
  });

  if (!user) throw new Error("User not found");

  // Seed question bank if needed
  const qCount = await db.question.count({ where: { industry: user.industry } });
  if (qCount < 10) {
    await seedQuestions(user.industry, QUIZ_TOPICS, model);
  }

  // Select questions adaptively
  const questionIds = await selectQuestions(user.id, user.industry);

  if (questionIds.length === 0) {
    throw new Error("No questions available. Please try again later.");
  }

  // Create quiz session in DB (not in-memory!)
  const session = await db.quizSession.create({
    data: {
      userId: user.id,
      questionIds: questionIds,
      status: "active",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour TTL
    },
  });

  // Fetch full questions for client (without correct answers)
  const questions = await db.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      question: true,
      options: true,
      topic: true,
      difficulty: true,
    },
  });

  // Return in order of questionIds
  const orderedQuestions = questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean);

  return {
    sessionId: session.id,
    questions: orderedQuestions,
  };
}

export async function saveQuizResult(sessionId, answers) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("Invalid session ID");
  }

  if (!Array.isArray(answers)) {
    throw new Error("Invalid input: answers must be an array");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, industry: true },
  });
  if (!user) throw new Error("User not found");

  // Retrieve quiz session from DB
  const session = await db.quizSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw new Error("Quiz session not found");
  if (session.userId !== user.id) throw new Error("Unauthorized");
  if (session.status !== "active") throw new Error("Quiz already submitted");
  if (new Date() > session.expiresAt) {
    await db.quizSession.update({
      where: { id: sessionId },
      data: { status: "expired" },
    });
    throw new Error("Quiz session expired");
  }

  const questionIds = session.questionIds;
  if (answers.length !== questionIds.length) {
    throw new Error("Answer count does not match question count");
  }

  // Fetch full questions with correct answers (server-side only)
  const questions = await db.question.findMany({
    where: { id: { in: questionIds } },
  });

  const questionMap = {};
  for (const q of questions) {
    questionMap[q.id] = q;
  }

  // Grade answers
  const results = questionIds.map((qId, i) => {
    const q = questionMap[qId];
    return {
      questionId: qId,
      question: q.question,
      answer: q.correctAnswer,
      userAnswer: answers[i],
      isCorrect: q.correctAnswer === answers[i],
      explanation: q.explanation,
      topic: q.topic,
      difficulty: q.difficulty,
    };
  });

  // Normalize: if correctAnswer doesn't match any option, try to match by index letter
  for (const r of results) {
    if (!r.isCorrect && r.answer) {
      const q = questionMap[r.questionId];
      const opts = Array.isArray(q.options) ? q.options : [];
      // Check if correctAnswer is a letter like "A","B","C","D"
      const letterIndex = {"A":0,"B":1,"C":2,"D":3,"a":0,"b":1,"c":2,"d":3};
      if (letterIndex[r.answer] !== undefined && opts[letterIndex[r.answer]]) {
        const fullText = opts[letterIndex[r.answer]];
        r.answer = fullText;
        r.isCorrect = fullText === r.userAnswer;
      }
    }
  }
  const correctCount = results.filter((r) => r.isCorrect).length;
  const score = (correctCount / results.length) * 100;

  // Update quiz session
  await db.quizSession.update({
    where: { id: sessionId },
    data: { status: "completed", answers, completedAt: new Date() },
  });

  // Update Elo abilities + spaced repetition
  await updateAbilities(user.id, results);

  // Generate improvement tip for wrong answers
  const wrongAnswers = results.filter((r) => !r.isCorrect);
  let improvementTip = null;

  if (wrongAnswers.length > 0) {
    const weakTopics = [...new Set(wrongAnswers.map((w) => w.topic))];
    const prompt = `
      The user scored ${score.toFixed(0)}% on a ${sanitizeForPrompt(user.industry)} finance assessment.
      They struggled with these topics: ${weakTopics.join(", ")}.
      Provide a concise 2-sentence study recommendation. Be encouraging and specific.
    `;

    try {
      const tipResult = await model.generateContent(prompt);
      improvementTip = tipResult.response.text().trim();
    } catch (err) {
      console.error("Error generating tip:", err.message);
    }
  }

  // Save assessment record
  const assessment = await db.assessment.create({
    data: {
      userId: user.id,
      quizScore: score,
      questions: results,
      category: "Finance",
      improvementTip,
    },
  });

  return {
    ...assessment,
    questions: results,
  };
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const assessments = await db.assessment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return assessments.map((a) => ({
    ...a,
    questions: Array.isArray(a.questions) ? a.questions : [],
  }));
}

export async function getTopicAbilities() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  return await db.userTopicAbility.findMany({
    where: { userId: user.id },
    orderBy: { topic: "asc" },
  });
}
