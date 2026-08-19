"use client";

import { useState } from "react";
import { GripVertical, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { Rubric, RubricCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

let catCounter = 0;
function catUid(): string {
  catCounter += 1;
  return `cat-${Date.now().toString(36)}-${catCounter}`;
}

const inputClass =
  "w-full rounded-lg border bg-muted/40 px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-ring";

interface RubricEditorProps {
  rubric: Rubric;
  onChange: (rubric: Rubric) => void;
  onReset: () => void;
  className?: string;
}

export function RubricEditor({
  rubric,
  onChange,
  onReset,
  className,
}: RubricEditorProps) {
  const [editing, setEditing] = useState<string | null>(null);

  const updateCategory = (
    key: string,
    field: keyof RubricCategory,
    value: string | number,
  ) => {
    onChange({
      ...rubric,
      categories: rubric.categories.map((c) =>
        c.key === key ? { ...c, [field]: value } : c,
      ),
    });
  };

  const addCategory = () => {
    const key = catUid();
    onChange({
      ...rubric,
      categories: [
        ...rubric.categories,
        {
          key,
          label: "New Category",
          max: 10,
          description: "Describe what this category assesses.",
        },
      ],
    });
    setEditing(key);
  };

  const removeCategory = (key: string) => {
    onChange({
      ...rubric,
      categories: rubric.categories.filter((c) => c.key !== key),
    });
    if (editing === key) setEditing(null);
  };

  const totalMax = rubric.categories.reduce((sum, c) => sum + c.max, 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rubric — {rubric.name}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
            {rubric.categories.length} categories · {totalMax} total points
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-[11px]"
          onClick={onReset}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      <div className="space-y-2">
        {rubric.categories.map((cat) => {
          const isEditing = editing === cat.key;
          return (
            <div
              key={cat.key}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isEditing ? "border-primary/40 bg-primary/5" : "bg-muted/20",
              )}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={cat.label}
                          onChange={(e) =>
                            updateCategory(cat.key, "label", e.target.value)
                          }
                          className={cn(inputClass, "flex-1")}
                          placeholder="Category name"
                        />
                        <input
                          type="number"
                          value={cat.max}
                          onChange={(e) =>
                            updateCategory(
                              cat.key,
                              "max",
                              Math.max(1, parseInt(e.target.value) || 1),
                            )
                          }
                          className={cn(inputClass, "w-20")}
                          min={1}
                          max={100}
                        />
                      </div>
                      <textarea
                        value={cat.description}
                        onChange={(e) =>
                          updateCategory(cat.key, "description", e.target.value)
                        }
                        className={cn(inputClass, "resize-none")}
                        rows={2}
                        placeholder="What does this category assess?"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(cat.key)}
                      className="w-full text-left"
                    >
                      <span className="text-sm font-medium">{cat.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        0–{cat.max} pts
                      </span>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground/70">
                        {cat.description}
                      </p>
                    </button>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setEditing(null)}
                    >
                      ✓
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive/70 hover:text-destructive"
                    onClick={() => removeCategory(cat.key)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={addCategory}
      >
        <Plus className="h-3 w-3" />
        Add category
      </Button>
    </div>
  );
}
