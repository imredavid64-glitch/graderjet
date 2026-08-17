# GraderJet

A human-in-the-loop grading workspace where teachers grade papers alongside an
AI agent. The agent performs an initial review; the teacher interrogates its
reasoning in a split-screen chat and adjusts scores, feedback flags, and batch
curves interactively.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**,
**shadcn/ui**, and the **Vercel AI SDK**.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

It runs **out of the box with no API key**: the chat route falls back to a
deterministic mock grading agent so the full agentic flow (streaming, tool
calls, live UI updates) works offline.

### Optional: use a real model

```bash
cp .env.example .env.local
# set OPENROUTER_API_KEY=sk-or-... or OPENAI_API_KEY=sk-...
npm run dev
```

With a real key the agent grades with `gpt-4o-mini` — via **OpenRouter** when
`OPENROUTER_API_KEY` is set (override the model with `OPENROUTER_MODEL`),
otherwise via OpenAI — and can adapt to arbitrary instructions instead of
following the mock script. If a configured key is rejected by its provider,
the chat route fails loudly with a clear error rather than silently serving the
mock.

## Deployment

**Live at https://graderjet.vercel.app** (Vercel). Production grades with
`gpt-4o-mini` via **OpenRouter** (`OPENROUTER_API_KEY` is set there); the mock
agent is only used when no API key is configured.

```bash
vercel --prod --yes
```

The project is linked to Vercel (`.vercel/project.json`), connected to
`github.com/imredavid64-glitch/graderjet`, and `vercel.json` pins the framework
to Next.js so production builds read the `.next` output. Pushing to `main`
auto-deploys to production; PRs get preview deployments. See
**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full runbook: git
deploys, environment variables, verification, and troubleshooting.

## How the agentic loop works

1. `useChat` (Vercel AI SDK) streams the conversation from `/api/chat`.
2. The agent emits **tool calls** alongside its reply:
   - `update_scores(category, new_score, reasoning)` — mutates the scorecard live.
   - `highlight_passage(start_line, end_line, reason)` — flags text in the viewer.
   - `apply_batch_curve(points, reason)` — shifts the grading scale for the batch.
3. `onToolCall` on the client applies each tool to React state (scorecard,
   document highlights, activity log) and returns the result via `addToolOutput`.
4. `sendAutomaticallyWhen` resubmits the conversation, and the agent acknowledges.

The tools are defined without server-side `execute` functions so they execute in
the browser and drive UI state directly.

## Layout

- **Top nav** — brand, paper navigator (Paper N of M), class selector, curve badge, export.
- **Left panel** — document viewer with paragraph-level, interactive highlights.
- **Right panel** — dual-tab workbench (`Agent Dialogue` + `Scorecard`) with a live activity feed.

## Structure

```
app/
  api/chat/route.ts     # streaming agent route (real model or mock)
  page.tsx              # workspace composition
components/             # top-nav, document-viewer, workbench, agent-dialogue,
                        # scorecard, activity-feed, tool-card, ui/*
hooks/use-grading-workspace.ts  # chat -> UI state wiring
lib/agent/tools.ts      # grading tools (update_scores, highlight_passage, curve)
lib/agent/api-key.ts    # provider-aware API key guard (fail loud on bad keys)
lib/agent/mock-model.ts # offline mock grading agent (scripted stream + tool calls)
lib/                    # types, mock data, grading helpers
scripts/verify-flow.mjs # Playwright end-to-end smoke test
vercel.json             # pins the Vercel framework preset to Next.js
docs/DEPLOYMENT.md      # Vercel deployment runbook
.github/workflows/ci.yml # PR checks: typecheck + next build
```

## Verification

```bash
npm run build
PORT=3100 npm start &   # in one terminal
node scripts/verify-flow.mjs   # expects http://localhost:3100
```

The smoke test asserts the **mock agent's** scripted behavior, so run it with
`OPENROUTER_API_KEY`/`OPENAI_API_KEY` unset (otherwise the real model replies
won't match the expected script).
