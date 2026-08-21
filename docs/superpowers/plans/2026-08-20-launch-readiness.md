# GraderJet Launch Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get GraderJet from "CI green but production grading broken" to a verified, launchable state — production grades with the real model, repo is clean, the dev machine can build again, and everything is verified end-to-end.

**Architecture:** Five sequential workstreams. Task 0 is a human action (OpenRouter account) that unblocks production. Task 1 is the only code change: surface real model errors in the chat stream (currently swallowed as a generic "An error occurred.") and remove the duplicated system-prompt code. Task 2 is repo hygiene. Task 3 is human-approved disk cleanup on the dev machine (disk is 97% full — that is why local `tsc`/`next build` crawl). Tasks 4–5 re-verify locally and against production. A decision gate (launch scope: no auth) closes the plan.

**Tech Stack:** Next.js 14 (App Router), AI SDK v7 (`ai`, `streamText`), TypeScript, Node's built-in test runner, Playwright, Vercel, GitHub Actions.

## Global Constraints

- Node 24 (CI) / whatever the local machine runs — `node --test` glob patterns supported (Node ≥21).
- No new dependencies. No changes to the mock-agent fallback behavior or the fail-loud API-key guard.
- Test style: `node:test` + `node:assert/strict`, `import ... from "./x.ts"` with `.ts` extension (matches `lib/agent/chat-input.test.ts`).
- The `test` script in `package.json` must run **all** unit tests, not just `chat-input.test.ts`.
- E2E/Playwright files stay excluded from `tsconfig.json` (`"exclude": ["node_modules", "e2e", "playwright.config.ts"]`) — do not re-include them.
- Production deploy path: push to `main` auto-deploys (Vercel git integration); `vercel --prod` also works from a linked machine.
- Do not commit `opencode.json` (local-only config pointing at a localhost gateway) — gitignore it instead.

---

### Task 0: Restore production grading (HUMAN — cannot be done by the agent)

Production `/api/chat` streams `{"type":"error","errorText":"An error occurred."}` on every request (verified 3× on 2026-08-20). The API-key guard passes, so the failure is the model call itself. Per `docs/DEPLOYMENT.md:144` this signature matches OpenRouter **HTTP 402 "requires more credits"** (the `/v1/models` guard check is free and still passes).

**Files:** none (Vercel dashboard / openrouter.ai account).

- [ ] **Step 1: Add credits or rotate the key**

  Option A (likely fix): add credits at https://openrouter.ai/settings/credits.

  Option B: if the key is suspect, replace `OPENROUTER_API_KEY` in Vercel → graderjet → Settings → Environment Variables, then redeploy (push to `main` or `vercel --prod`).

- [ ] **Step 2: Verify grading works**

  ```bash
  curl -s -X POST https://graderjet.vercel.app/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"Raise thesis"}]}]}' \
    --max-time 60 | head -c 600
  ```

  Expected: SSE stream with `data: {"type":"start"}`, then `text` and/or `tool-input` data events — **no** `"type":"error"`.

- [ ] **Step 3: If it still fails, capture the real error**

  Run Task 1 first (it makes the stream report the real provider error instead of "An error occurred."), redeploy, and re-run the Step 2 curl. The stream will then name the exact failure (e.g. 402 / 401 / rate limit).

---

### Task 1: Surface real model errors in the chat stream + dedupe system prompt

**Files:**
- Create: `lib/agent/prompt.ts`
- Create: `lib/agent/prompt.test.ts`
- Modify: `app/api/chat/route.ts:17-34,64-81,107-115`
- Modify: `package.json:10`

**Interfaces:**
- Consumes: `RUBRIC` from `@/lib/mock-data` (existing).
- Produces:
  - `buildSystemPrompt(categories: RubricCategory[]): string` where `RubricCategory = { key: string; label: string; max: number; description: string }`, defaulting to `RUBRIC.categories`.
  - `streamText` in the route gets an `onError: ({ error }) => string` callback that logs the real error server-side and overrides the client-facing stream error text.

**Why:** Today a mid-stream model failure (e.g. OpenRouter 402) reaches the client as the AI SDK's generic `"An error occurred."` — impossible to diagnose from the outside. The route also builds the identical system prompt twice (lines 17–34 dead constant + lines 64–81 inline); extract once.

