"use client";

import { BarChart3, MessageSquare, Redo, SlidersHorizontal, Undo } from "lucide-react";
import type { ChatStatus, UIMessage } from "ai";
import type { ActivityEntry, Submission } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentDialogue } from "@/components/agent-dialogue";
import { Scorecard } from "@/components/scorecard";
import { ClassSummary } from "@/components/class-summary";
import { ActivityFeed } from "@/components/activity-feed";
import { TooltipProvider } from "@/components/ui/tooltip";

interface WorkbenchProps {
  submission: Submission;
  submissions: Submission[];
  batchCurve: number;
  activity: ActivityEntry[];
  currentId: string;
  onSelect: (id: string) => void;
  chat: {
    messages: UIMessage[];
    status: ChatStatus;
    error: Error | undefined;
    sendMessage: (message: { text: string }) => Promise<void>;
    stop: () => void;
  };
  onScoreChange: (key: string, value: number) => void;
  onAddTeacherNote?: (
    subId: string,
    kind: "paragraph" | "category",
    targetId: string,
    text: string,
  ) => void;
  onRemoveTeacherNote?: (subId: string, noteId: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function Workbench({
  submission,
  submissions,
  batchCurve,
  activity,
  currentId,
  onSelect,
  chat,
  onScoreChange,
  onAddTeacherNote,
  onRemoveTeacherNote,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
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
              {submissions.length > 1 && (
                <TabsTrigger value="summary" className="gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Summary
                </TabsTrigger>
              )}
            </TabsList>
            <div className="hidden items-center gap-2 md:flex">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (⌘Z)"
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Undo className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (⌘⇧Z)"
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Redo className="h-3.5 w-3.5" />
              </button>
              <div className="mx-1 h-4 w-px bg-border" />
              <kbd className="hidden items-center gap-1 text-[10px] text-muted-foreground xl:flex">
                <span className="rounded border bg-muted px-1 py-0.5 font-mono">⌘←</span>
                <span className="rounded border bg-muted px-1 py-0.5 font-mono">⌘→</span>
                papers
              </kbd>
              <kbd className="hidden items-center gap-1 text-[10px] text-muted-foreground xl:flex">
                <span className="rounded border bg-muted px-1 py-0.5 font-mono">⌘1</span>
                <span className="rounded border bg-muted px-1 py-0.5 font-mono">⌘2</span>
                tabs
              </kbd>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                human-in-the-loop
              </span>
            </div>
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
              onAddTeacherNote={onAddTeacherNote}
              onRemoveTeacherNote={onRemoveTeacherNote}
            />
          </TabsContent>

          {submissions.length > 1 && (
            <TabsContent
              value="summary"
              className="mt-0 min-h-0 flex-1 overflow-hidden"
            >
              <ClassSummary
                submissions={submissions}
                batchCurve={batchCurve}
                onSelect={onSelect}
                currentId={currentId}
              />
            </TabsContent>
          )}
        </Tabs>

        <ActivityFeed activity={activity} />
      </section>
    </TooltipProvider>
  );
}
