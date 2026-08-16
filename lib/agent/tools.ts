import { tool } from "ai";
import { z } from "zod";

/**
 * Agentic grading tools. These are intentionally defined *without* an
 * `execute` function so they are forwarded to the client as tool calls —
 * the client mutates live UI state (scorecard, document highlights, batch
 * curve) in `onToolCall` and reports the result back with `addToolOutput`.
 */
export const gradingTools = {
  update_scores: tool({
    description:
      "Update the score for a single rubric category on the live scorecard. " +
      "Use this when the teacher asks to raise, lower, or reconsider a category score.",
    inputSchema: z.object({
      category: z
        .string()
        .describe("Rubric category label: Thesis, Evidence, Analysis, Organization, or Conventions."),
      new_score: z.number().min(0).describe("The new score for the category."),
      reasoning: z.string().describe("Why the score is being changed."),
    }),
  }),
  highlight_passage: tool({
    description:
      "Highlight a passage in the student document and attach a feedback flag. " +
      "Use this when explaining a deduction or pointing the teacher to evidence in the paper.",
    inputSchema: z.object({
      start_line: z
        .number()
        .int()
        .min(0)
        .describe("0-based index of the first paragraph to highlight."),
      end_line: z
        .number()
        .int()
        .min(0)
        .describe("0-based index of the last paragraph to highlight."),
      reason: z
        .string()
        .describe("Short flag label, e.g. 'Uncited claim' or 'Weak thesis'."),
      suggestion: z
        .string()
        .optional()
        .describe("Optional actionable suggestion for the student."),
    }),
  }),
  apply_batch_curve: tool({
    description:
      "Apply a point curve across the current batch of papers, adjusting the " +
      "grading scale for every student. Use this when the teacher asks to curve the class.",
    inputSchema: z.object({
      points: z.number().describe("Points to add to every paper (can be negative)."),
      reason: z.string().describe("Why the curve is being applied."),
    }),
  }),
};

export type GradingToolName = keyof typeof gradingTools;