- [ ] **Step 1: Write the failing test** — `lib/agent/prompt.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt } from "./prompt.ts";

test("buildSystemPrompt renders every rubric category with label, max, and description", () => {
  const prompt = buildSystemPrompt([
    { key: "thesis", label: "Thesis", max: 20, description: "A clear, arguable thesis." },
    { key: "mechanics", label: "Writing Mechanics", max: 10, description: "Grammar and punctuation." },
  ]);
  assert.match(prompt, /Thesis \(0–20\): A clear, arguable thesis\./);
  assert.match(prompt, /Writing Mechanics \(0–10\): Grammar and punctuation\./);
});

test("buildSystemPrompt defaults to the stock rubric", () => {
  const prompt = buildSystemPrompt();
  assert.match(prompt, /Thesis Statement/);
  assert.match(prompt, /update_scores/);
});
```

- [ ] **Step 2: Run the test — verify it fails**

  Run: `node --test lib/agent/prompt.test.ts`
  Expected: FAIL with `ERR_MODULE_NOT_FOUND` / cannot find module `./prompt.ts`.

- [ ] **Step 3: Implement** — create `lib/agent/prompt.ts` (body copied verbatim from `app/api/chat/route.ts:64-81`)

```ts
import { RUBRIC } from "@/lib/mock-data";

export type RubricCategory = {
  key: string;
  label: string;
  max: number;
  description: string;
};

export function buildSystemPrompt(categories: RubricCategory[] = RUBRIC.categories): string {
  return `You are the GraderJet grading agent — an expert writing instructor and
scoring assistant working alongside a human teacher in a human-in-the-loop workspace.

The teacher grades papers with you. You provide an initial assessment, then the teacher can
interrogate your reasoning, request score changes, and adjust feedback interactively.

Available rubric categories:
${categories
  .map((c) => `- ${c.label} (0–${c.max}): ${c.description}`)
  .join("\n")}

Use your tools to make the workspace reflect decisions in real time:
- update_scores: change a rubric category score on the live scorecard.
- highlight_passage: flag a passage in the student document.
- apply_batch_curve: shift the grading scale for the whole batch.

Be concise, specific, and cite the passage or criterion behind every deduction. When you change
state, briefly explain the reasoning so the teacher can audit your judgment.`;
}
```

- [ ] **Step 4: Run the test — verify it passes**

  Run: `node --test lib/agent/prompt.test.ts`
  Expected: 2 passing.

- [ ] **Step 5: Rewire the route** — `app/api/chat/route.ts`

  - Delete the dead `SYSTEM_PROMPT` constant (lines 17–34).
  - Replace the inline prompt construction (lines 64–81) with:

  ```ts
  const categories = rubricCategories ?? RUBRIC.categories;
  ```

  - Add import: `import { buildSystemPrompt } from "@/lib/agent/prompt";`
  - Add `onError` to the `streamText` call (after `maxOutputTokens: 1024`):

  ```ts
  onError: ({ error }) => {
    console.error("[graderjet] model stream error:", error);
    return `Grading failed: ${error instanceof Error ? error.message : String(error)}`;
  },
  ```

  The `categories` variable must now be used in `system: buildSystemPrompt(categories)`. Check the `system` line at route.ts:110.

- [ ] **Step 6: Make the test script run every unit test** — `package.json:10`

  Change `"test": "node --test lib/agent/chat-input.test.ts"` to:

  ```json
  "test": "node --test lib/**/*.test.ts"
  ```

  (Node ≥21 supports glob patterns natively in `node --test`; CI runs Node 24.)

- [ ] **Step 7: Run the full suite — verify all pass**

  Run: `npm test`
  Expected: every `lib/**/*.test.ts` passes (`prompt`, `chat-input`, `session`, `grading`, `class-summary`, `export-class-summary`, `file-upload`).

- [ ] **Step 8: Typecheck**

  Run: `npx tsc --noEmit`
  Expected: no errors. (If the machine is still starved, defer to Task 3 first.)

- [ ] **Step 9: Commit**

  ```bash
  git add lib/agent/prompt.ts lib/agent/prompt.test.ts app/api/chat/route.ts package.json package-lock.json
  git commit -m "fix: surface real model errors in chat stream, dedupe system prompt"
  ```

---

### Task 2: Repo hygiene — commit e2e specs, ignore local tooling config

**Files:**
- Add: `e2e/class-summary.spec.ts`, `e2e/custom-rubric.spec.ts`, `e2e/teacher-notes.spec.ts`
- Modify: `.gitignore`

**Interfaces:** none — pure repo state.

**Why:** `git status` shows three finished Playwright specs (class summary, custom rubric, teacher notes) that were never committed, plus `opencode.json` which is a local-only config (points at `http://localhost:20128` — meaningless for anyone else and for CI).

