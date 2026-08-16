"use client";

import { useState } from "react";
import { FileText, Highlighter } from "lucide-react";
import type { Highlight, Submission } from "@/lib/types";
import { HIGHLIGHT_META } from "@/lib/grading";
import { cn } from "@/lib/utils";

function highlightsAt(
  highlights: Highlight[],
  line: number,
): Highlight[] {
  return highlights.filter((h) => line >= h.startLine && line <= h.endLine);
}

export function DocumentViewer({ submission }: { submission: Submission }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const kinds = Array.from(
    new Set(submission.highlights.map((h) => h.kind)),
  );

  return (
    <section className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
      {/* Header */}
      <div className="shrink-0 border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {submission.studentName}
              </span>
              <span>·</span>
              <span>Paper {submission.classPosition} of {submission.classSize}</span>
            </div>
            <h1 className="mt-1 truncate text-lg font-semibold leading-snug tracking-tight">
              {submission.title}
            </h1>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Prompt:</span>{" "}
          {submission.prompt}
        </p>
      </div>

      {/* Legend */}
      {kinds.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-5 py-2">
          <span className="mr-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Highlighter className="h-3 w-3" /> Flags
          </span>
          {kinds.map((kind) => {
            const meta = HIGHLIGHT_META[kind];
            return (
              <span
                key={kind}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium",
                  meta.chip,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                {meta.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-4">
          {submission.paragraphs.map((paragraph, i) => {
            const highlights = highlightsAt(submission.highlights, i);
            const primary = highlights[0];
            const meta = primary ? HIGHLIGHT_META[primary.kind] : null;

            return (
              <div key={i} className="group flex gap-3">
                <span className="select-none pt-0.5 text-right text-[11px] font-medium tabular-nums text-muted-foreground/70">
                  ¶{i + 1}
                </span>
                <div
                  className={cn(
                    "flex-1 rounded-lg border p-3 text-sm leading-relaxed transition-colors",
                    primary
                      ? cn(meta!.bg, meta!.border)
                      : "border-transparent",
                  )}
                >
                  <p className="text-foreground/90">{paragraph}</p>

                  {highlights.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {highlights.map((highlight) => {
                        const m = HIGHLIGHT_META[highlight.kind];
                        const open = !!expanded[highlight.id];
                        return (
                          <div key={highlight.id}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded((prev) => ({
                                  ...prev,
                                  [highlight.id]: !prev[highlight.id],
                                }))
                              }
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-background/40",
                                m.chip,
                              )}
                            >
                              <span
                                className={cn("h-1.5 w-1.5 rounded-full", m.dot)}
                              />
                              {highlight.reason}
                              {highlight.suggestion && (
                                <span className="opacity-70">· details</span>
                              )}
                            </button>

                            {open && highlight.suggestion && (
                              <div className="mt-1.5 rounded-md border bg-background/60 p-2.5 text-xs leading-relaxed text-foreground/80">
                                <span className="font-medium text-foreground">
                                  Suggestion:{" "}
                                </span>
                                {highlight.suggestion}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
