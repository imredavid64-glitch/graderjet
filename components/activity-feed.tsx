"use client";

import {
  Bot,
  Highlighter,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import type { ActivityEntry, ActivityKind } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<ActivityKind, React.ReactNode> = {
  score: <SlidersHorizontal className="h-3 w-3" />,
  highlight: <Highlighter className="h-3 w-3" />,
  curve: <TrendingUp className="h-3 w-3" />,
  agent: <Bot className="h-3 w-3" />,
};

function timeAgo(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function ActivityFeed({ activity }: { activity: ActivityEntry[] }) {
  return (
    <div className="shrink-0 border-t px-4 py-2">
      <div className="mb-1.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        Live activity
      </div>
      {activity.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/60">
          Agent actions will appear here as they happen.
        </p>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {activity.slice(0, 8).map((entry) => (
            <Tooltip key={entry.id}>
              <TooltipTrigger asChild>
                <div className="flex shrink-0 cursor-default items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 text-[11px]">
                  <span className="text-muted-foreground">
                    {KIND_ICON[entry.kind]}
                  </span>
                  <span className="whitespace-nowrap font-medium">
                    {entry.title}
                  </span>
                  <span className="whitespace-nowrap text-[10px] text-muted-foreground/60">
                    {timeAgo(entry.at)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {entry.detail}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}