- [ ] **Step 1: Ignore the local tooling config**

  Append to `.gitignore`:

  ```
  opencode.json
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add e2e/class-summary.spec.ts e2e/custom-rubric.spec.ts e2e/teacher-notes.spec.ts .gitignore
  git commit -m "test: add e2e specs for class summary, custom rubric, teacher notes"
  ```

- [ ] **Step 3: Verify the tree is clean**

  Run: `git status --porcelain`
  Expected: empty output.

---

### Task 3: Free disk space on the dev machine (HUMAN-approved deletions)

**Files:** none in the repo — machine-level cleanup.

**Why:** `/dev/disk3s5` is 97% full (16 GB free). This is why `tsc` ran at 0% CPU for 15+ minutes and `next build` stalls — the filesystem is thrashing. Nothing in Tasks 1–2 runs reliably until this is fixed. Target: ≥ 40 GB free.

- [ ] **Step 1: Survey the biggest consumers**

  ```bash
  du -sh ~/Library/Caches/* 2>/dev/null | sort -rh | head -15
  du -sh ~/.npm ~/Library/Developer/Xcode/DerivedData ~/Library/Developer/CoreSimulator 2>/dev/null
  du -sh ~/Downloads ~/Movies ~/Desktop 2>/dev/null
  ls -lh ~/Library/Logs/DiagnosticReports 2>/dev/null | head
  ```

  (Measured on 2026-08-20: `~/Library/Caches` alone is 12 GB, `~/.npm` 535 MB.)

- [ ] **Step 2: User approves and deletes** (agent proposes, user runs)

  Safe candidates (regenerable, no user data):
  ```bash
  rm -rf ~/.npm/_cacache                 # re-fetched by npm install
  rm -rf ~/Library/Developer/Xcode/DerivedData  # rebuilt on next xcodebuild
  rm -rf ~/Library/Logs/DiagnosticReports
  find ~/Library/Caches -type f -mtime +30 -delete 2>/dev/null
  ```
  User-data candidates (ask first): `~/Downloads`, trash (`rm -rf ~/.Trash/*`), old Docker images (`docker system prune -a` if Docker is used).

- [ ] **Step 3: Confirm the headroom**

  Run: `df -h /System/Volumes/Data | tail -1`
  Expected: ≥ 40 GB available (capacity ≤ ~90%).

---

### Task 4: Local verification suite

**Files:** none — run commands only.

**Why:** prove the exact code on `main` passes typecheck, all unit tests, a production build, the mock-mode UI smoke test, and the full Playwright suite — on the machine that will do future dev.

- [ ] **Step 1: Kill the stale next server (root, v16.2.1 — not this project)**

  Run: `ps aux | grep next-server | grep -v grep` — if present, kill it:
  `sudo kill <PID>` (it runs as root; the `next-server (v16.2.1)` process predates this project's Next 14 and can steal port 3000/3100, which Playwright's `reuseExistingServer: true` would attach to).

- [ ] **Step 2: Typecheck**

  Run: `npm run typecheck`
  Expected: exit 0, no errors.

- [ ] **Step 3: Unit tests**

  Run: `npm test`
  Expected: all `lib/**/*.test.ts` pass.

- [ ] **Step 4: Production build**

  Run: `npm run build`
  Expected: build completes; route `/`, `/setup`, `/workspace`, `/api/chat` compiled. (Network to `fonts.googleapis.com` required — see DEPLOYMENT.md troubleshooting.)

- [ ] **Step 5: Mock-mode UI smoke test**

  ```bash
  PORT=3100 npm start &
  BASE_URL=http://localhost:3100 node scripts/verify-flow.mjs
  ```
  Expected: all checks pass, no browser console errors. (Ensure `OPENROUTER_API_KEY`/`OPENAI_API_KEY` are **unset** for mock mode.)

- [ ] **Step 6: Playwright e2e suite**

  Run: `npx playwright test`
  Expected: all specs pass — `landing`, `setup`, `workspace`, `upload-docx`, plus the three new ones from Task 2 (`class-summary`, `custom-rubric`, `teacher-notes`). `webServer` in `playwright.config.ts` boots `npm run dev -p 3100` automatically.

- [ ] **Step 7: Kill the local server**

  Run: `kill %1` (or `pkill -f "next start"`).

---

### Task 5: Deploy and verify production end-to-end

**Files:** none — deploy + verify.

**Why:** close the loop on Task 0: the fix must be live and the real-model journey must work from the outside before launch.

