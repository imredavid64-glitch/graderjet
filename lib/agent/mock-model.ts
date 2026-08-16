import { simulateReadableStream, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";

/**
 * A fully offline "grading agent" built on the AI SDK's mock model primitive.
 * It streams a scripted reply and emits real tool-call chunks, so the exact
 * same client-side tool-calling pipeline (useChat + onToolCall) runs whether
 * or not an OPENAI_API_KEY is configured.
 */

function textParts(id: string, value: string): LanguageModelV4StreamPart[] {
  const words = value.match(/\S+\s*/g) ?? [value];
  const parts: LanguageModelV4StreamPart[] = [{ type: "text-start", id }];
  for (const word of words) parts.push({ type: "text-delta", id, delta: word });
  parts.push({ type: "text-end", id });
  return parts;
}

function toolCallPart(
  toolCallId: string,
  toolName: string,
  input: Record<string, unknown>,
): LanguageModelV4StreamPart {
  return {
    type: "tool-call",
    toolCallId,
    toolName,
    input: JSON.stringify(input),
  };
}

function finishPart(
  unified: "stop" | "tool-calls",
): LanguageModelV4StreamPart {
  return {
    type: "finish",
    finishReason: { unified, raw: undefined },
    usage: {
      inputTokens: {
        total: 132,
        noCache: 132,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: { total: 96, text: 96, reasoning: undefined },
    },
  };
}

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user") {
      return m.parts
        .filter((p) => p.type === "text")
        .map((p) => (p as { text: string }).text)
        .join(" ");
    }
  }
  return "";
}

function lastMessageHasToolOutput(messages: UIMessage[]): boolean {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant") return false;
  return last.parts.some((p) => {
    const part = p as { type?: string; state?: string };
    return (
      typeof part.type === "string" &&
      (part.type === "dynamic-tool" || part.type.startsWith("tool-")) &&
      (part.state === "output-available" || part.state === "output-error")
    );
  });
}

export function buildMockScript(messages: UIMessage[]): LanguageModelV4StreamPart[] {
  // The client already executed our tool calls and re-submitted: acknowledge
  // and finish without emitting more tools (prevents any loop).
  if (lastMessageHasToolOutput(messages)) {
    return [
      ...textParts(
        "t1",
        "The workspace is synced — the scorecard, highlights, and activity log all reflect " +
          "that change. Take a look and tell me if you'd like to push any category further, " +
          "flag another passage, or curve the batch.",
      ),
      finishPart("stop"),
    ];
  }

  const userText = lastUserText(messages).toLowerCase();

  if (userText.includes("curve")) {
    return [
      ...textParts(
        "t1",
        "Understood. A curve shifts the entire batch rather than a single paper, so I'll apply " +
          "a modest +2 across the class and record the rationale in the activity log. " +
          "Applying it now…",
      ),
      toolCallPart("call-1", "apply_batch_curve", {
        points: 2,
        reason: "Teacher requested a +2 curve to align the batch with the class average.",
      }),
      finishPart("tool-calls"),
    ];
  }

  if (userText.includes("thesis")) {
    return [
      ...textParts(
        "t1",
        "Re-reading the introduction, I agree the thesis deserves more credit than my first " +
          "pass gave it — the claim is arguable and it does preview the body, even if it's " +
          "lightly hedged. I'll raise Thesis and re-flag the opening so the feedback matches.",
      ),
      toolCallPart("call-1", "update_scores", {
        category: "Thesis",
        new_score: 20,
        reasoning: "Thesis is arguable and previews the argument; initial deduction was too harsh.",
      }),
      toolCallPart("call-2", "highlight_passage", {
        start_line: 0,
        end_line: 0,
        reason: "Thesis (revised)",
        suggestion: "Tighten the final sentence to state the stakes more directly.",
      }),
      finishPart("tool-calls"),
    ];
  }

  if (
    userText.includes("evidence") ||
    userText.includes("citat") ||
    userText.includes("uncited") ||
    userText.includes("source")
  ) {
    return [
      ...textParts(
        "t1",
        "The evidence deductions come from a couple of claims that are asserted without a " +
          "named source. I'll flag the strongest example in the document and nudge the " +
          "Evidence score to reflect a partial credit for the otherwise relevant support.",
      ),
      toolCallPart("call-1", "highlight_passage", {
        start_line: 1,
        end_line: 1,
        reason: "Uncited claim",
        suggestion: "Name the study or survey and include its year.",
      }),
      toolCallPart("call-2", "update_scores", {
        category: "Evidence",
        new_score: 15,
        reasoning: "Evidence is relevant but under-cited; awarded partial credit.",
      }),
      finishPart("tool-calls"),
    ];
  }

  if (
    userText.includes("highlight") ||
    userText.includes("show") ||
    userText.includes("where") ||
    userText.includes("why") ||
    userText.includes("explain")
  ) {
    return [
      ...textParts(
        "t1",
        "Sure — here's the passage behind that flag. I've highlighted it on the left so you " +
          "can weigh in directly. If you agree with the deduction, say the word and I'll keep " +
          "the score where it is.",
      ),
      toolCallPart("call-1", "highlight_passage", {
        start_line: 3,
        end_line: 3,
        reason: "Vague evidence",
        suggestion: "Ground the claim in a concrete example or source.",
      }),
      finishPart("tool-calls"),
    ];
  }

  // Fallback: a gentle, visible state change so any message demonstrates the
  // agentic sync (scorecard updates live).
  return [
    ...textParts(
      "t1",
      "Noted. Reviewing the current paper again, I think the analysis category is slightly " +
        "underscored — the writer interprets evidence rather than just summarizing it in " +
        "several places. I'll bump Analysis on the scorecard now.",
    ),
    toolCallPart("call-1", "update_scores", {
      category: "Analysis",
      new_score: 17,
      reasoning: "Interpretive depth warrants a small increase on second review.",
    }),
    finishPart("tool-calls"),
  ];
}

export function createMockModel(script: LanguageModelV4StreamPart[]) {
  return new MockLanguageModelV4({
    provider: "graderjet",
    modelId: "mock-grading-agent",
    doStream: async () => ({
      stream: simulateReadableStream({ chunks: script, chunkDelayInMs: 24 }),
    }),
  });
}
