"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, CircleStop } from "lucide-react";
import type { ChatStatus, UIMessage } from "ai";
import { SUGGESTED_PROMPTS } from "@/lib/mock-data";
import { ToolCard } from "@/components/tool-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatHandle {
  messages: UIMessage[];
  status: ChatStatus;
  error: Error | undefined;
  sendMessage: (message: { text: string }) => Promise<void>;
  stop: () => void;
}

interface ToolPartView {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: Record<string, unknown>;
  errorText?: string;
}

const OPENING_MESSAGE = `I've finished my first pass on this paper and applied an initial assessment to the workspace — rubric scores and feedback flags are now live on the left. My headline read: the argument is coherent, but the thesis is hedged and the key evidence is under-cited.

Ask me to raise or lower any category, flag a passage, or curve the batch, and I'll update everything in real time.`;

export function AgentDialogue({
  chat,
  studentName,
}: {
  chat: ChatHandle;
  studentName: string;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = chat.status === "submitted" || chat.status === "streaming";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.status]);

  const submit = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || busy) return;
    chat.sendMessage({ text: value });
    setInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Seeded opening message */}
        <div className="flex gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold">GraderJet Agent</span>
              <span className="text-[10px] text-muted-foreground">
                now · grading {studentName}
              </span>
            </div>
            <div className="mt-1.5 rounded-lg rounded-tl-sm border bg-card p-3 text-sm leading-relaxed text-foreground/90">
              {OPENING_MESSAGE}
            </div>
          </div>
        </div>

        {/* Live messages */}
        {chat.messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div key={message.id} className="flex gap-3">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  isUser
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white",
                )}
              >
                {isUser ? "T" : <Sparkles className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold">
                    {isUser ? "You" : "GraderJet Agent"}
                  </span>
                </div>
                <div
                  className={cn(
                    "mt-1.5 space-y-1.5 rounded-lg border p-3 text-sm leading-relaxed",
                    isUser
                      ? "border-border bg-secondary/40 text-foreground"
                      : "rounded-tl-sm border-border bg-card text-foreground/90",
                  )}
                >
                  {message.parts.map((part, i) => {
                    const isLast =
                      i === message.parts.length - 1 && !isUser;
                    if (part.type === "text") {
                      return (
                        <p
                          key={i}
                          className={cn(
                            "whitespace-pre-wrap",
                            isLast &&
                              chat.status === "streaming" &&
                              "streaming-caret",
                          )}
                        >
                          {part.text}
                        </p>
                      );
                    }
                    if (part.type === "step-start") {
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/70"
                        >
                          <span className="h-px flex-1 bg-border" />
                          step
                        </div>
                      );
                    }
                    if (
                      part.type === "dynamic-tool" ||
                      part.type.startsWith("tool-")
                    ) {
                      const p = part as ToolPartView;
                      const toolName =
                        p.toolName ??
                        (p.type.startsWith("tool-")
                          ? p.type.slice("tool-".length)
                          : "tool");
                      return (
                        <ToolCard
                          key={p.toolCallId ?? i}
                          toolName={toolName}
                          state={p.state ?? "input-available"}
                          input={p.input}
                          errorText={p.errorText}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {chat.error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
            {chat.error.message}
          </div>
        )}
      </div>

      {/* Suggested prompts */}
      <div className="flex shrink-0 flex-wrap gap-1.5 px-4 pb-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={busy}
            onClick={() => submit(prompt)}
            className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex shrink-0 items-end gap-2 border-t p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={`Ask about ${studentName.split(" ")[0]}'s paper…`}
          className="max-h-32 min-h-[38px] flex-1 resize-none rounded-lg border bg-muted/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-ring"
        />
        {busy ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={chat.stop}
            aria-label="Stop"
          >
            <CircleStop className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
