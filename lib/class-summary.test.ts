import { test } from "node:test";
import assert from "node:assert/strict";

// Test rubric validation logic and class summary computation.
// These mirror the pure logic from rubric-editor.tsx and class-summary.tsx
// without needing React/browser rendering.

interface RubricCategory {
  key: string;
  label: string;
  max: number;
  description: string;
}

interface Rubric {
  id: string;
  name: string;
  categories: RubricCategory[];
}

interface ScoreCategory {
  key: string;
  label: string;
  score: number;
  max: number;
  feedback: string;
}

interface Submission {
  id: string;
  studentName: string;
  title: string;
  classPosition: number;
  classSize: number;
  scores: ScoreCategory[];
  highlights: { id: string; kind: string }[];
  overallNote: string;
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

function computeSummary(submissions: Submission[], batchCurve: number) {
  const summaries = submissions.map((s) => {
    const totals = totalScore(s.scores, batchCurve);
    return {
      id: s.id,
      studentName: s.studentName,
      title: s.title,
      totalScore: totals.curved,
      maxScore: totals.max,
      letterGrade: letterGrade(totals.max > 0 ? (totals.curved / totals.max) * 100 : 0),
      highlightCount: s.highlights.length,
    };
  });

  const sorted = [...summaries].sort((a, b) => b.totalScore - a.totalScore);

  const totalPercent =
    summaries.length > 0
      ? summaries.reduce(
          (sum, s) => sum + (s.totalScore / s.maxScore) * 100,
          0,
        ) / summaries.length
      : 0;

  const avgLetter =
    summaries.length > 0 ? letterGrade(totalPercent) : "—";

  const gradeDistribution = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"].reduce(
    (acc, g) => {
      acc[g] = sorted.filter((s) => s.letterGrade === g).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const categoryMap = new Map<string, { score: number; max: number; count: number }>();
  for (const s of submissions) {
    for (const c of s.scores) {
      const existing = categoryMap.get(c.key) ?? { score: 0, max: 0, count: 0 };
      categoryMap.set(c.key, {
        score: existing.score + c.score,
        max: existing.max + c.max,
        count: existing.count + 1,
      });
    }
  }

  const categoryAverages = Array.from(categoryMap.entries()).map(
    ([key, v]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      average: v.count > 0 ? Math.round((v.score / v.max) * 100) : 0,
    }),
  );

  return {
    summaries: sorted,
    totalPercent: Math.round(totalPercent),
    avgLetter,
    gradeDistribution,
    categoryAverages,
  };
}

function validateRubric(rubric: Rubric): string[] {
  const errors: string[] = [];
  if (!rubric.name.trim()) errors.push("Rubric name is required");
  if (rubric.categories.length === 0) errors.push("At least one category is required");
  if (rubric.categories.length > 10) errors.push("Maximum 10 categories allowed");

  const keys = new Set<string>();
  for (const cat of rubric.categories) {
    if (!cat.label.trim()) errors.push(`Category label is required`);
    if (cat.max <= 0) errors.push(`${cat.label || "Category"} max must be > 0`);
    if (cat.max > 100) errors.push(`${cat.label || "Category"} max must be ≤ 100`);
    if (keys.has(cat.key)) errors.push(`Duplicate category key: ${cat.key}`);
    keys.add(cat.key);
  }

  return errors;
}

// --- Rubric validation tests ---

test("validateRubric accepts a valid rubric", () => {
  const rubric: Rubric = {
    id: "test",
    name: "Test Rubric",
    categories: [
      { key: "a", label: "Category A", max: 20, description: "desc" },
      { key: "b", label: "Category B", max: 30, description: "desc" },
    ],
  };
  assert.deepEqual(validateRubric(rubric), []);
});

test("validateRubric rejects empty name", () => {
  const rubric: Rubric = {
    id: "test",
    name: "   ",
    categories: [{ key: "a", label: "A", max: 20, description: "d" }],
  };
  const errors = validateRubric(rubric);
  assert.ok(errors.some((e) => e.includes("name")));
});

test("validateRubric rejects empty categories", () => {
  const rubric: Rubric = { id: "test", name: "Test", categories: [] };
  const errors = validateRubric(rubric);
  assert.ok(errors.some((e) => e.includes("At least one")));
});

test("validateRubric rejects more than 10 categories", () => {
  const cats: RubricCategory[] = Array.from({ length: 11 }, (_, i) => ({
    key: `k${i}`,
    label: `Cat ${i}`,
    max: 10,
    description: "d",
  }));
  const rubric: Rubric = { id: "test", name: "Test", categories: cats };
  const errors = validateRubric(rubric);
  assert.ok(errors.some((e) => e.includes("Maximum 10")));
});

test("validateRubric rejects max <= 0", () => {
  const rubric: Rubric = {
    id: "test",
    name: "Test",
    categories: [{ key: "a", label: "A", max: 0, description: "d" }],
  };
  const errors = validateRubric(rubric);
  assert.ok(errors.some((e) => e.includes("must be > 0")));
});

test("validateRubric rejects max > 100", () => {
  const rubric: Rubric = {
    id: "test",
    name: "Test",
    categories: [{ key: "a", label: "A", max: 150, description: "d" }],
  };
  const errors = validateRubric(rubric);
  assert.ok(errors.some((e) => e.includes("≤ 100")));
});

test("validateRubric rejects duplicate keys", () => {
  const rubric: Rubric = {
    id: "test",
    name: "Test",
    categories: [
      { key: "same", label: "A", max: 20, description: "d" },
      { key: "same", label: "B", max: 20, description: "d" },
    ],
  };
  const errors = validateRubric(rubric);
  assert.ok(errors.some((e) => e.includes("Duplicate")));
});

// --- Class summary computation tests ---

function makeSub(
  id: string,
  name: string,
  scores: [number, number][],
  hlCount: number,
): Submission {
  return {
    id,
    studentName: name,
    title: `${name}'s essay`,
    classPosition: 1,
    classSize: 1,
    scores: scores.map(([score, max], i) => ({
      key: `cat${i}`,
      label: `Category ${i}`,
      score,
      max,
      feedback: "",
    })),
    highlights: Array.from({ length: hlCount }, (_, i) => ({
      id: `hl-${i}`,
      kind: "weak-thesis",
    })),
    overallNote: "",
  };
}

test("computeSummary returns correct averages for single submission", () => {
  // 5 categories of max 20 = 100 total, matching the default rubric
  const subs = [makeSub("s1", "Alice", [[16, 20], [14, 20], [18, 20], [15, 20], [17, 20]], 2)];
  const result = computeSummary(subs, 0);
  assert.equal(result.summaries.length, 1);
  assert.equal(result.summaries[0].totalScore, 80);
  assert.equal(result.summaries[0].maxScore, 100);
  assert.equal(result.summaries[0].letterGrade, "B-"); // 80%
  assert.equal(result.totalPercent, 80);
  assert.equal(result.avgLetter, "B-");
});

test("computeSummary sorts by total score descending", () => {
  const low: [number, number][] = [[10, 20], [10, 20], [10, 20], [10, 20], [10, 20]];
  const high: [number, number][] = [[18, 20], [18, 20], [18, 20], [18, 20], [18, 20]];
  const mid: [number, number][] = [[15, 20], [15, 20], [15, 20], [15, 20], [15, 20]];
  const subs = [
    makeSub("s1", "Low", low, 0),
    makeSub("s2", "High", high, 0),
    makeSub("s3", "Mid", mid, 0),
  ];
  const result = computeSummary(subs, 0);
  assert.equal(result.summaries[0].studentName, "High");
  assert.equal(result.summaries[1].studentName, "Mid");
  assert.equal(result.summaries[2].studentName, "Low");
});

test("computeSummary applies batch curve", () => {
  const subs = [makeSub("s1", "Alice", [[16, 20], [16, 20], [16, 20], [16, 20], [16, 20]], 0)];
  const result = computeSummary(subs, 4);
  assert.equal(result.summaries[0].totalScore, 84); // 80 + 4
});

test("computeSummary counts grade distribution", () => {
  // Use 5 categories of max 20 (total 100) so letterGrade works correctly
  const subs = [
    makeSub("s1", "A Student", [[19, 20], [19, 20], [19, 20], [19, 20], [17, 20]], 0), // 93 → A
    makeSub("s2", "B Student", [[16, 20], [16, 20], [16, 20], [16, 20], [16, 20]], 0), // 80 → B-
    makeSub("s3", "Another A", [[19, 20], [18, 20], [19, 20], [18, 20], [18, 20]], 0), // 92 → A-
  ];
  const result = computeSummary(subs, 0);
  assert.equal(result.gradeDistribution["A"], 1);
  assert.equal(result.gradeDistribution["A-"], 1);
  assert.equal(result.gradeDistribution["B-"], 1);
  assert.equal(result.gradeDistribution["B"], 0);
});

test("computeSummary computes category averages", () => {
  const sub1 = makeSub("s1", "Alice", [[16, 20], [14, 20], [18, 20], [15, 20], [17, 20]], 0);
  const sub2 = makeSub("s2", "Bob", [[18, 20], [10, 20], [16, 20], [12, 20], [14, 20]], 0);
  const result = computeSummary([sub1, sub2], 0);
  assert.equal(result.categoryAverages.length, 5);
  // cat0: (16+18)/(20+20) = 34/40 = 85%
  assert.equal(result.categoryAverages[0].average, 85);
  // cat1: (14+10)/(20+20) = 24/40 = 60%
  assert.equal(result.categoryAverages[1].average, 60);
});

test("computeSummary handles empty submissions", () => {
  const result = computeSummary([], 0);
  assert.equal(result.summaries.length, 0);
  assert.equal(result.totalPercent, 0);
  assert.equal(result.avgLetter, "—");
});

test("computeSummary counts highlights per paper", () => {
  const subs = [
    makeSub("s1", "Alice", [[16, 20]], 3),
    makeSub("s2", "Bob", [[14, 20]], 1),
  ];
  const result = computeSummary(subs, 0);
  const alice = result.summaries.find((s) => s.studentName === "Alice");
  const bob = result.summaries.find((s) => s.studentName === "Bob");
  assert.equal(alice?.highlightCount, 3);
  assert.equal(bob?.highlightCount, 1);
});

test("computeSummary handles edge case: perfect scores", () => {
  const subs = [makeSub("s1", "Perfect", [[20, 20], [20, 20], [20, 20], [20, 20], [20, 20]], 0)];
  const result = computeSummary(subs, 0);
  assert.equal(result.totalPercent, 100);
  assert.equal(result.avgLetter, "A");
  assert.equal(result.summaries[0].letterGrade, "A");
});

test("computeSummary handles edge case: zero scores", () => {
  const subs = [makeSub("s1", "Zero", [[0, 20], [0, 20], [0, 20], [0, 20], [0, 20]], 0)];
  const result = computeSummary(subs, 0);
  assert.equal(result.totalPercent, 0);
  assert.equal(result.avgLetter, "F");
});
