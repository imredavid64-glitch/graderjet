"use client";

import type { Submission } from "@/lib/types";
import { letterGrade, totalScore } from "@/lib/grading";
import { cn } from "@/lib/utils";

function scoreTone(ratio: number) {
  if (ratio >= 0.8) return "text-emerald-400";
  if (ratio >= 0.6) return "text-amber-400";
  return "text-red-400";
}

function barColor(ratio: number) {
  if (ratio >= 0.8) return "bg-emerald-400";
  if (ratio >= 0.6) return "bg-amber-400";
  return "bg-red-400";
}

interface ClassSummaryProps {
  submissions: Submission[];
  batchCurve: number;
  onSelect: (id: string) => void;
  currentId: string;
}

export function ClassSummary({
  submissions,
  batchCurve,
  onSelect,
  currentId,
}: ClassSummaryProps) {
  if (submissions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No papers in this batch yet.
        </p>
      </div>
    );
  }

  const results = submissions.map((s) => {
    const totals = totalScore(s.scores, batchCurve);
    const pct = totals.max > 0 ? (totals.curved / totals.max) * 100 : 0;
    return { submission: s, ...totals, letter: letterGrade(pct) };
  });

  const totalEarned = results.reduce((sum, r) => sum + r.curved, 0);
  const totalMax = results.reduce((sum, r) => sum + r.max, 0);
  const classAverage = totalEarned / results.length;
  const classAvgPercent = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

  // Grade distribution
  const gradeCounts: Record<string, number> = {};
  for (const r of results) {
    gradeCounts[r.letter] = (gradeCounts[r.letter] || 0) + 1;
  }
  const gradeOrder = [
    "A",
    "A-",
    "B+",
    "B",
    "B-",
    "C+",
    "C",
    "C-",
    "D+",
    "D",
    "F",
  ];
  const gradeEntries = gradeOrder
    .filter((g) => gradeCounts[g])
    .map((g) => ({ grade: g, count: gradeCounts[g] }));
  const maxCount = Math.max(...gradeEntries.map((e) => e.count), 1);

  // Category averages (across all submissions)
  const categoryKeys =
    submissions.length > 0
      ? submissions[0].scores.map((c) => ({ key: c.key, label: c.label, max: c.max }))
      : [];
  const categoryAvgs = categoryKeys.map((cat) => {
    const avg =
      submissions.reduce((sum, s) => {
        const found = s.scores.find((c) => c.key === cat.key);
        return sum + (found?.score ?? 0);
      }, 0) / submissions.length;
    return { ...cat, avg };
  });

  return (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-5">
      {/* Class overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Papers
          </p>
          <p className="mt-1 text-2xl font-semibold">{results.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Class avg
          </p>
          <p className={cn("mt-1 text-2xl font-semibold", scoreTone(classAvgPercent / 100))}>
            {classAvgPercent.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Avg grade
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {letterGrade(classAvgPercent)}
          </p>
        </div>
      </div>

      {/* Grade distribution */}
      {gradeEntries.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
            Grade distribution
          </p>
          <div className="mt-3 space-y-1.5">
            {gradeEntries.map((e) => (
              <div key={e.grade} className="flex items-center gap-2">
                <span className="w-6 text-right text-xs font-medium tabular-nums">
                  {e.grade}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-muted/30">
                  <div
                    className={cn(
                      "h-full rounded transition-all duration-500",
                      barColor(gradeOrder.indexOf(e.grade) / gradeOrder.length),
                    )}
                    style={{ width: `${(e.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-4 text-right text-xs text-muted-foreground tabular-nums">
                  {e.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category averages */}
      {categoryAvgs.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
            Category averages
          </p>
          <div className="mt-3 space-y-3">
            {categoryAvgs.map((cat) => {
              const ratio = cat.avg / cat.max;
              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{cat.label}</span>
                    <span className={cn("tabular-nums", scoreTone(ratio))}>
                      {cat.avg.toFixed(1)} / {cat.max}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        barColor(ratio),
                      )}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paper list */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
          All papers
        </p>
        <div className="mt-3 space-y-1.5">
          {[...results]
            .sort((a, b) => b.curved - a.curved)
            .map((r) => {
              const ratio = r.curved / r.max;
              const isActive = r.submission.id === currentId;
              return (
                <button
                  key={r.submission.id}
                  type="button"
                  onClick={() => onSelect(r.submission.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                    isActive
                      ? "border-primary/40 bg-primary/5"
                      : "border-transparent hover:border-border hover:bg-muted/20",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.submission.studentName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.submission.title}
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        scoreTone(ratio),
                      )}
                    >
                      {r.letter}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {r.curved}/{r.max}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