- [ ] **Step 1: Push `main` (auto-deploys)**

  ```bash
  git push origin main
  ```
  Watch Vercel: production deployment for `18d7973`-descendant commit must reach Ready. (Alternatively `vercel --prod --yes` from the linked machine.)

- [ ] **Step 2: Landing page check**

  Run: `curl -s https://graderjet.vercel.app/ | grep -o GraderJet | head -1`
  Expected: `GraderJet`.

- [ ] **Step 3: Real-model grading check**

  ```bash
  curl -s -X POST https://graderjet.vercel.app/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"Raise thesis"}]}]}' \
    --max-time 60 | head -c 600
  ```
  Expected: `data: {"type":"start"}` followed by text/tool events; **no** `"type":"error"` event. (With Task 1 deployed, any failure now names itself — e.g. `Grading failed: ... requires more credits`.)

- [ ] **Step 4: Full real-model UI smoke test**

  ```bash
  BASE_URL=https://graderjet.vercel.app REAL_MODEL=1 node scripts/verify-flow.mjs
  ```
  Expected: 8/8 checks pass, no browser console/page errors.

- [ ] **Step 5: Confirm nightly smoke still green (next morning)**

  Check: `.github/workflows/nightly-smoke.yml` run on `main` at 03:00 UTC — success.

---

### Task 6 (Decision gate): Launch scope — the no-auth caveat

**Files:** optionally `README.md`.

**Why:** the app has no authentication or multi-tenant isolation: grading sessions are stored in `localStorage`, and anyone with the URL can grade (and burn OpenRouter credits). This is fine for a personal/internal tool; it is not fine if the site is shared publicly or advertised.

- [ ] **Step 1: Decide** — one of:
  - **A. Launch as-is (personal tool):** document the limitation. Add a "Known limitations" note to `README.md` ("no accounts; sessions live in the browser; anyone with the URL can use the grader").
  - **B. Gate launch:** do not promote the URL; keep it invite-only until auth (Better Auth or similar) lands as a separate feature plan.
  - **C. Public launch:** requires a new plan for auth + rate limiting + spending caps (OpenRouter credits are per-key, not per-user) — out of scope here.

- [ ] **Step 2: If A — commit the README note**

  ```bash
  git add README.md
  git commit -m "docs: note no-auth limitation for launch scope"
  ```

### Task 7 (added during execution): Local persistence + shareable session export/import

**Status:** implemented in this session — unit tests green (7 new tests), UI wired.

**Files:**
- Create: `lib/session-export.ts` (+ `lib/session-export.test.ts`)
- Modify: `hooks/use-grading-workspace.ts`, `app/workspace/page.tsx`, `app/setup/page.tsx`, `components/top-nav.tsx`, `package.json` (test glob)
- Add: `e2e/session-export.spec.ts`

**What it does:**
1. **Stored locally:** the workspace state (scores, highlights, teacher notes, batch curve, agent conversation) is persisted to `localStorage` (`graderjet.workspace.v1.<sessionId>`) on every change and restored on reload — a refresh no longer loses grades.
2. **Exportable:** the top-nav Export dialog gains "Download session file" — a versioned, validated JSON pack (`{ app, version, exportedAt, session, workspace }`) containing inputs + graded state + conversation.
3. **Reopenable:** the setup page gains "Open session file" — parses, validates, restores the session + workspace state, and navigates into the workspace.

**Verification:** `npm test` (84 pass), manual round-trip via `e2e/session-export.spec.ts` (pending run). The parse/validate functions are unit-tested (7 tests: round-trip, malformed JSON, wrong app, missing fields, unsupported version, workspace-less sessions).

---

## Self-Review

- **Spec coverage:** Task 0 fixes the live production failure (the launch blocker); Task 1 makes future provider failures diagnosable and removes duplicated code; Task 2 commits finished tests and ignores local config; Task 3 unblocks the broken dev machine (root cause of all local hangs); Task 4 re-verifies everything locally including the new e2e specs; Task 5 verifies the live site end-to-end; Task 6 resolves the one product caveat (no auth) surfaced in the launch assessment. No spec requirement is missing a task.
- **Placeholder scan:** no TBDs — every code step contains full code or exact commands; the only human steps are account actions (credits, deletions) which are explicitly labeled and can't be automated.
- **Type consistency:** `buildSystemPrompt(categories: RubricCategory[])` and `RubricCategory` are defined once in Task 1 Step 3 and used identically in Step 5 and the test in Step 1. `onError` signature matches AI SDK v7 (`({ error }) => string`). The glob test script matches all existing `lib/**/*.test.ts` files.