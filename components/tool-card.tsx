"use client";

import {
  Check,
  Highlighter,
  Loader2,
  SlidersHorizontal,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  toolName: string;
  state: string;
  input?: Record<string, unknown>;
  errorText?: string;
}

interface ToolDescription {
  icon: React.ReactNode;
  title: string;
  detail: string;
}

function describeTool(
  toolName: string,
  input?: Record<string, unknown>,
): ToolDescription {
  switch (toolName) {
    case "update_scores": {
      const category = String(input?.category ?? "Category");
      const score = String(input?.new_score ?? "—");
      return {
        icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
        title: `Update score · ${category} → ${score}`,
        detail: String(input?.reasoning ?? ""),
      };
    }
    case "highlight_passage": {
      const start = Number(input?.start_line ?? 0) + 1;
      const end = Number(input?.end_line ?? 0) + 1;
      return {
        icon: <Highlighter className="h-3.5 w-3.5" />,
        title: `Highlight passage · ¶${start}${end !== start ? `–${end}` : ""}`,
        detail: [
          input?.reason,
          input?.suggestion ? String(input.suggestion) : undefined,
        ]
          .filter(Boolean)
          .join(" — "),
      };
    }
    case "apply_batch_curve": {
      const points = Number(input?.points ?? 0);
      return {
        icon: <TrendingUp className="h-3.5 w-3.5" />,
        title: `Apply curve ${points >= 0 ? "+" : ""}${points}`,
        detail: String(input?.reason ?? ""),
      };
    }
    default:
      return {
        icon: <Wrench className="h-3.5 w-3.5" />,
        title: toolName,
        detail: JSON.stringify(input ?? {}),
      };
  }
}

export function ToolCard({ toolName, state, input, errorText }: ToolCardProps) {
  const desc = describeTool(toolName, input);
  const done = state === "output-available";
  const error = state === "output-error";
  const denied = state === "output-denied";

  return (
    <div
      className={cn(
        "my-1.5 rounded-lg border bg-muted/30 px-3 py-2",
        done && "border-emerald-500/30",
        error && "border-red-500/40",
        denied && "border-destructive/40",
        !done && !error && !denied && "border-border",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className="text-muted-foreground">{desc.icon}</span>
        <span className="text-foreground">{desc.title}</span>
        <span className="ml-auto flex items-center gap-1">
          {!done && !error && !denied && (
            <Loader2
              className={cn("h-3 w-3 animate-spin text-primary", "tool-live")}
            />
          )}
          {done && <Check className="h-3 w-3 text-emerald-400" />}
          {error && <span className="text-[10px] text-red-400">Failed</span>}
          {denied && (
            <span className="text-[10px] text-destructive">Denied</span>
          )}
        </span>
      </div>
      {(desc.detail || errorText) && (
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
          {error ? errorText : desc.detail}
        </p>
      )}
    </div>
  );
}
