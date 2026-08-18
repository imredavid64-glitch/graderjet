"use client";

import { useCallback, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { clamp, kindFromReason, normalizeCategory } from "@/lib/grading";
import type { ActivityEntry, Highlight, Submission } from "@/lib/types";

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useGradingWorkspace(initialSubmissions: Submission[] = []) {
  const [submissions, setSubmissions] =
    useState<Submission[]>(initialSubmissions);
  const [currentId, setCurrentId] = useState<string>(
    initialSubmissions[0]?.id ?? "",
  );
  const [batchCurve, setBatchCurve] = useState(0);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  // Keep the current student id readable from inside the (long-lived) chat
  // tool-call callback without stale closures.
  const currentIdRef = useRef(currentId);
  currentIdRef.current = currentId;

  const current = submissions.find((s) => s.id === currentId) ?? submissions[0];

  const logActivity = useCallback(
    (entry: Omit<ActivityEntry, "id" | "at">) => {
      setActivity((prev) =>
        [{ id: uid("act"), at: new Date(), ...entry }, ...prev].slice(0, 50),
      );
    },
    [],
  );

  const updateScore = useCallback(
    (subId: string, category: string, newScore: number, reasoning: string) => {
      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.id !== subId) return s;
          const key = normalizeCategory(category);
          const idx = s.scores.findIndex((c) => c.key === key);
          if (idx === -1) return s;
          return {
            ...s,
            scores: s.scores.map((c, i) =>
              i === idx ? { ...c, score: clamp(newScore, 0, c.max) } : c,
            ),
          };
        }),
      );
      logActivity({
        kind: "score",
        title: `Score updated · ${category}`,
        detail: reasoning,
      });
    },
    [logActivity],
  );

  const addHighlight = useCallback(
    (
      subId: string,
      startLine: number,
      endLine: number,
      reason: string,
      suggestion?: string,
    ) => {
      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.id !== subId) return s;
          const highlight: Highlight = {
            id: uid("hl"),
            startLine,
            endLine,
            kind: kindFromReason(reason),
            reason,
            suggestion,
          };
          return { ...s, highlights: [...s.highlights, highlight] };
        }),
      );
      logActivity({
        kind: "highlight",
        title: `Highlight · ¶${startLine + 1}${
          endLine !== startLine ? `–${endLine + 1}` : ""
        }`,
        detail: `${reason}${suggestion ? ` — ${suggestion}` : ""}`,
      });
    },
    [logActivity],
  );

  const applyCurve = useCallback(
    (points: number, reason: string) => {
      setBatchCurve((prev) => prev + points);
      logActivity({
        kind: "curve",
        title: `Batch curve ${points >= 0 ? "+" : ""}${points}`,
        detail: reason,
      });
    },
    [logActivity],
  );

  const { messages, sendMessage, addToolOutput, status, error, stop } =
    useChat({
      transport: new DefaultChatTransport({ api: "/api/chat" }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      async onToolCall({ toolCall }) {
        if (toolCall.dynamic) return;
        const subId = currentIdRef.current;

        switch (toolCall.toolName) {
          case "update_scores": {
            const input = toolCall.input as {
              category: string;
              new_score: number;
              reasoning: string;
            };
            updateScore(subId, input.category, input.new_score, input.reasoning);
            addToolOutput({
              tool: "update_scores",
              toolCallId: toolCall.toolCallId,
              output: { ok: true, category: input.category },
            });
            break;
          }
          case "highlight_passage": {
            const input = toolCall.input as {
              start_line: number;
              end_line: number;
              reason: string;
              suggestion?: string;
            };
            addHighlight(
              subId,
              input.start_line,
              input.end_line,
              input.reason,
              input.suggestion,
            );
            addToolOutput({
              tool: "highlight_passage",
              toolCallId: toolCall.toolCallId,
              output: { ok: true },
            });
            break;
          }
          case "apply_batch_curve": {
            const input = toolCall.input as { points: number; reason: string };
            applyCurve(input.points, input.reason);
            addToolOutput({
              tool: "apply_batch_curve",
              toolCallId: toolCall.toolCallId,
              output: { ok: true, points: input.points },
            });
            break;
          }
        }
      },
    });

  return {
    submissions,
    current,
    currentId,
    setCurrentId,
    batchCurve,
    activity,
    chat: { messages, sendMessage, status, error, stop },
    updateScore,
    addHighlight,
    applyCurve,
  };
}
