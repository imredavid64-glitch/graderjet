"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  Plus,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import type { Rubric } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { RUBRIC } from "@/lib/mock-data";
import { readFiles, type ParsedFile } from "@/lib/file-upload";
import { RubricEditor } from "@/components/rubric-editor";
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

interface StudentEntry {
  uid: string;
  studentName: string;
  title: string;
  prompt: string;
  text: string;
}

let uidCounter = 0;
function makeUid(): string {
  uidCounter += 1;
  return `st-${Date.now().toString(36)}-${uidCounter}`;
}

function emptyEntry(): StudentEntry {
  return { uid: makeUid(), studentName: "", title: "", prompt: "", text: "" };
}

export default function SetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch state: one or more students.
  const [students, setStudents] = useState<StudentEntry[]>([emptyEntry()]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<
    { name: string; error: string }[]
  >([]);

  // Rubric state.
  const [rubric, setRubric] = useState<Rubric>({ ...RUBRIC });
  const [showRubric, setShowRubric] = useState(false);

  const active = students[activeIdx];

  const updateField = (field: keyof StudentEntry, value: string) => {
    setStudents((prev) =>
      prev.map((s, i) => (i === activeIdx ? { ...s, [field]: value } : s)),
    );
  };

  const addStudent = () => {
    setStudents((prev) => [...prev, emptyEntry()]);
    setActiveIdx(students.length); // select the new one
    setError(null);
  };

  const removeStudent = (idx: number) => {
    if (students.length <= 1) return;
    setStudents((prev) => prev.filter((_, i) => i !== idx));
    setActiveIdx((prev) => Math.min(prev, students.length - 2));
  };

  const loadSample = () => {
    setStudents([
      {
        uid: makeUid(),
        studentName: "Alex Rivera",
        title: "The Double-Edged Screen: Social Media and Adolescent Identity",
        prompt:
          "Using at least two credible sources, argue whether social media has a net positive or negative effect on adolescent identity formation.",
        text: SAMPLE_TEXT,
      },
    ]);
    setActiveIdx(0);
    setError(null);
  };

  // --- File upload ---
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const { parsed, errors } = await readFiles(files);
      setUploadErrors(errors);

      if (parsed.length === 0) return;

      // Each file becomes a separate student entry.
      const newEntries: StudentEntry[] = parsed.map((p: ParsedFile) => ({
        uid: makeUid(),
        studentName: p.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
        title: "",
        prompt: "",
        text: p.text,
      }));

      setStudents((prev) => {
        // If the current first entry is empty, replace it; otherwise append.
        const firstEmpty =
          prev.length === 1 && !prev[0].studentName && !prev[0].text;
        return firstEmpty ? newEntries : [...prev, ...newEntries];
      });
      setActiveIdx(0);
      setError(null);
    },
    [],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  // --- Start grading ---
  const start = () => {
    const valid = students.filter(
      (s) => s.studentName.trim() && s.text.trim().length >= 40,
    );
    if (valid.length === 0) {
      setError("At least one student needs a name and essay text (40+ characters).");
      return;
    }

    const session: GradingSession = {
      id: createSessionId(),
      studentName: valid[0].studentName,
      title: valid[0].title,
      prompt: valid[0].prompt,
      text: valid[0].text,
      rubricId: rubric.id,
      createdAt: Date.now(),
      batch: valid.map((s) => ({
        id: s.uid,
        studentName: s.studentName,
        title: s.title,
        prompt: s.prompt,
        text: s.text,
      })),
      customRubric:
        rubric.id === RUBRIC.id ? undefined : { ...rubric },
    };
    saveSession(session);
    router.push("/workspace");
  };

  const trySample = () => {
    saveSampleSession("alex-rivera");
    router.push("/workspace");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
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

      <main
        className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-10"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <h1 className="text-2xl font-bold tracking-tight">Set up papers</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter students and essays — or drag & drop .txt, .docx, or .pdf files. The agent will
          grade against the{" "}
          <span className="text-foreground">{rubric.name}</span> rubric.
        </p>

        {/* Batch tabs */}
        {students.length > 1 && (
          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            {students.map((s, i) => (
              <button
                key={s.uid}
                type="button"
                onClick={() => {
                  setActiveIdx(i);
                  setError(null);
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  i === activeIdx
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30"
                }`}
              >
                <span className="truncate max-w-[120px]">
                  {s.studentName || `Student ${i + 1}`}
                </span>
                {students.length > 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStudent(i);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        removeStudent(i);
                      }
                    }}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${s.studentName || `Student ${i + 1}`}`}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={addStudent}
              className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Add student
            </button>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {/* Student name */}
          <div>
            <label
              htmlFor="student-name"
              className="mb-1.5 block text-xs font-medium"
            >
              Student name{" "}
              {students.length === 1 && (
                <span className="text-destructive">*</span>
              )}
            </label>
            <input
              id="student-name"
              value={active.studentName}
              onChange={(e) => updateField("studentName", e.target.value)}
              placeholder="e.g. Jordan Lee"
              className={inputClass}
            />
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="essay-title"
              className="mb-1.5 block text-xs font-medium"
            >
              Essay title{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="essay-title"
              value={active.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. The Double-Edged Screen"
              className={inputClass}
            />
          </div>

          {/* Prompt */}
          <div>
            <label
              htmlFor="prompt"
              className="mb-1.5 block text-xs font-medium"
            >
              Assignment prompt{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="prompt"
              value={active.prompt}
              onChange={(e) => updateField("prompt", e.target.value)}
              placeholder="What was the student asked to write about?"
              rows={2}
              className={inputClass}
            />
          </div>

          {/* Essay text */}
          <div>
            <label
              htmlFor="essay-text"
              className="mb-1.5 block text-xs font-medium"
            >
              Essay text{" "}
              {students.length === 1 && (
                <span className="text-destructive">*</span>
              )}
            </label>
            <textarea
              id="essay-text"
              value={active.text}
              onChange={(e) => updateField("text", e.target.value)}
              placeholder="Paste the student's essay here. Separate paragraphs with a blank line."
              rows={10}
              className={inputClass + " resize-y"}
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={loadSample}
                className="text-xs text-primary underline-offset-4 hover:underline"
              >
                Load the sample essay
              </button>
              <span className="text-xs text-muted-foreground/40">or</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
              >
                <Upload className="h-3 w-3" />
                Upload file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Upload errors */}
          {uploadErrors.length > 0 && (
            <div className="space-y-1">
              {uploadErrors.map((ue) => (
                <p
                  key={ue.name}
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                >
                  <span className="font-medium">{ue.name}:</span> {ue.error}
                </p>
              ))}
            </div>
          )}

          {/* Drop zone hint */}
          {students.length === 1 && !active.text && (
            <div className="rounded-xl border-2 border-dashed border-border/60 bg-muted/10 p-6 text-center transition-colors hover:border-primary/30">
              <FileText className="mx-auto h-6 w-6 text-muted-foreground/40" />
              <p className="mt-2 text-xs text-muted-foreground">
                Drag &amp; drop .txt, .docx, or .pdf files here to batch-add students
              </p>
            </div>
          )}

          {/* Rubric */}
          <div className="rounded-xl border bg-card p-4">
            <button
              type="button"
              onClick={() => setShowRubric(!showRubric)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {rubric.name} rubric
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {showRubric ? "Collapse" : "Edit"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {rubric.categories.map((c) => (
                  <span
                    key={c.key}
                    className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground"
                  >
                    {c.label} · {c.max} pts
                  </span>
                ))}
                <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-foreground">
                  Total ·{" "}
                  {rubric.categories.reduce((sum, c) => sum + c.max, 0)} pts
                </span>
              </div>
            </button>
            {showRubric && (
              <div className="mt-4">
                <RubricEditor
                  rubric={rubric}
                  onChange={setRubric}
                  onReset={() => setRubric({ ...RUBRIC })}
                />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={start} className="h-10 px-6">
              Start grading
              {students.length > 1 && (
                <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px]">
                  {students.filter((s) => s.text.trim().length >= 40).length}{" "}
                  papers
                </span>
              )}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-10 px-6"
              onClick={trySample}
            >
              <BookOpen className="h-4 w-4" />
              Try the sample
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            &ldquo;Try the sample&rdquo; opens the workspace with a pre-graded
            demo essay so you can see the full agentic flow instantly.
          </p>
        </div>
      </main>
    </div>
  );
}
