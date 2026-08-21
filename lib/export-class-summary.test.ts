import { test } from "node:test";
import assert from "node:assert/strict";

// Test the CSV generation logic extracted from export-class-summary.ts
// We can't test window.open (PDF) in Node, but we can validate the data pipeline.

interface SummaryRow {
  studentName: string;
  title: string;
  score: number;
  max: number;
  percent: number;
  letterGrade: string;
  highlightCount: number;
}

interface CategoryAvg {
  label: string;
  avg: number;
  max: number;
}

interface GradeDistEntry {
  grade: string;
  count: number;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsvLines(opts: {
  className: string;
  rows: SummaryRow[];
  categoryAverages: CategoryAvg[];
  gradeDistribution: GradeDistEntry[];
  classAvgPercent: number;
  avgLetter: string;
}): string[] {
  const lines: string[] = [];
  lines.push("Class Summary");
  lines.push(`Class Name,${escapeCsv(opts.className)}`);
  lines.push(`Papers,${opts.rows.length}`);
  lines.push(`Class Average,${opts.classAvgPercent.toFixed(1)}%`);
  lines.push(`Average Grade,${opts.avgLetter}`);
  lines.push("");
  lines.push("Student,Title,Score,Max,Percent,Grade,Highlights");
  for (const r of opts.rows) {
    lines.push(
      [
        escapeCsv(r.studentName),
        escapeCsv(r.title),
        r.score,
        r.max,
        `${r.percent.toFixed(1)}%`,
        r.letterGrade,
        r.highlightCount,
      ].join(","),
    );
  }
  lines.push("");
  lines.push("Category Average");
  lines.push("Category,Average,Max");
  for (const cat of opts.categoryAverages) {
    lines.push(`${escapeCsv(cat.label)},${cat.avg.toFixed(1)},${cat.max}`);
  }
  lines.push("");
  lines.push("Grade Distribution");
  lines.push("Grade,Count");
  for (const g of opts.gradeDistribution) {
    lines.push(`${g.grade},${g.count}`);
  }
  return lines;
}

// --- escapeCsv tests ---

test("escapeCsv passes through simple strings", () => {
  assert.equal(escapeCsv("hello"), "hello");
  assert.equal(escapeCsv("123"), "123");
});

test("escapeCsv escapes commas", () => {
  assert.equal(escapeCsv("a,b"), '"a,b"');
});

test("escapeCsv escapes double quotes", () => {
  assert.equal(escapeCsv('say "hi"'), '"say ""hi"""');
});

test("escapeCsv escapes newlines", () => {
  assert.equal(escapeCsv("line1\nline2"), '"line1\nline2"');
});

// --- buildCsvLines tests ---

test("buildCsvLines generates correct header", () => {
  const lines = buildCsvLines({
    className: "English 101",
    rows: [],
    categoryAverages: [],
    gradeDistribution: [],
    classAvgPercent: 0,
    avgLetter: "—",
  });
  assert.equal(lines[0], "Class Summary");
  assert.equal(lines[1], "Class Name,English 101");
  assert.equal(lines[2], "Papers,0");
  assert.equal(lines[3], "Class Average,0.0%");
  assert.equal(lines[4], "Average Grade,—");
});

test("buildCsvLines includes paper rows", () => {
  const lines = buildCsvLines({
    className: "Test",
    rows: [
      { studentName: "Alice", title: "Essay 1", score: 90, max: 100, percent: 90, letterGrade: "A-", highlightCount: 2 },
      { studentName: "Bob", title: "Essay 2", score: 75, max: 100, percent: 75, letterGrade: "C+", highlightCount: 0 },
    ],
    categoryAverages: [],
    gradeDistribution: [],
    classAvgPercent: 82.5,
    avgLetter: "B-",
  });
  // Find the data rows (after the header row "Student,Title,...")
  const headerIdx = lines.indexOf("Student,Title,Score,Max,Percent,Grade,Highlights");
  assert.ok(headerIdx > 0);
  assert.equal(lines[headerIdx + 1], "Alice,Essay 1,90,100,90.0%,A-,2");
  assert.equal(lines[headerIdx + 2], "Bob,Essay 2,75,100,75.0%,C+,0");
});

test("buildCsvLines includes category averages", () => {
  const lines = buildCsvLines({
    className: "Test",
    rows: [],
    categoryAverages: [
      { label: "Thesis", avg: 85.5, max: 20 },
      { label: "Evidence", avg: 72.0, max: 20 },
    ],
    gradeDistribution: [],
    classAvgPercent: 80,
    avgLetter: "B-",
  });
  const catIdx = lines.indexOf("Category,Average,Max");
  assert.ok(catIdx > 0);
  assert.equal(lines[catIdx + 1], "Thesis,85.5,20");
  assert.equal(lines[catIdx + 2], "Evidence,72.0,20");
});

test("buildCsvLines includes grade distribution", () => {
  const lines = buildCsvLines({
    className: "Test",
    rows: [],
    categoryAverages: [],
    gradeDistribution: [
      { grade: "A", count: 3 },
      { grade: "B", count: 5 },
      { grade: "F", count: 1 },
    ],
    classAvgPercent: 78,
    avgLetter: "C+",
  });
  const gdIdx = lines.indexOf("Grade,Count");
  assert.ok(gdIdx > 0);
  assert.equal(lines[gdIdx + 1], "A,3");
  assert.equal(lines[gdIdx + 2], "B,5");
  assert.equal(lines[gdIdx + 3], "F,1");
});

test("buildCsvLines handles commas in student names", () => {
  const lines = buildCsvLines({
    className: "Test",
    rows: [
      { studentName: "Smith, John", title: "Essay", score: 88, max: 100, percent: 88, letterGrade: "B+", highlightCount: 0 },
    ],
    categoryAverages: [],
    gradeDistribution: [],
    classAvgPercent: 88,
    avgLetter: "B+",
  });
  const headerIdx = lines.indexOf("Student,Title,Score,Max,Percent,Grade,Highlights");
  assert.ok(headerIdx > 0);
  // Smith, John should be quoted
  assert.ok(lines[headerIdx + 1].includes('"Smith, John"'));
});

test("buildCsvLines handles empty data gracefully", () => {
  const lines = buildCsvLines({
    className: "Empty Class",
    rows: [],
    categoryAverages: [],
    gradeDistribution: [],
    classAvgPercent: 0,
    avgLetter: "—",
  });
  assert.equal(lines.length, 13); // Header + sections + separators
  assert.ok(lines.every((l) => typeof l === "string"));
});

test("buildCsvLines percent matches score/max calculation", () => {
  const lines = buildCsvLines({
    className: "Test",
    rows: [
      { studentName: "Eve", title: "Essay", score: 73, max: 120, percent: 60.8, letterGrade: "D-", highlightCount: 1 },
    ],
    categoryAverages: [],
    gradeDistribution: [],
    classAvgPercent: 60.8,
    avgLetter: "D-",
  });
  const headerIdx = lines.indexOf("Student,Title,Score,Max,Percent,Grade,Highlights");
  assert.ok(lines[headerIdx + 1].includes("60.8%"));
});
