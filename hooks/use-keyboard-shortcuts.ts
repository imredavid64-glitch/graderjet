"use client";

import { useEffect } from "react";

interface KeyboardShortcutOptions {
  /** Navigate to previous paper */
  onPrevPaper: () => void;
  /** Navigate to next paper */
  onNextPaper: () => void;
  /** Stop the agent generation */
  onStop: () => void;
  /** Undo last score/curve/highlight change */
  onUndo: () => void;
  /** Redo last undone change */
  onRedo: () => void;
  /** Open the export dialog */
  onExport: () => void;
  /** Navigate to setup for a new paper */
  onNewPaper: () => void;
  /** Whether stop is available (agent is generating) */
  canStop: boolean;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Whether paper navigation is available (multiple papers) */
  hasMultiplePapers: boolean;
}

/**
 * Registers global keyboard shortcuts for the grading workspace.
 *
 * - Ctrl/Cmd + ←      : Previous paper
 * - Ctrl/Cmd + →      : Next paper
 * - Ctrl/Cmd + Z      : Undo last change
 * - Ctrl/Cmd + Shift+Z: Redo last change
 * - Ctrl/Cmd + E      : Open export dialog
 * - Ctrl/Cmd + N      : New paper (navigate to /setup)
 * - Ctrl/Cmd + 1/2/3  : Switch tabs (Dialogue / Scorecard / Summary)
 * - Escape             : Stop agent generation
 */
export function useKeyboardShortcuts({
  onPrevPaper,
  onNextPaper,
  onStop,
  onUndo,
  onRedo,
  onExport,
  onNewPaper,
  canStop,
  canUndo,
  canRedo,
  hasMultiplePapers,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + Arrow: paper navigation
      if (mod && hasMultiplePapers) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onPrevPaper();
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          onNextPaper();
          return;
        }
      }

      // Ctrl/Cmd + Shift + Z: redo (check before plain Z)
      if (mod && e.shiftKey && (e.key === "z" || e.key === "Z") && canRedo) {
        e.preventDefault();
        onRedo();
        return;
      }

      // Ctrl/Cmd + Z: undo
      if (mod && !e.shiftKey && e.key === "z" && canUndo) {
        e.preventDefault();
        onUndo();
        return;
      }

      // Ctrl/Cmd + E: export
      if (mod && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        onExport();
        return;
      }

      // Ctrl/Cmd + N: new paper
      if (mod && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        onNewPaper();
        return;
      }

      // Ctrl/Cmd + 1/2/3: tab switching
      if (mod && !e.shiftKey && !e.altKey) {
        const tabMap: Record<string, string> = {
          "1": "dialogue",
          "2": "scorecard",
          "3": "summary",
        };
        const tabValue = tabMap[e.key];
        if (tabValue) {
          e.preventDefault();
          // Find the tab trigger button and click it
          const tabList = document.querySelector('[role="tablist"]');
          if (tabList) {
            const triggers = tabList.querySelectorAll('[role="tab"]');
            const idx = parseInt(e.key, 10) - 1;
            if (triggers[idx]) {
              (triggers[idx] as HTMLButtonElement).click();
            }
          }
          return;
        }
      }

      // Escape: stop generation
      if (e.key === "Escape" && canStop) {
        e.preventDefault();
        onStop();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onPrevPaper,
    onNextPaper,
    onStop,
    onUndo,
    onRedo,
    onExport,
    onNewPaper,
    canStop,
    canUndo,
    canRedo,
    hasMultiplePapers,
  ]);
}
