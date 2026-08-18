"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RUBRIC } from "@/lib/mock-data";
import {
  createSessionId,
  saveSampleSession,
  saveSession,
  type GradingSession,
} from "@/lib/session";

const SAMPLE_TEXT = `Social media has completely changed how teenagers see themselves, and this change is mostly bad. Because platforms reward constant self-presentation, adolescents are pushed to build identities that are shaped more by an audience than by their own values, and this leads to anxiety rather than genuine growth.

The most serious problem is that social media turns identity into a performance. When a person's sense of self depends on likes and follower counts, it becomes fragile and reactive instead of stable. Teens scroll through highlight reels of other people's lives and measure their own ordinary moments against them.

There are, however, genuine benefits that should not be dismissed. Marginalized teens often find community online that they cannot access at school, and studies show this can be a lifeline for identity exploration.

In the end, social media is a tool, and like any tool its effect depends on how it is wielded. If platforms were redesigned to prioritize authentic connection over engagement metrics, the same technology could support rather than undermine identity formation.`;

const inputClass =
  "w-full rounded-lg border bg-muted/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-ring";

export default function SetupPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadSample = () => {
    setStudentName("Alex Rivera");
    setTitle("The Double-Edged Screen: Social Media and Adolescent Identity");
    setPrompt(
      "Using at least two credible sources, argue whether social media has a net positive or negative effect on adolescent identity formation.",
    );
    setText(SAMPLE_TEXT);
    setError(null);
  };

  const start = () => {
    if (!studentName.trim()) {
      setError("Enter the student's name to continue.");
      return;
    }
    if (text.trim().length < 40) {
      setError("Paste the essay text (at least a couple of sentences).");
      return;
    }
    const session: GradingSession = {
      id: createSessionId(),
      studentName: studentName.trim(),
      title: title.trim(),
      prompt: prompt.trim(),
      text: text.trim(),
      rubricId: RUBRIC.id,
      createdAt: Date.now(),
    };
    saveSession(session);
    router.push("/workspace");
  };

  const trySample = () => {
    saveSampleSession("alex-rivera");
    router.push("/workspace");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            GraderJet
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Set up a paper</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the student and the essay. The agent will grade it against the{" "}
          <span className="text-foreground">{RUBRIC.name}</span> rubric in the
          workspace.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="student-name"
              className="mb-1.5 block text-xs font-medium"
            >
              Student name <span className="text-destructive">*</span>
            </label>
            <input
              id="student-name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Jordan Lee"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="essay-title" className="mb-1.5 block text-xs font-medium">
              Essay title <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="essay-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Double-Edged Screen"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="prompt" className="mb-1.5 block text-xs font-medium">
              Assignment prompt <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What was the student asked to write about?"
              rows={2}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="essay-text" className="mb-1.5 block text-xs font-medium">
              Essay text <span className="text-destructive">*</span>
            </label>
            <textarea
              id="essay-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the student's essay here. Separate paragraphs with a blank line."
              rows={10}
              className={inputClass + " resize-y"}
            />
            <button
              type="button"
              onClick={loadSample}
              className="mt-2 text-xs text-primary underline-offset-4 hover:underline"
            >
              Load the sample essay into this form
            </button>
          </div>

          {/* Rubric preview */}
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {RUBRIC.name} rubric
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {RUBRIC.categories.map((c) => (
                <span
                  key={c.key}
                  className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {c.label} · {c.max} pts
                </span>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={start} className="h-10 px-6">
              Start grading
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-10 px-6" onClick={trySample}>
              <BookOpen className="h-4 w-4" />
              Try the sample
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            “Try the sample” opens the workspace with a pre-graded demo essay so
            you can see the full agentic flow instantly.
          </p>
        </div>
      </main>
    </div>
  );
}
