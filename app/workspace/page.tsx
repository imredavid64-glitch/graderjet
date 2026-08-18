"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useGradingWorkspace } from "@/hooks/use-grading-workspace";
import { TopNav } from "@/components/top-nav";
import { DocumentViewer } from "@/components/document-viewer";
import { Workbench } from "@/components/workbench";
import { Button } from "@/components/ui/button";
import { buildSubmissionFromSession, loadSession } from "@/lib/session";
import type { Submission } from "@/lib/types";

export default function WorkspacePage() {
  const [ready, setReady] = useState(false);
  const [initial, setInitial] = useState<Submission[]>([]);

  // The session is stored in localStorage by /setup (client-only), so load it
  // after mount rather than during SSR.
  useEffect(() => {
    const session = loadSession();
    if (session) setInitial([buildSubmissionFromSession(session)]);
    setReady(true);
  }, []);

  const ws = useGradingWorkspace(initial);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Sparkles className="h-5 w-5 animate-pulse text-primary" />
      </div>
    );
  }

  if (ws.submissions.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight">
          No paper set up yet
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Set up a student and their essay to open the grading workspace — or
          load the sample essay to see the agentic flow in action.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href="/setup">
              Set up a paper
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopNav
        current={ws.current}
        submissions={ws.submissions}
        currentId={ws.currentId}
        batchCurve={ws.batchCurve}
        onSelect={ws.setCurrentId}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <DocumentViewer submission={ws.current} />
        <Workbench
          submission={ws.current}
          batchCurve={ws.batchCurve}
          activity={ws.activity}
          chat={ws.chat}
          onScoreChange={(key, value) =>
            ws.updateScore(
              ws.current.id,
              key,
              value,
              "Teacher adjusted this category on the scorecard.",
            )
          }
        />
      </div>
    </div>
  );
}
