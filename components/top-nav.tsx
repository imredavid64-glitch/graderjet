"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  Download,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Submission } from "@/lib/types";
import { letterGrade, totalScore } from "@/lib/grading";
import { RUBRIC } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TopNavProps {
  current: Submission;
  submissions: Submission[];
  currentId: string;
  batchCurve: number;
  onSelect: (id: string) => void;
}

export function TopNav({
  current,
  submissions,
  currentId,
  batchCurve,
  onSelect,
}: TopNavProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const index = submissions.findIndex((s) => s.id === currentId);
  const go = (dir: 1 | -1) => {
    const next =
      (index + dir + submissions.length) % submissions.length;
    onSelect(submissions[next].id);
  };

  const totals = totalScore(current.scores, batchCurve);
  const payload = {
    app: "GraderJet",
    rubric: RUBRIC.name,
    student: current.studentName,
    title: current.title,
    scores: current.scores.map((s) => ({
      category: s.label,
      score: s.score,
      max: s.max,
    })),
    total: totals.curved,
    letterGrade: letterGrade(totals.curved),
    batchCurve,
    highlights: current.highlights.map((h) => ({
      paragraph: h.startLine + 1,
      reason: h.reason,
      suggestion: h.suggestion,
    })),
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${current.studentName.replace(/\s+/g, "-")}-grading.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card/60 px-4 backdrop-blur">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">
              GraderJet
            </span>
            <Badge
              variant="outline"
              className="hidden h-5 border-primary/30 px-1.5 text-[10px] font-medium text-primary sm:inline-flex"
            >
              AI
            </Badge>
          </div>
          <span className="hidden text-[11px] text-muted-foreground sm:block">
            Grading workspace
          </span>
        </div>
      </Link>

      <div className="mx-2 hidden h-6 w-px bg-border sm:block" />

      {/* Paper navigator */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => go(-1)}
          aria-label="Previous paper"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 gap-1.5 px-2 text-sm font-medium"
            >
              Paper {current.classPosition} of {current.classSize}
              <span className="hidden text-muted-foreground md:inline">
                · {current.studentName}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {submissions.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onSelect={() => onSelect(s.id)}
                className="flex items-center justify-between"
              >
                <span className="truncate">{s.studentName}</span>
                <span className="text-xs text-muted-foreground">
                  #{s.classPosition}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => go(1)}
          aria-label="Next paper"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Class selector */}
        <Select defaultValue="period-3">
          <SelectTrigger className="hidden h-8 w-44 border-0 bg-secondary/60 text-xs sm:flex">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="period-3">English 11 · Period 3</SelectItem>
            <SelectItem value="period-1">English 9 · Period 1</SelectItem>
            <SelectItem value="period-5">AP Literature · Period 5</SelectItem>
          </SelectContent>
        </Select>

        {batchCurve !== 0 && (
          <Badge className="h-6 gap-1 bg-emerald-500/15 text-emerald-300">
            <TrendingUp className="h-3 w-3" />
            {batchCurve > 0 ? "+" : ""}
            {batchCurve} curve
          </Badge>
        )}

        <Button asChild variant="ghost" size="sm" className="h-8">
          <Link href="/setup">
            <Plus className="h-3.5 w-3.5" />
            New paper
          </Link>
        </Button>

        <Button
          size="sm"
          className="h-8"
          onClick={() => setExportOpen(true)}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export grading — {current.studentName}</DialogTitle>
            <DialogDescription>
              {RUBRIC.name} · {totals.curved}/{totals.max} ·{" "}
              {letterGrade(totals.curved)}
              {batchCurve !== 0 && ` (${batchCurve > 0 ? "+" : ""}${batchCurve} curve)`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 p-3">
            <pre className="max-h-64 overflow-auto text-xs leading-relaxed text-muted-foreground">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={copyJson}>
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy JSON"}
            </Button>
            <Button size="sm" onClick={downloadJson}>
              <Download className="h-3.5 w-3.5" />
              Download .json
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
