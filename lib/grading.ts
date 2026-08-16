import type { HighlightKind } from "./types";

export interface HighlightMeta {
  label: string;
  text: string;
  bg: string;
  border: string;
  chip: string;
  dot: string;
}

export const HIGHLIGHT_META: Record<HighlightKind, HighlightMeta> = {
  "weak-thesis": {
    label: "Weak thesis",
    text: "text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    chip: "bg-red-500/15 text-red-300 border-red-500/30",
    dot: "bg-red-400",
  },
  "uncited-claim": {
    label: "Uncited claim",
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
  },
  "vague-evidence": {
    label: "Vague evidence",
    text: "text-orange-300",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    chip: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    dot: "bg-orange-400",
  },
  transition: {
    label: "Transition",
    text: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    dot: "bg-sky-400",
  },
  grammar: {
    label: "Grammar",
    text: "text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    chip: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    dot: "bg-violet-400",
  },
  positive: {
    label: "Strength",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
};

export function kindFromReason(reason: string): HighlightKind {
  const r = reason.toLowerCase();
  if (r.includes("thesis")) return "weak-thesis";
  if (r.includes("uncited") || r.includes("citation") || r.includes("source"))
    return "uncited-claim";
  if (r.includes("vague") || r.includes("evidence")) return "vague-evidence";
  if (r.includes("grammar") || r.includes("mechanic")) return "grammar";
  if (r.includes("transition")) return "transition";
  if (r.includes("strength") || r.includes("positive") || r.includes("great"))
    return "positive";
  return "vague-evidence";
}

const CATEGORY_KEYS = [
  "thesis",
  "evidence",
  "analysis",
  "organization",
  "conventions",
] as const;

export function normalizeCategory(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("thesis")) return "thesis";
  if (l.includes("evidence")) return "evidence";
  if (l.includes("analysis")) return "analysis";
  if (l.includes("organization") || l.includes("organisation")) return "organization";
  if (l.includes("convention") || l.includes("grammar") || l.includes("mechanic"))
    return "conventions";
  return l.trim();
}

export function categoryLabel(key: string): string {
  const map: Record<string, string> = {
    thesis: "Thesis",
    evidence: "Evidence",
    analysis: "Analysis",
    organization: "Organization",
    conventions: "Conventions",
  };
  return map[key] ?? key;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function letterGrade(total: number): string {
  if (total >= 93) return "A";
  if (total >= 90) return "A-";
  if (total >= 87) return "B+";
  if (total >= 83) return "B";
  if (total >= 80) return "B-";
  if (total >= 77) return "C+";
  if (total >= 73) return "C";
  if (total >= 70) return "C-";
  if (total >= 67) return "D+";
  if (total >= 63) return "D";
  return "F";
}

export function totalScore(
  scores: { score: number; max: number }[],
  curve = 0,
): { earned: number; max: number; curved: number } {
  const earned = scores.reduce((sum, c) => sum + c.score, 0);
  const max = scores.reduce((sum, c) => sum + c.max, 0);
  return { earned, max, curved: Math.min(max, earned + curve) };
}
