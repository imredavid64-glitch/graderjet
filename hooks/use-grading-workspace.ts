"use client";

import { useCallback, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { clamp, kindFromReason, normalizeCategory } from "@/lib/grading";
import type { ActivityEntry, Highlight, RubricCategory, Submission, TeacherNote } from "@/lib/types";

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Snapshot of mutable state that can be pushed onto the undo/redo stack. */
interface StateSnapshot {
  submissions: Submission[];
  batchCurve: number;
}

const MAX_HISTORY = 50;

export function useGradingWorkspace(
  initialSubmissions: Submission[] = [],
  rubricCategories?: RubricCategory[],
  initialMessages?: UIMessage[],
) {
  const [submissions, setSubmissions] =
    useState<Submission[]>(initialSubmissions);
  const [currentId, setCurrentId] = useState<string>(
    initialSubmissions[0]?.id ?? "",
  );
  const [batchCurve, setBatchCurve] = useState(0);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  // Undo / redo stacks. We use state (not refs) for stack-length tracking
  // so canUndo / canRedo trigger re-renders when the stacks change.
  const undoStackRef = useRef<StateSnapshot[]>([]);
  const redoStackRef = useRef<StateSnapshot[]>([]);
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);

  // Keep the current student id readable from inside the (long-lived) chat
  // tool-call callback without stale closures.
  const currentIdRef = useRef(currentId);
  currentIdRef.current = currentId;

  const current = submissions.find((s) => s.id === currentId) ?? submissions[0];

  // ---- undo / redo helpers ----

  /** Push current state onto the undo stack (clears redo). */
  const pushUndo = useCallback(
    (subs: Submission[], curve: number) => {
      undoStackRef.current.push({
        submissions: subs,
        batchCurve: curve,
      });
      if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
      redoStackRef.current = [];
      setUndoLen(undoStackRef.current.length);
      setRedoLen(0);
    },
    [],
  );

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    // Save current state onto redo stack.
    redoStackRef.current.push({
      submissions: submissions,
      batchCurve: batchCurve,
    });
    setSubmissions(prev.submissions);
    setBatchCurve(prev.batchCurve);
    setUndoLen(undoStackRef.current.length);
    setRedoLen(redoStackRef.current.length);
    setActivity((a) =>
      [
        { id: uid("act"), at: new Date(), kind: "score" as const, title: "Undo", detail: "Reverted last change" },
        ...a,
      ].slice(0, 50),
    );
  }, [submissions, batchCurve]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push({
      submissions: submissions,
      batchCurve: batchCurve,
    });
    setSubmissions(next.submissions);
    setBatchCurve(next.batchCurve);
    setUndoLen(undoStackRef.current.length);
    setRedoLen(redoStackRef.current.length);
    setActivity((a) =>
      [
        { id: uid("act"), at: new Date(), kind: "score" as const, title: "Redo", detail: "Reapplied last change" },
        ...a,
      ].slice(0, 50),
    );
  }, [submissions, batchCurve]);

  const canUndo = undoLen > 0;
  const canRedo = redoLen > 0;

  // ---- logging ----

  const logActivity = useCallback(
    (entry: Omit<ActivityEntry, "id" | "at">) => {
      setActivity((prev) =>
        [{ id: uid("act"), at: new Date(), ...entry }, ...prev].slice(0, 50),
      );
    },
    [],
  );

  // ---- mutations (each pushes undo snapshot) ----

  const updateScore = useCallback(
    (subId: string, category: string, newScore: number, reasoning: string) => {
      setSubmissions((prev) => {
        pushUndo(prev, batchCurve);
        return prev.map((s) => {
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
        });
      });
      logActivity({
        kind: "score",
        title: `Score updated · ${category}`,
        detail: reasoning,
      });
    },
    [batchCurve, logActivity, pushUndo],
  );

  const addHighlight = useCallback(
    (
      subId: string,
      startLine: number,
      endLine: number,
      reason: string,
      suggestion?: string,
    ) => {
      setSubmissions((prev) => {
        pushUndo(prev, batchCurve);
        return prev.map((s) => {
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
        });
      });
      logActivity({
        kind: "highlight",
        title: `Highlight · ¶${startLine + 1}${
          endLine !== startLine ? `–${endLine + 1}` : ""
        }`,
        detail: `${reason}${suggestion ? ` — ${suggestion}` : ""}`,
      });
    },
    [batchCurve, logActivity, pushUndo],
  );

  const applyCurve = useCallback(
    (points: number, reason: string) => {
      pushUndo(submissions, batchCurve);
      setBatchCurve((prev) => prev + points);
      logActivity({
        kind: "curve",
        title: `Batch curve ${points >= 0 ? "+" : ""}${points}`,
        detail: reason,
      });
    },
    [submissions, batchCurve, logActivity, pushUndo],
  );

  // ---- chat ----

  const { messages, sendMessage, addToolOutput, status, error, stop } =
    useChat({
      initialMessages,
      transport: new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ rubricCategories: rubricCategories ?? undefined }),
      }),
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

  // ---- teacher notes ----

  const addTeacherNote = useCallback(
    (subId: string, kind: "paragraph" | "category", targetId: string, text: string) => {
      if (!text.trim()) return;
      setSubmissions((prev) => {
        pushUndo(prev, batchCurve);
        return prev.map((s) => {
          if (s.id !== subId) return s;
          const note: TeacherNote = {
            id: uid("note"),
            kind,
            targetId,
            text: text.trim(),
            createdAt: Date.now(),
          };
          return { ...s, teacherNotes: [...s.teacherNotes, note] };
        });
      });
      logActivity({
        kind: "score",
        title: `Note added · ${kind === "paragraph" ? `¶${Number(targetId) + 1}` : targetId}`,
        detail: text.trim(),
      });
    },
    [batchCurve, logActivity, pushUndo],
  );

  const removeTeacherNote = useCallback(
    (subId: string, noteId: string) => {
      setSubmissions((prev) => {
        pushUndo(prev, batchCurve);
        return prev.map((s) => {
          if (s.id !== subId) return s;
          return { ...s, teacherNotes: s.teacherNotes.filter((n) => n.id !== noteId) };
        });
      });
    },
    [batchCurve, pushUndo],
  );

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
    addTeacherNote,
    removeTeacherNote,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
