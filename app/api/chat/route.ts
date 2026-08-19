import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { checkApiKey, resolveApiKeyProvider } from "@/lib/agent/api-key";
import { parseChatMessages } from "@/lib/agent/chat-input";
import { gradingTools } from "@/lib/agent/tools";
import { buildMockScript, createMockModel } from "@/lib/agent/mock-model";
import { RUBRIC } from "@/lib/mock-data";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are the GraderJet grading agent — an expert writing instructor and
scoring assistant working alongside a human teacher in a human-in-the-loop workspace.

The teacher grades papers with you. You provide an initial assessment, then the teacher can
interrogate your reasoning, request score changes, and adjust feedback interactively.

Available rubric categories:
${RUBRIC.categories
  .map((c) => `- ${c.label} (0–${c.max}): ${c.description}`)
  .join("\n")}

Use your tools to make the workspace reflect decisions in real time:
- update_scores: change a rubric category score on the live scorecard.
- highlight_passage: flag a passage in the student document.
- apply_batch_curve: shift the grading scale for the whole batch.

Be concise, specific, and cite the passage or criterion behind every deduction. When you change
state, briefly explain the reasoning so the teacher can audit your judgment.`;

export async function POST(req: Request) {
  // Validate the request body up front: the client sends AI SDK UI-messages
  // ({ id, role, parts }), and convertToModelMessages crashes with a cryptic
  // TypeError on any other shape (e.g. OpenAI chat-completions { content }),
  // so reject malformed payloads with a clear 400 instead of a 500.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const parsed = parseChatMessages(body);
  if (!parsed.ok) {
    return new Response(`Bad request: ${parsed.error}`, {
      status: 400,
      headers: { "content-type": "text/plain" },
    });
  }
  const { messages } = parsed;

  // The client may send custom rubric categories in the body.
  const bodyData = body as Record<string, unknown> | null;
  const rubricCategories = bodyData?.rubricCategories as
    | { key: string; label: string; max: number; description: string }[]
    | undefined;

  // Build the system prompt, using custom rubric categories if provided.
  const categories = rubricCategories ?? RUBRIC.categories;
  const systemPrompt = `You are the GraderJet grading agent — an expert writing instructor and
scoring assistant working alongside a human teacher in a human-in-the-loop workspace.

The teacher grades papers with you. You provide an initial assessment, then the teacher can
interrogate your reasoning, request score changes, and adjust feedback interactively.

Available rubric categories:
${categories
  .map((c) => `- ${c.label} (0–${c.max}): ${c.description}`)
  .join("\n")}

Use your tools to make the workspace reflect decisions in real time:
- update_scores: change a rubric category score on the live scorecard.
- highlight_passage: flag a passage in the student document.
- apply_batch_curve: shift the grading scale for the whole batch.

Be concise, specific, and cite the passage or criterion behind every deduction. When you change
state, briefly explain the reasoning so the teacher can audit your judgment.`;

  // The mock agent is used ONLY when no API key is configured. If a key is
  // present it must be valid: fail loudly with a clear message instead of a
  // cryptic mid-stream 401 (or silently serving the mock while configured for
  // a real model).
  const { provider, apiKey } = resolveApiKeyProvider();

  let model;
  if (provider === "mock") {
    model = createMockModel(buildMockScript(messages));
  } else {
    const check = await checkApiKey(provider, apiKey as string);
    if (!check.ok) {
      console.error("[graderjet] " + check.message);
      return new Response(check.message, {
        status: check.status === 0 ? 502 : 500,
        headers: { "content-type": "text/plain" },
      });
    }
    model =
      provider === "openrouter"
        ? openrouter(process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini")
        : openai("gpt-4o-mini");
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: gradingTools,
    // Cap output tokens: grading replies are short, and a hard cap also keeps
    // per-request cost bounded (some accounts run on small credit balances).
    maxOutputTokens: 1024,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
