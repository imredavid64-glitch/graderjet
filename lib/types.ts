export type HighlightKind =
  | "weak-thesis"
  | "uncited-claim"
  | "vague-evidence"
  | "transition"
  | "grammar"
  | "positive";

/** A teacher's free-text annotation on a paragraph or category. */
export interface TeacherNote {
  id: string;
  /** "paragraph" for document-viewer notes, "category" for scorecard notes. */
  kind: "paragraph" | "category";
  /** Paragraph index (0-based) or category key. */
  targetId: string;
  text: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  startLine: number;
  endLine: number;
  kind: HighlightKind;
  reason: string;
  suggestion?: string;
}

export interface ScoreCategory {
  key: string;
  label: string;
  score: number;
  max: number;
  feedback: string;
}

export interface Submission {
  id: string;
  studentName: string;
  classPosition: number;
  classSize: number;
  title: string;
  prompt: string;
  paragraphs: string[];
  highlights: Highlight[];
  scores: ScoreCategory[];
  overallNote: string;
  /** Teacher annotations on paragraphs or categories. */
  teacherNotes: TeacherNote[];
}

export interface RubricCategory {
  key: string;
  label: string;
  max: number;
  description: string;
}

export interface Rubric {
  id: string;
  name: string;
  categories: RubricCategory[];
}

/** A student entry in a grading batch. */
export interface BatchEntry {
  id: string;
  studentName: string;
  title: string;
  prompt: string;
  text: string;
}

/** Summary stats for a single graded paper. */
export interface PaperSummary {
  id: string;
  studentName: string;
  title: string;
  totalScore: number;
  maxScore: number;
  letterGrade: string;
  categoryScores: { key: string; label: string; score: number; max: number }[];
  highlightCount: number;
}

export type ActivityKind = "score" | "highlight" | "curve" | "agent";

export interface ActivityEntry {
  id: string;
  at: Date;
  kind: ActivityKind;
  title: string;
  detail: string;
}
