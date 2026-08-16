import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
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
  const { messages }: { messages: UIMessage[] } = await req.json();

  // With an API key, grade with a real model. Without one, run the fully
  // offline mock agent so the app still works out of the box.
  const model = process.env.OPENAI_API_KEY
    ? openai("gpt-4o-mini")
    : createMockModel(buildMockScript(messages));

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: gradingTools,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
