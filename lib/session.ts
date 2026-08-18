import type { Rubric, ScoreCategory, Submission } from "./types";
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

/** Build the workspace submission from a session created in /setup. */
export function buildSubmissionFromSession(
  session: GradingSession,
  rubric: Rubric = RUBRIC,
): Submission {
  if (session.sampleId) {
    const demo = SUBMISSIONS.find((s) => s.id === `sub-${session.sampleId}`);
    if (demo) return demo;
  }

  const paragraphs = session.text
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
    id: `sub-${session.id}`,
    studentName: session.studentName,
    classPosition: 1,
    classSize: 1,
    title: session.title.trim() || "Untitled Essay",
    prompt: session.prompt,
    paragraphs: paragraphs.length > 0 ? paragraphs : [session.text],
    highlights: [],
    scores,
    overallNote: "",
  };
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
