"use client";

import { useState } from "react";
import { FileText, Highlighter, MessageSquarePlus, X } from "lucide-react";
import type { Highlight, Submission, TeacherNote } from "@/lib/types";
import { HIGHLIGHT_META } from "@/lib/grading";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function highlightsAt(highlights: Highlight[], line: number): Highlight[] {
  return highlights.filter((h) => line >= h.startLine && line <= h.endLine);
}

function notesForParagraph(
  notes: TeacherNote[],
  paragraphIndex: number,
): TeacherNote[] {
  return notes.filter(
    (n) => n.kind === "paragraph" && n.targetId === String(paragraphIndex),
  );
}

interface DocumentViewerProps {
  submission: Submission;
  onAddTeacherNote?: (
    subId: string,
    kind: "paragraph" | "category",
    targetId: string,
    text: string,
  ) => void;
  onRemoveTeacherNote?: (subId: string, noteId: string) => void;
}

export function DocumentViewer({
  submission,
  onAddTeacherNote,
  onRemoveTeacherNote,
}: DocumentViewerProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");

  const kinds = Array.from(
    new Set(submission.highlights.map((h) => h.kind)),
  );

  const submitNote = (paragraphIndex: number) => {
    if (!noteText.trim() || !onAddTeacherNote) return;
    onAddTeacherNote(submission.id, "paragraph", String(paragraphIndex), noteText);
    setNoteText("");
    setEditingNote(null);
  };

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
              <span>
                Paper {submission.classPosition} of {submission.classSize}
              </span>
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
            const paraNotes = notesForParagraph(submission.teacherNotes, i);

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

                  {/* Highlight chips */}
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
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  m.dot,
                                )}
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

                  {/* Teacher notes */}
                  {paraNotes.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {paraNotes.map((note) => (
                        <div
                          key={note.id}
                          className="flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-2.5 py-1.5"
                        >
                          <MessageSquarePlus className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
                          <span className="flex-1 text-[11px] leading-relaxed text-foreground/80">
                            {note.text}
                          </span>
                          {onRemoveTeacherNote && (
                            <button
                              type="button"
                              onClick={() =>
                                onRemoveTeacherNote(submission.id, note.id)
                              }
                              className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add note button / input */}
                  {onAddTeacherNote && (
                    <div className="mt-2">
                      {editingNote === i ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitNote(i);
                              if (e.key === "Escape") {
                                setEditingNote(null);
                                setNoteText("");
                              }
                            }}
                            placeholder="Add a note about this paragraph…"
                            className="flex-1 rounded-md border bg-background/60 px-2 py-1 text-[11px] outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-ring"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => submitNote(i)}
                            disabled={!noteText.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                              setEditingNote(null);
                              setNoteText("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingNote(i)}
                          className="inline-flex items-center gap-1 rounded-md border border-dashed border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground/60 opacity-0 transition-opacity hover:border-primary/40 hover:text-foreground group-hover:opacity-100"
                        >
                          <MessageSquarePlus className="h-3 w-3" />
                          Add note
                        </button>
                      )}
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
