"use client";

import type { Submission } from "@/lib/types";
import { letterGrade, totalScore } from "@/lib/grading";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

function scoreTone(ratio: number) {
  if (ratio >= 0.8) return "text-emerald-400";
  if (ratio >= 0.6) return "text-amber-400";
  return "text-red-400";
}

export function Scorecard({
  submission,
  batchCurve,
  onScoreChange,
}: {
  submission: Submission;
  batchCurve: number;
  onScoreChange: (key: string, value: number) => void;
}) {
  const totals = totalScore(submission.scores, batchCurve);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4">
      {/* Overall */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-muted/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Overall score</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight">
                {totals.curved}
              </span>
              <span className="text-sm text-muted-foreground">
                / {totals.max}
              </span>
              <span
                className={cn(
                  "rounded-md border px-1.5 py-0.5 text-xs font-semibold",
                  "border-border bg-muted/60",
                  scoreTone(totals.curved / totals.max),
                )}
              >
                {letterGrade(totals.curved)}
              </span>
            </div>
          </div>
          {batchCurve !== 0 && (
            <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-300">
              {batchCurve > 0 ? "+" : ""}
              {batchCurve} curve
            </span>
          )}
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${(totals.curved / totals.max) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {submission.overallNote}
        </p>
      </div>

      {/* Categories */}
      <div className="mt-4 space-y-4">
        {submission.scores.map((category) => {
          const ratio = category.score / category.max;
          return (
            <div
              key={category.key}
              className="rounded-lg border p-3 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{category.label}</span>
                <span className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      scoreTone(ratio),
                    )}
                  >
                    {category.score}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {category.max}
                  </span>
                </span>
              </div>
              <Slider
                value={[category.score]}
                max={category.max}
                step={1}
                onValueChange={(v) => onScoreChange(category.key, v[0])}
                className="mt-3"
                aria-label={`${category.label} score`}
              />
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {category.feedback}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 pb-2 text-center text-[10px] text-muted-foreground/60">
        Drag sliders to adjust — the agent updates these live from chat too.
      </p>
    </div>
  );
}
