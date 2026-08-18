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
            type: "tool-input",
            toolCallId: "call_1",
            input: { category: "Thesis", new_score: 20, reasoning: "Good thesis." },
          },
        ],
      },
      {
        id: "m3",
        role: "user",
        parts: [
          {
            type: "tool-output",
            toolCallId: "call_1",
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

test("rejects a tool-input part missing its input object", () => {
  const r = parseChatMessages({
    messages: [
      {
        id: "m1",
        role: "assistant",
        parts: [{ type: "tool-input", toolCallId: "c1" }],
      },
    ],
  });
  assert.ok(!r.ok);
  assert.match(r.error ?? "", /tool-input/);
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
