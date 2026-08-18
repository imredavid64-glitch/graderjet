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

// All UIMessage part types the AI SDK client can send (ai@7 UIMessagePart),
// including "step-start" boundaries that appear on resubmitted messages after
// a tool round. Dynamic data parts use a "data-<name>" prefix, matched below.
const PART_TYPES = new Set([
  "text",
  "reasoning",
  "file",
  "image",
  "custom",
  "source-url",
  "source-document",
  "reasoning-file",
  "step-start",
  "tool-input",
  "tool-output",
  "dynamic-tool",
]);

function isSupportedPartType(type: string): boolean {
  return (
    PART_TYPES.has(type) ||
    type.startsWith("data-") ||
    // Tool parts are typed `tool-<toolName>` by the AI SDK (e.g.
    // "tool-update_scores"), with input/output distinguished by state.
    type.startsWith("tool-")
  );
}

export type ChatMessagesResult =
  | { ok: true; messages: UIMessage[] }
  | { ok: false; error: string };

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
        error: `messages[${i}].role must be one of: ${Array.from(ROLES).join(", ")}.`,
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
      if (!isSupportedPartType(p.type)) {
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
      // Tool parts always carry a toolCallId; input/output fields are
      // state-dependent (input-available vs output-available), so only the id
      // is required here.
      if (p.type.startsWith("tool-") && typeof p.toolCallId !== "string") {
        return {
          ok: false,
          error:
            `messages[${i}].parts[${j}] (${p.type}) requires a string "toolCallId".`,
        };
      }
    }
  }

  return { ok: true, messages: messages as UIMessage[] };
}
