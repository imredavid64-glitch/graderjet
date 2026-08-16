"use client";

import { useGradingWorkspace } from "@/hooks/use-grading-workspace";
import { TopNav } from "@/components/top-nav";
import { DocumentViewer } from "@/components/document-viewer";
import { Workbench } from "@/components/workbench";

export default function Home() {
  const ws = useGradingWorkspace();

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
