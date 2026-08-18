import type { UIMessage } from "ai";

/**
 * Validation for the chat route's request body.
 *
 * The app client (useChat from @ai-sdk/react) sends messages in the AI SDK
 * "UI-message" format: an array of { id, role, parts: [...] } objects. A raw
 * OpenAI chat-completions payload ({ role, content }) is NOT valid here —
 * convertToModelMessages reads `message.parts` and would throw a cryptic
 * `Cannot read properties of undefined (reading 'map')` on it. Validate the
 * shape up front so the route answers a clear 400 instead of a 500.
 */

const ROLES = new Set(["system", "user", "assistant", "data"]);
const PART_TYPES = new Set([
  "text",
  "tool-input",
  "tool-output",
  "reasoning",
  "file",
  "image",
]);

export interface ChatMessagesResult {
  ok: boolean;
  messages?: UIMessage[];
  error?: string;
}

export function parseChatMessages(body: unknown): ChatMessagesResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const { messages } = body as { messages?: unknown };
  if (!Array.isArray(messages)) {
    return {
      ok: false,
      error:
        'Request body must include a "messages" array. Expected UI-message format ' +
        '({ id, role, parts: [...] }) as sent by the chat client, not OpenAI ' +
        'chat-completions format ({ role, content }).',
    };
  }
  if (messages.length === 0) {
    return { ok: false, error: '"messages" must not be empty.' };
  }

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (typeof m !== "object" || m === null) {
      return { ok: false, error: `messages[${i}] must be an object.` };
    }

    const role = (m as { role?: unknown }).role;
    if (typeof role !== "string" || !ROLES.has(role)) {
      return {
        ok: false,
        error: `messages[${i}].role must be one of: ${[...ROLES].join(", ")}.`,
      };
    }

    const parts = (m as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) {
      return {
        ok: false,
        error:
          `messages[${i}].parts must be an array (UI-message format: ` +
          '{ id, role, parts: [...] }). A payload with "content" instead of ' +
          '"parts" is OpenAI chat-completions format and is not supported.',
      };
    }

    for (let j = 0; j < parts.length; j++) {
      const p = parts[j];
      if (typeof p !== "object" || p === null || typeof p.type !== "string") {
        return {
          ok: false,
          error: `messages[${i}].parts[${j}] must be an object with a string "type".`,
        };
      }
      if (!PART_TYPES.has(p.type)) {
        return {
          ok: false,
          error: `messages[${i}].parts[${j}].type "${p.type}" is not supported.`,
        };
      }
      if (p.type === "text" && typeof p.text !== "string") {
        return {
          ok: false,
          error: `messages[${i}].parts[${j}].text must be a string.`,
        };
      }
      if (
        p.type === "tool-input" &&
        (typeof p.toolCallId !== "string" ||
          typeof p.input !== "object" ||
          p.input === null)
      ) {
        return {
          ok: false,
          error:
            `messages[${i}].parts[${j}] (tool-input) requires a string ` +
            '"toolCallId" and an object "input".',
        };
      }
      if (
        p.type === "tool-output" &&
        (typeof p.toolCallId !== "string" || !("output" in p))
      ) {
        return {
          ok: false,
          error:
            `messages[${i}].parts[${j}] (tool-output) requires a string ` +
            '"toolCallId" and an "output" field.',
        };
      }
    }
  }

  return { ok: true, messages: messages as UIMessage[] };
}
