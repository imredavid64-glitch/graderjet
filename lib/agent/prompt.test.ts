import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt } from "./prompt.ts";

test("buildSystemPrompt renders every rubric category with label, max, and description", () => {
  const prompt = buildSystemPrompt([
    { key: "thesis", label: "Thesis", max: 20, description: "A clear, arguable thesis." },
    { key: "mechanics", label: "Writing Mechanics", max: 10, description: "Grammar and punctuation." },
  ]);
  assert.match(prompt, /Thesis \(0–20\): A clear, arguable thesis\./);
  assert.match(prompt, /Writing Mechanics \(0–10\): Grammar and punctuation\./);
});

test("buildSystemPrompt defaults to the stock rubric", () => {
  const prompt = buildSystemPrompt();
  assert.match(prompt, /Thesis \(0–20\)/);
  assert.match(prompt, /update_scores/);
});