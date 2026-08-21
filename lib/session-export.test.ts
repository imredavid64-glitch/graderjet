import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeSessionExport, parseSessionExport } from "./session-export.ts";
import { RUBRIC } from "./mock-data.ts";
import type { HighlightKind } from "./types.ts";

const SESSION = {
  id: "abc123",
  studentName: "Maya Chen",
  title: "The Role of Setting",
  prompt: "Analyze how setting shapes character.",
  text: "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
  rubricId: RUBRIC.id,
  createdAt: 1755700000000,
};

const WORKSPACE = {
  submissions: [
    {
      id: "sub-abc123",
      studentName: "Maya Chen",
      classPosition: 1,
      classSize: 1,
      title: "The Role of Setting",
      prompt: "Analyze how setting shapes character.",
      paragraphs: ["First paragraph.", "Second paragraph.", "Third paragraph."],
      highlights: [
        { id: "hl-1", startLine: 0, endLine: 0, kind: "weak-thesis" as HighlightKind, reason: "Unclear claim" },
      ],
      scores: RUBRIC.categories.map((c) => ({
        key: c.key,
        label: c.label,
        score: 5,
        max: c.max,
        feedback: "Solid.",
      })),
      overallNote: "",
      teacherNotes: [
        { id: "note-1", kind: "paragraph", targetId: "1", text: "Nice imagery.", createdAt: 1755700000000 },
      ],
    },
  ],
  batchCurve: 3,
  messages: [
    { id: "m1", role: "user", parts: [{ type: "text", text: "Grade this" }] },
  ],
};

test("serializeSessionExport produces a parseable round-trip", () => {
  const json = serializeSessionExport(SESSION, WORKSPACE);
  const parsed = JSON.parse(json);
  assert.equal(parsed.app, "GraderJet");
  assert.equal(parsed.version, 1);
  assert.equal(parsed.session.studentName, "Maya Chen");
  assert.equal(parsed.workspace.batchCurve, 3);
  assert.equal(parsed.workspace.submissions.length, 1);
  assert.equal(parsed.workspace.messages.length, 1);
});

test("parseSessionExport accepts a valid file and restores session + workspace", () => {
  const json = serializeSessionExport(SESSION, WORKSPACE);
  const result = parseSessionExport(json);
  assert.ok(result.ok, "expected ok");
  if (!result.ok || !result.data.workspace) return;
  assert.equal(result.data.session.id, "abc123");
  assert.equal(result.data.session.studentName, "Maya Chen");
  assert.equal(result.data.workspace.submissions[0].paragraphs.length, 3);
  assert.equal(result.data.workspace.batchCurve, 3);
  assert.equal(result.data.workspace.messages[0].role, "user");
});

test("parseSessionExport rejects non-GraderJet JSON", () => {
  const result = parseSessionExport(JSON.stringify({ app: "Other", data: {} }));
  assert.ok(!result.ok);
  if (result.ok) return;
  assert.match(result.error, /not a GraderJet/i);
});

test("parseSessionExport rejects malformed JSON", () => {
  const result = parseSessionExport("not json at all");
  assert.ok(!result.ok);
  if (result.ok) return;
  assert.match(result.error, /JSON/i);
});

test("parseSessionExport rejects a session missing required fields", () => {
  const json = JSON.stringify({
    app: "GraderJet",
    version: 1,
    session: { id: "x" },
  });
  const result = parseSessionExport(json);
  assert.ok(!result.ok);
  if (result.ok) return;
  assert.match(result.error, /studentName/i);
});

test("parseSessionExport accepts a session with no workspace (fresh setup)", () => {
  const json = JSON.stringify({
    app: "GraderJet",
    version: 1,
    session: SESSION,
  });
  const result = parseSessionExport(json);
  assert.ok(result.ok, "expected ok");
  if (!result.ok) return;
  assert.equal(result.data.workspace, undefined);
});

test("parseSessionExport rejects unsupported versions", () => {
  const json = JSON.stringify({
    app: "GraderJet",
    version: 99,
    session: SESSION,
  });
  const result = parseSessionExport(json);
  assert.ok(!result.ok);
  if (result.ok) return;
  assert.match(result.error, /version/i);
});