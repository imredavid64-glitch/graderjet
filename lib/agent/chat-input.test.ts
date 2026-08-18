import { test } from "node:test";
import assert from "node:assert/strict";
import { parseChatMessages } from "./chat-input.ts";

test("accepts a valid UI-message payload (as sent by useChat)", () => {
  const r = parseChatMessages({
    messages: [
      {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "Raise Thesis to 20 and explain why." }],
      },
      {
        id: "m2",
        role: "assistant",
        parts: [
          { type: "text", text: "Done." },
          {
            type: "tool-update_scores",
            toolCallId: "call_1",
            state: "input-available",
            input: { category: "Thesis", new_score: 20, reasoning: "Good thesis." },
          },
        ],
      },
      {
        id: "m3",
        role: "user",
        parts: [
          {
            type: "tool-update_scores",
            toolCallId: "call_1",
            state: "output-available",
            output: { ok: true },
          },
        ],
      },
    ],
  });
  assert.ok(r.ok);
  assert.ok(Array.isArray(r.messages));
});

test("rejects OpenAI chat-completions shape (content instead of parts)", () => {
  const r = parseChatMessages({
    messages: [{ role: "user", content: "grade this" }],
  });
  assert.ok(!r.ok);
  assert.match(r.error ?? "", /parts/);
});

test("rejects a missing messages array", () => {
  const r = parseChatMessages({ foo: 1 });
  assert.ok(!r.ok);
  assert.match(r.error ?? "", /messages/);
});

test("rejects a non-object body (e.g. invalid JSON -> null)", () => {
  assert.ok(!parseChatMessages(null).ok);
  assert.ok(!parseChatMessages("nope").ok);
  assert.ok(!parseChatMessages(undefined).ok);
});

test("rejects an empty messages array", () => {
  const r = parseChatMessages({ messages: [] });
  assert.ok(!r.ok);
});

test("rejects a message with an unknown role", () => {
  const r = parseChatMessages({
    messages: [{ id: "m1", role: "bot", parts: [{ type: "text", text: "hi" }] }],
  });
  assert.ok(!r.ok);
  assert.match(r.error ?? "", /role/);
});

test("rejects a message with a malformed part", () => {
  const r = parseChatMessages({
    messages: [{ id: "m1", role: "user", parts: [{ type: "text" }] }],
  });
  assert.ok(!r.ok);
  assert.match(r.error ?? "", /\.text/);
});

test("rejects a tool part missing its toolCallId", () => {
  const r = parseChatMessages({
    messages: [
      {
        id: "m1",
        role: "assistant",
        parts: [{ type: "tool-update_scores", input: { category: "Thesis" } }],
      },
    ],
  });
  assert.ok(!r.ok);
  assert.match(r.error ?? "", /toolCallId/);
});

test("accepts a resubmitted message with step-start parts (post tool round)", () => {
  // The AI SDK client re-submits the conversation after executing tool calls,
  // and those messages include "step-start" boundary parts. Rejecting them
  // broke the agent's acknowledgment round — this is the regression guard.
  const r = parseChatMessages({
    messages: [
      { id: "m1", role: "user", parts: [{ type: "text", text: "Raise Thesis to 20." }] },
      {
        id: "m2",
        role: "assistant",
        parts: [
          { type: "step-start" },
          { type: "text", text: "Applying now…" },
          {
            type: "tool-update_scores",
            toolCallId: "call-1",
            state: "input-available",
            input: { category: "Thesis", new_score: 20, reasoning: "Good thesis." },
          },
        ],
      },
      {
        id: "m3",
        role: "user",
        parts: [
          { type: "step-start" },
          {
            type: "tool-update_scores",
            toolCallId: "call-1",
            state: "output-available",
            output: { ok: true },
          },
        ],
      },
    ],
  });
  assert.ok(r.ok);
});

test("accepts data-* dynamic part types", () => {
  const r = parseChatMessages({
    messages: [
      { id: "m1", role: "user", parts: [{ type: "data-example", data: {} }] },
    ],
  });
  assert.ok(r.ok);
});

test("rejects an unsupported part type", () => {
  const r = parseChatMessages({
    messages: [
      { id: "m1", role: "user", parts: [{ type: "mystery", text: "hi" }] },
    ],
  });
  assert.ok(!r.ok);
  assert.match(r.error ?? "", /not supported/);
});
