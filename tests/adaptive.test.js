import { describe, it, expect } from "vitest";

// Test the Elo-style ability update logic (extracted for testability)

const K_FACTOR = 32;
const DEFAULT_ABILITY = 0.5;

function computeExpected(ability, difficulty) {
  return 1 / (1 + Math.pow(10, (difficulty - ability) * 4));
}

function updateAbility(currentAbility, difficulty, isCorrect) {
  const expected = computeExpected(currentAbility, difficulty);
  const actual = isCorrect ? 1 : 0;
  return Math.max(0, Math.min(1, currentAbility + (K_FACTOR / 100) * (actual - expected)));
}

function scoreCandidateQuestion(questionDifficulty, userAbility, isReview) {
  const difficultyMatch = 1 - Math.abs(questionDifficulty - userAbility);
  const reviewBoost = isReview ? 2.0 : 0;
  return difficultyMatch + reviewBoost;
}

function computeSpacedInterval(attempts, isCorrect) {
  if (isCorrect) return 0; // No review needed
  return Math.min((attempts || 1) * 2, 30);
}

describe("Adaptive Assessment Engine", () => {
  describe("Elo Expected Score", () => {
    it("returns ~0.5 when ability equals difficulty", () => {
      const expected = computeExpected(0.5, 0.5);
      expect(expected).toBeCloseTo(0.5, 1);
    });

    it("returns high value when ability >> difficulty", () => {
      const expected = computeExpected(0.9, 0.1);
      expect(expected).toBeGreaterThan(0.9);
    });

    it("returns low value when ability << difficulty", () => {
      const expected = computeExpected(0.1, 0.9);
      expect(expected).toBeLessThan(0.1);
    });
  });

  describe("Ability Update", () => {
    it("increases ability on correct answer to hard question", () => {
      const newAbility = updateAbility(0.5, 0.8, true);
      expect(newAbility).toBeGreaterThan(0.5);
    });

    it("decreases ability on wrong answer to easy question", () => {
      const newAbility = updateAbility(0.5, 0.2, false);
      expect(newAbility).toBeLessThan(0.5);
    });

    it("barely changes on correct answer to easy question", () => {
      const newAbility = updateAbility(0.8, 0.1, true);
      // Expected is high, so update is small
      expect(Math.abs(newAbility - 0.8)).toBeLessThan(0.05);
    });

    it("clamps to [0, 1] range", () => {
      const low = updateAbility(0.01, 0.99, false);
      expect(low).toBeGreaterThanOrEqual(0);

      const high = updateAbility(0.99, 0.01, true);
      expect(high).toBeLessThanOrEqual(1);
    });

    it("converges toward question difficulty over multiple correct answers", () => {
      let ability = 0.2;
      const difficulty = 0.7;
      for (let i = 0; i < 20; i++) {
        ability = updateAbility(ability, difficulty, true);
      }
      // After many correct answers at difficulty 0.7, ability should approach 0.7+
      expect(ability).toBeGreaterThan(0.6);
    });
  });

  describe("Question Scoring", () => {
    it("prefers questions at user's ability level", () => {
      const scoreMatch = scoreCandidateQuestion(0.5, 0.5, false);
      const scoreMismatch = scoreCandidateQuestion(0.9, 0.1, false);
      expect(scoreMatch).toBeGreaterThan(scoreMismatch);
    });

    it("boosts review questions significantly", () => {
      const normal = scoreCandidateQuestion(0.5, 0.5, false);
      const review = scoreCandidateQuestion(0.5, 0.5, true);
      expect(review - normal).toBeCloseTo(2.0, 1);
    });
  });

  describe("Spaced Repetition", () => {
    it("returns 0 interval for correct answers", () => {
      expect(computeSpacedInterval(1, true)).toBe(0);
      expect(computeSpacedInterval(5, true)).toBe(0);
    });

    it("increases interval with attempts", () => {
      expect(computeSpacedInterval(1, false)).toBe(2);
      expect(computeSpacedInterval(3, false)).toBe(6);
      expect(computeSpacedInterval(5, false)).toBe(10);
    });

    it("caps interval at 30 days", () => {
      expect(computeSpacedInterval(100, false)).toBe(30);
    });
  });
});
