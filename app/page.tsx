"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  FileText,
  MessagesSquare,
  Scale,
  Sparkles,
  WifiOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveSampleSession } from "@/lib/session";

const FEATURES = [
  {
    icon: Zap,
    title: "Agentic grading",
    body: "The agent calls tools as it writes — updating rubric scores, flagging passages, and curving the batch. The workspace reacts in real time.",
  },
  {
    icon: Scale,
    title: "Human in the loop",
    body: "Every change is auditable. The agent explains each deduction, and you adjust, override, or ask for a re-read at any point.",
  },
  {
    icon: WifiOff,
    title: "Works offline",
    body: "No API key? A built-in mock agent demonstrates the full flow. Add OpenRouter or OpenAI and it grades with a real model.",
  },
];

const STEPS = [
  {
    icon: FileText,
    step: "1",
    title: "Paste the paper",
    body: "Enter the student name, the essay text, and the assignment prompt — or load a sample essay.",
  },
  {
    icon: Sparkles,
    step: "2",
    title: "The agent assesses",
    body: "Rubric scores and feedback flags appear on the document as the agent works through the paper.",
  },
  {
    icon: MessagesSquare,
    step: "3",
    title: "Interrogate & adjust",
    body: "“Why did Evidence lose two points?” Ask, override, or curve the batch — everything is logged.",
  },
];

export default function Home() {
  const router = useRouter();

  const trySample = () => {
    saveSampleSession("alex-rivera");
    router.push("/workspace");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">GraderJet</span>
          </div>
          <Button asChild size="sm">
            <Link href="/setup">
              Launch workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pb-16 pt-20 text-center">
        <Badge
          variant="outline"
          className="mb-6 border-primary/30 px-3 py-1 text-xs font-medium text-primary"
        >
          Human-in-the-loop AI grading
        </Badge>
        <h1 className="max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Grade essays alongside an{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            AI agent
          </span>
          .
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          GraderJet reads the paper, scores it against your rubric, and updates
          the workspace live — while you stay in control of every deduction,
          score change, and curve.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-11 px-7 text-base">
            <Link href="/setup">
              Start grading
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 px-7 text-base"
            onClick={trySample}
          >
            <BookOpen className="h-4 w-4" />
            Try the sample
          </Button>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          No account needed — works with or without an API key.
        </p>
      </section>

      {/* Features */}
      <section className="border-t bg-card/30">
        <div className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-14 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-600/15">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-4 py-14">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          How it works
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="relative pl-12">
              <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border bg-card text-xs font-semibold text-primary">
                {s.step}
              </div>
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{s.title}</h3>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-card/30">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-14 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Ready to grade your first paper?
          </h2>
          <Button asChild size="lg" className="mt-6 h-11 px-7 text-base">
            <Link href="/setup">
              Set up a paper
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            GraderJet
          </span>
          <span>
            Built with Next.js · Vercel AI SDK · OpenRouter
          </span>
        </div>
      </footer>
    </div>
  );
}
