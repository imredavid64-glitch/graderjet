import type { BatchEntry, Rubric, ScoreCategory, Submission } from "./types";
import { RUBRIC, SUBMISSIONS } from "./mock-data";

/**
 * A grading session created on the /setup page. It is stored in localStorage
 * (client-only) and read by the /workspace page, so visiting the app starts
 * at the landing page instead of a pre-loaded demo workspace.
 */
export interface GradingSession {
  id: string;
  studentName: string;
  title: string;
  prompt: string;
  /** Full essay text; paragraphs are separated by blank lines. */
  text: string;
  rubricId: string;
  createdAt: number;
  /**
   * When set, the workspace loads the built-in demo submission (with its
   * pre-seeded scores and highlights) instead of building a fresh one.
   */
  sampleId?: "alex-rivera" | "priya-patel";
  /** Batch entries for multi-student grading. */
  batch?: BatchEntry[];
  /** Custom rubric overrides stored by the teacher. */
  customRubric?: Rubric;
}

const STORAGE_KEY = "graderjet.session.v1";

export function createSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveSession(session: GradingSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): GradingSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GradingSession;
    if (typeof parsed.studentName !== "string" || !parsed.studentName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Build a single submission from a student entry + rubric. */
export function buildSubmissionFromEntry(
  entry: BatchEntry,
  rubric: Rubric,
  position: number,
  totalSize: number,
): Submission {
  const paragraphs = entry.text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const scores: ScoreCategory[] = rubric.categories.map((c) => ({
    key: c.key,
    label: c.label,
    score: 0,
    max: c.max,
    feedback: "Awaiting assessment — ask the agent to grade this paper.",
  }));

  return {
    id: `sub-${entry.id}`,
    studentName: entry.studentName,
    classPosition: position,
    classSize: totalSize,
    title: entry.title.trim() || "Untitled Essay",
    prompt: entry.prompt,
    paragraphs: paragraphs.length > 0 ? paragraphs : [entry.text],
    highlights: [],
    scores,
    overallNote: "",
    teacherNotes: [],
  };
}

/** Build the workspace submissions from a session created in /setup. */
export function buildSubmissionsFromSession(
  session: GradingSession,
  rubric?: Rubric,
): Submission[] {
  const effectiveRubric = rubric ?? session.customRubric ?? RUBRIC;

  if (session.sampleId) {
    const demo = SUBMISSIONS.find((s) => s.id === `sub-${session.sampleId}`);
    if (demo) return [demo];
  }

  // If there are batch entries, build a submission for each.
  if (session.batch && session.batch.length > 0) {
    return session.batch.map((entry, i) =>
      buildSubmissionFromEntry(entry, effectiveRubric, i + 1, session.batch!.length),
    );
  }

  // Single-student fallback (legacy session shape).
  const entry: BatchEntry = {
    id: session.id,
    studentName: session.studentName,
    title: session.title,
    prompt: session.prompt,
    text: session.text,
  };
  return [buildSubmissionFromEntry(entry, effectiveRubric, 1, 1)];
}

/**
 * @deprecated Use buildSubmissionsFromSession instead.
 * Kept for backward compat with existing callers.
 */
export function buildSubmissionFromSession(
  session: GradingSession,
  rubric?: Rubric,
): Submission {
  return buildSubmissionsFromSession(session, rubric)[0];
}

/** Save one of the built-in demo papers as the current session. */
export function saveSampleSession(
  sampleId: "alex-rivera" | "priya-patel",
): GradingSession {
  const demo = SUBMISSIONS.find((s) => s.id === `sub-${sampleId}`);
  if (!demo) throw new Error(`Unknown sample: ${sampleId}`);
  const session: GradingSession = {
    id: createSessionId(),
    studentName: demo.studentName,
    title: demo.title,
    prompt: demo.prompt,
    text: demo.paragraphs.join("\n\n"),
    rubricId: RUBRIC.id,
    createdAt: Date.now(),
    sampleId,
  };
  saveSession(session);
  return session;
}
