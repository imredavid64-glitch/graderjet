import type { BatchEntry, Rubric, Submission } from "./types";
import type { GradingSession } from "./session";

export const SESSION_EXPORT_VERSION = 1;
export const SESSION_EXPORT_APP = "GraderJet";
export const SESSION_EXPORT_MIME = "application/json";

/**
 * The full workspace state that round-trips through a session file:
 * every graded submission (scores, highlights, teacher notes), the batch
 * curve, and the agent conversation (AI SDK UI-message parts).
 */
export interface WorkspaceState {
  submissions: Submission[];
  batchCurve: number;
  messages: unknown[];
}

/** A shareable GraderJet session file: inputs + workspace state. */
export interface SessionExport {
  app: typeof SESSION_EXPORT_APP;
  version: number;
  exportedAt: string;
  session: GradingSession;
  workspace?: WorkspaceState;
}

export function serializeSessionExport(
  session: GradingSession,
  workspace: WorkspaceState,
): string {
  const pack: SessionExport = {
    app: SESSION_EXPORT_APP,
    version: SESSION_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    session,
    workspace,
  };
  return JSON.stringify(pack, null, 2);
}

export type SessionExportResult =
  | { ok: true; data: SessionExport }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Re-uses the same cheap shape checks the session store relies on. */
function isValidSession(session: unknown): session is GradingSession {
  if (!isRecord(session)) return false;
  if (typeof session.studentName !== "string" || !session.studentName) return false;
  if (typeof session.rubricId !== "string" || !session.rubricId) return false;
  if (typeof session.id !== "string" || !session.id) return false;
  const batch = session.batch;
  if (batch !== undefined) {
    if (!Array.isArray(batch)) return false;
    for (const entry of batch) {
      if (!isRecord(entry) || typeof entry.studentName !== "string") return false;
    }
  }
  return true;
}

function isValidWorkspace(workspace: unknown): workspace is WorkspaceState {
  if (!isRecord(workspace)) return false;
  if (typeof workspace.batchCurve !== "number") return false;
  if (!Array.isArray(workspace.submissions)) return false;
  for (const sub of workspace.submissions) {
    if (!isRecord(sub)) return false;
    if (typeof sub.id !== "string" || !sub.id) return false;
    if (typeof sub.studentName !== "string") return false;
    if (!Array.isArray(sub.paragraphs)) return false;
    if (!Array.isArray(sub.scores)) return false;
    for (const c of sub.scores) {
      if (!isRecord(c)) return false;
      if (typeof c.key !== "string" || typeof c.score !== "number") return false;
    }
    if (!Array.isArray(sub.highlights)) return false;
    if (!Array.isArray(sub.teacherNotes)) return false;
  }
  if (workspace.messages !== undefined && !Array.isArray(workspace.messages)) {
    return false;
  }
  return true;
}

export function parseSessionExport(json: string): SessionExportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "Not valid JSON — the file is not a GraderJet session." };
  }
  if (!isRecord(raw)) {
    return { ok: false, error: "The file is not a GraderJet session." };
  }
  if (raw.app !== SESSION_EXPORT_APP) {
    return { ok: false, error: `"app" must be "${SESSION_EXPORT_APP}" — this file is not a GraderJet session.` };
  }
  if (typeof raw.version !== "number" || raw.version > SESSION_EXPORT_VERSION) {
    return {
      ok: false,
      error: `Unsupported session file version "${String(raw.version)}" — expected ${SESSION_EXPORT_VERSION} or older.`,
    };
  }
  if (!isValidSession(raw.session)) {
    return {
      ok: false,
      error: "The session is missing required fields (studentName, rubricId, id).",
    };
  }
  if (raw.workspace !== undefined && !isValidWorkspace(raw.workspace)) {
    return {
      ok: false,
      error: "The workspace state is malformed (submissions, batchCurve, or messages).",
    };
  }
  const pack = raw as unknown as SessionExport;
  return { ok: true, data: pack };
}

/**
 * Persist a session's workspace state so a refresh (or later visit) restores
 * the graded papers instead of starting from a blank scorecard.
 */
export function workspaceStorageKey(sessionId: string): string {
  return `graderjet.workspace.v1.${sessionId}`;
}

export function saveWorkspaceState(
  sessionId: string,
  state: WorkspaceState,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(workspaceStorageKey(sessionId), JSON.stringify(state));
  } catch {
    // Storage full or unavailable — the session itself still works.
  }
}

export function loadWorkspaceState(sessionId: string): WorkspaceState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(workspaceStorageKey(sessionId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidWorkspace(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export type { BatchEntry, Rubric };