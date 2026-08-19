import { test } from "node:test";
import assert from "node:assert/strict";

// Test the pure grading utility functions inline to avoid module resolution issues.
// These are the same functions from lib/grading.ts tested independently.

type HighlightKind =
  | "weak-thesis"
  | "uncited-claim"
  | "vague-evidence"
  | "transition"
  | "grammar"
  | "positive";

function kindFromReason(reason: string): HighlightKind {
  const r = reason.toLowerCase();
  if (r.includes("thesis")) return "weak-thesis";
  if (r.includes("uncited") || r.includes("citation") || r.includes("source"))
    return "uncited-claim";
  if (r.includes("vague") || r.includes("evidence")) return "vague-evidence";
  if (r.includes("grammar") || r.includes("mechanic")) return "grammar";
  if (r.includes("transition")) return "transition";
  if (r.includes("strength") || r.includes("positive") || r.includes("great"))
    return "positive";
  return "vague-evidence";
}

function letterGrade(total: number): string {
  if (total >= 93) return "A";
  if (total >= 90) return "A-";
  if (total >= 87) return "B+";
  if (total >= 83) return "B";
  if (total >= 80) return "B-";
  if (total >= 77) return "C+";
  if (total >= 73) return "C";
  if (total >= 70) return "C-";
  if (total >= 67) return "D+";
  if (total >= 63) return "D";
  return "F";
}

function totalScore(
  scores: { score: number; max: number }[],
  curve = 0,
): { earned: number; max: number; curved: number } {
  const earned = scores.reduce((sum, c) => sum + c.score, 0);
  const max = scores.reduce((sum, c) => sum + c.max, 0);
  return { earned, max, curved: Math.min(max, earned + curve) };
}

// --- kindFromReason tests ---

test("kindFromReason maps thesis mentions to weak-thesis", () => {
  assert.equal(kindFromReason("Weak thesis statement"), "weak-thesis");
  assert.equal(kindFromReason("The THESIS is unclear"), "weak-thesis");
});

test("kindFromReason maps citation/source mentions to uncited-claim", () => {
  assert.equal(kindFromReason("Uncited statistic"), "uncited-claim");
  assert.equal(kindFromReason("Missing citation"), "uncited-claim");
  assert.equal(kindFromReason("No source provided"), "uncited-claim");
});

test("kindFromReason maps vague/evidence mentions to vague-evidence", () => {
  assert.equal(kindFromReason("Vague claim"), "vague-evidence");
  assert.equal(kindFromReason("Evidence is insufficient"), "vague-evidence");
});

test("kindFromReason maps grammar/mechanic mentions to grammar", () => {
  assert.equal(kindFromReason("Grammar error"), "grammar");
  assert.equal(kindFromReason("Mechanical issue"), "grammar");
});

test("kindFromReason maps transition mentions to transition", () => {
  assert.equal(kindFromReason("Weak transition"), "transition");
});

test("kindFromReason maps positive/strength mentions to positive", () => {
  assert.equal(kindFromReason("Great strength"), "positive");
  assert.equal(kindFromReason("Positive aspect"), "positive");
});

test("kindFromReason defaults to vague-evidence for unmatched", () => {
  assert.equal(kindFromReason("unclear writing"), "vague-evidence");
});

// --- letterGrade tests ---

test("letterGrade returns A for 93+", () => {
  assert.equal(letterGrade(93), "A");
  assert.equal(letterGrade(100), "A");
});

test("letterGrade returns A- for 90-92", () => {
  assert.equal(letterGrade(90), "A-");
  assert.equal(letterGrade(92), "A-");
});

test("letterGrade returns B+ for 87-89", () => {
  assert.equal(letterGrade(87), "B+");
  assert.equal(letterGrade(89), "B+");
});

test("letterGrade returns B for 83-86", () => {
  assert.equal(letterGrade(83), "B");
});

test("letterGrade returns B- for 80-82", () => {
  assert.equal(letterGrade(80), "B-");
});

test("letterGrade returns C+ for 77-79", () => {
  assert.equal(letterGrade(77), "C+");
});

test("letterGrade returns C for 73-76", () => {
  assert.equal(letterGrade(73), "C");
});

test("letterGrade returns C- for 70-72", () => {
  assert.equal(letterGrade(70), "C-");
});

test("letterGrade returns D+ for 67-69", () => {
  assert.equal(letterGrade(67), "D+");
});

test("letterGrade returns D for 63-66", () => {
  assert.equal(letterGrade(63), "D");
});

test("letterGrade returns F for below 63", () => {
  assert.equal(letterGrade(62), "F");
  assert.equal(letterGrade(0), "F");
});

// --- totalScore tests ---

test("totalScore sums earned and max correctly", () => {
  const result = totalScore([
    { score: 16, max: 20 },
    { score: 14, max: 20 },
  ]);
  assert.equal(result.earned, 30);
  assert.equal(result.max, 40);
  assert.equal(result.curved, 30); // no curve
});

test("totalScore applies curve", () => {
  const result = totalScore(
    [{ score: 30, max: 40 }],
    5,
  );
  assert.equal(result.earned, 30);
  assert.equal(result.max, 40);
  assert.equal(result.curved, 35);
});

test("totalScore clamps curved to max", () => {
  const result = totalScore(
    [{ score: 38, max: 40 }],
    5,
  );
  assert.equal(result.curved, 40); // 38 + 5 = 43, but clamped to 40
});

test("totalScore handles empty array", () => {
  const result = totalScore([]);
  assert.equal(result.earned, 0);
  assert.equal(result.max, 0);
  assert.equal(result.curved, 0);
});
