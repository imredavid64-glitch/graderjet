"use client";

import { MessageSquare, SlidersHorizontal } from "lucide-react";
import type { ChatStatus, UIMessage } from "ai";
import type { ActivityEntry, Submission } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentDialogue } from "@/components/agent-dialogue";
import { Scorecard } from "@/components/scorecard";
import { ActivityFeed } from "@/components/activity-feed";
import { TooltipProvider } from "@/components/ui/tooltip";

interface WorkbenchProps {
  submission: Submission;
  batchCurve: number;
  activity: ActivityEntry[];
  chat: {
    messages: UIMessage[];
    status: ChatStatus;
    error: Error | undefined;
    sendMessage: (message: { text: string }) => Promise<void>;
    stop: () => void;
  };
  onScoreChange: (key: string, value: number) => void;
}

export function Workbench({
  submission,
  batchCurve,
  activity,
  chat,
  onScoreChange,
}: WorkbenchProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <section className="flex min-h-0 flex-col">
        <Tabs
          defaultValue="dialogue"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 pb-2 pt-3">
            <TabsList>
              <TabsTrigger value="dialogue" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Agent Dialogue
              </TabsTrigger>
              <TabsTrigger value="scorecard" className="gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Scorecard
              </TabsTrigger>
            </TabsList>
            <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              human-in-the-loop
            </span>
          </div>

          <TabsContent
            value="dialogue"
            className="mt-0 min-h-0 flex-1 overflow-hidden"
          >
            <AgentDialogue chat={chat} studentName={submission.studentName} />
          </TabsContent>

          <TabsContent
            value="scorecard"
            className="mt-0 min-h-0 flex-1 overflow-hidden"
          >
            <Scorecard
              submission={submission}
              batchCurve={batchCurve}
              onScoreChange={onScoreChange}
            />
          </TabsContent>
        </Tabs>

        <ActivityFeed activity={activity} />
      </section>
    </TooltipProvider>
  );
}
