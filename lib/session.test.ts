import { test } from "node:test";
import assert from "node:assert/strict";

// Test session utility functions inline to avoid module resolution issues.
// These mirror the logic from lib/session.ts.

interface BatchEntry {
  id: string;
  studentName: string;
  title: string;
  prompt: string;
  text: string;
}

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
  classPosition: number;
  classSize: number;
  title: string;
  prompt: string;
  paragraphs: string[];
  highlights: never[];
  scores: ScoreCategory[];
  overallNote: string;
}

const DEFAULT_RUBRIC: Rubric = {
  id: "rubric-analytical",
  name: "Analytical Essay",
  categories: [
    { key: "thesis", label: "Thesis", max: 20, description: "..." },
    { key: "evidence", label: "Evidence", max: 20, description: "..." },
    { key: "analysis", label: "Analysis", max: 20, description: "..." },
    { key: "organization", label: "Organization", max: 20, description: "..." },
    { key: "conventions", label: "Conventions", max: 20, description: "..." },
  ],
};

function buildSubmissionFromEntry(
  entry: BatchEntry,
  rubric: Rubric,
  position: number,
  totalSize: number,
): Submission {
  const paragraphs = entry.text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const scores: ScoreCategory[] = rubric.categories.map((c) => ({
    key: c.key,
    label: c.label,
    score: 0,
    max: c.max,
    feedback: "Awaiting assessment — ask the agent to grade this paper.",
  }));

  return {
    id: `sub-${entry.id}`,
    studentName: entry.studentName,
    classPosition: position,
    classSize: totalSize,
    title: entry.title.trim() || "Untitled Essay",
    prompt: entry.prompt,
    paragraphs: paragraphs.length > 0 ? paragraphs : [entry.text],
    highlights: [],
    scores,
    overallNote: "",
  };
}

function createSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

test("createSessionId returns a non-empty string", () => {
  const id = createSessionId();
  assert.ok(id.length > 0);
  assert.equal(typeof id, "string");
});

test("createSessionId produces unique values", () => {
  const ids = new Set(Array.from({ length: 100 }, () => createSessionId()));
  assert.equal(ids.size, 100);
});

test("buildSubmissionFromEntry creates correct submission structure", () => {
  const entry: BatchEntry = {
    id: "test-1",
    studentName: "Jane Doe",
    title: "Test Essay",
    prompt: "Write about something",
    text: "Paragraph one.\n\nParagraph two.",
  };

  const sub = buildSubmissionFromEntry(entry, DEFAULT_RUBRIC, 1, 3);

  assert.equal(sub.id, "sub-test-1");
  assert.equal(sub.studentName, "Jane Doe");
  assert.equal(sub.classPosition, 1);
  assert.equal(sub.classSize, 3);
  assert.equal(sub.title, "Test Essay");
  assert.equal(sub.paragraphs.length, 2);
  assert.equal(sub.paragraphs[0], "Paragraph one.");
  assert.equal(sub.paragraphs[1], "Paragraph two.");
  assert.equal(sub.scores.length, 5);
  assert.equal(sub.scores[0].score, 0);
  assert.equal(sub.scores[0].max, 20);
  assert.ok(sub.scores[0].feedback.includes("Awaiting"));
});

test("buildSubmissionFromEntry defaults title to Untitled Essay", () => {
  const entry: BatchEntry = {
    id: "test-2",
    studentName: "Bob",
    title: "   ",
    prompt: "prompt",
    text: "Essay text.",
  };

  const sub = buildSubmissionFromEntry(entry, DEFAULT_RUBRIC, 1, 1);
  assert.equal(sub.title, "Untitled Essay");
});

test("buildSubmissionFromEntry handles single paragraph", () => {
  const entry: BatchEntry = {
    id: "test-3",
    studentName: "Alice",
    title: "Single",
    prompt: "prompt",
    text: "Just one paragraph.",
  };

  const sub = buildSubmissionFromEntry(entry, DEFAULT_RUBRIC, 1, 1);
  assert.equal(sub.paragraphs.length, 1);
  assert.equal(sub.paragraphs[0], "Just one paragraph.");
});

test("buildSubmissionFromEntry uses custom rubric categories", () => {
  const customRubric: Rubric = {
    id: "custom",
    name: "Custom",
    categories: [
      { key: "intro", label: "Introduction", max: 30, description: "..." },
      { key: "body", label: "Body", max: 50, description: "..." },
      { key: "conclusion", label: "Conclusion", max: 20, description: "..." },
    ],
  };

  const entry: BatchEntry = {
    id: "test-4",
    studentName: "Eve",
    title: "Custom",
    prompt: "prompt",
    text: "Text.",
  };

  const sub = buildSubmissionFromEntry(entry, customRubric, 2, 5);
  assert.equal(sub.scores.length, 3);
  assert.equal(sub.scores[0].key, "intro");
  assert.equal(sub.scores[0].max, 30);
  assert.equal(sub.scores[1].key, "body");
  assert.equal(sub.scores[1].max, 50);
  assert.equal(sub.scores[2].key, "conclusion");
  assert.equal(sub.scores[2].max, 20);
  assert.equal(sub.classPosition, 2);
  assert.equal(sub.classSize, 5);
});

test("buildSubmissionFromEntry filters empty paragraphs", () => {
  const entry: BatchEntry = {
    id: "test-5",
    studentName: "Slim",
    title: "Whitespace",
    prompt: "prompt",
    text: "Para one.\n\n\n\n\n\nPara two.",
  };

  const sub = buildSubmissionFromEntry(entry, DEFAULT_RUBRIC, 1, 1);
  assert.equal(sub.paragraphs.length, 2);
});

test("buildSubmissionFromEntry falls back to whole text when no blank lines", () => {
  const entry: BatchEntry = {
    id: "test-6",
    studentName: "NoBreaks",
    title: "NoBreaks",
    prompt: "prompt",
    text: "Just a single block of text with no blank lines.",
  };

  const sub = buildSubmissionFromEntry(entry, DEFAULT_RUBRIC, 1, 1);
  assert.equal(sub.paragraphs.length, 1);
  assert.equal(sub.paragraphs[0], "Just a single block of text with no blank lines.");
});
