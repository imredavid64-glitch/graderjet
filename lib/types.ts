export type HighlightKind =
  | "weak-thesis"
  | "uncited-claim"
  | "vague-evidence"
  | "transition"
  | "grammar"
  | "positive";

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

export type ActivityKind = "score" | "highlight" | "curve" | "agent";

export interface ActivityEntry {
  id: string;
  at: Date;
  kind: ActivityKind;
  title: string;
  detail: string;
}
