# GraderJet — Vercel Deployment

**Production:** https://graderjet.vercel.app

GraderJet is a Next.js 14 (App Router) app deployed on **Vercel**. This runbook
covers how the project is deployed, how to ship new versions, and how to
troubleshoot the build.

## Current state

- Vercel project: `graderjet` (owner: `imredavid64-glitch`'s projects)
- Production alias: `https://graderjet.vercel.app`
- The project is linked locally via `.vercel/project.json` (this file is
  gitignored — it only exists on machines you run `vercel link` on) and is
  connected to `github.com/imredavid64-glitch/graderjet` for git deploys.
- Production has `OPENROUTER_API_KEY` set, so `/api/chat` grades with
  `gpt-4o-mini` via **OpenRouter** (real model, ~$0 for tiny exchanges thanks
  to a 1024-token output cap). The deterministic **mock grading agent** is
  used only on deployments without any API key configured (e.g., a fresh
  local checkout or a preview without env vars).

## Deploying

### From the CLI (what this project uses)

```bash
npm install
vercel --prod --yes     # production deploy of the current directory
```

- `vercel` (no flag) creates a **preview** deployment with its own URL.
- `vercel --prod` deploys to production and updates `graderjet.vercel.app`.
- The CLI reads `.vercel/project.json` to know which project to deploy, so no
  `--token`, `--scope`, or interactive setup is needed on a machine that has
  been linked and authenticated (`vercel whoami` to check).

### From git (enabled)

The repo lives at `https://github.com/imredavid64-glitch/graderjet` and is
connected to this Vercel project (see *Settings → Git* in the dashboard).
Deployments-on-push is **enabled** with `main` as the production branch:

- Pushing to `main` triggers a production deploy (`graderjet.vercel.app`).
- Every pull request gets its own preview deployment, with a bot comment on
  the PR when comments are enabled (`gitComments.onPullRequest`).

This project was first deployed from the CLI; the git connection was added
afterward. Both paths work independently — a `vercel --prod` from a linked
machine deploys the current directory, while git deploys build the pushed
commit. Keep `vercel.json` and `.vercelignore` committed so both paths behave
identically.

### CI & branch protection

- **GitHub Actions** (`.github/workflows/ci.yml`) runs `npm run typecheck`,
  `npm test` (unit tests via Node's built-in runner, no extra deps), and
  `npm run build` on every pull request (Node 24, npm cache).
- **`.github/workflows/nightly-smoke.yml`** runs the real-model smoke test
  against production every day at 03:00 UTC (and on manual `workflow_dispatch`)
  — it loads the live site in Chrome, sends a prompt, and asserts a real,
  non-mock reply with no fail-loud banners. Failing runs upload the screenshot
  and log as artifacts. Note: on private repos, GitHub pauses scheduled
  workflows after 60 days without repository activity.
- **`main` is protected**: the `Typecheck & build` check must pass before
  merging, branches must be up to date (strict mode), and admins are included
  (`enforce_admins`). Force pushes and deletions are blocked.
- Pushes to `main` are what deploy — so CI effectively gates what reaches
  production.

### Config that matters

| File | Purpose |
| --- | --- |
| `vercel.json` | Pins `"framework": "nextjs"`. This is **required**: the project was created with framework preset *Other*, whose output directory logic (`public if it exists, or .`) is incompatible with Next.js and fails the deploy with `No Output Directory named "public" found`. Declaring the framework makes Vercel run `next build` and serve the `.next` output. |
| `.vercelignore` | Excludes `node_modules`, `.next`, `.vercel`, `.git`, `scripts`, and build artifacts from the uploaded files. |
| `.env.example` | Documents the environment variables. |

## Environment variables

All variables are optional because of the mock fallback:

- `OPENROUTER_API_KEY` — when set, `/api/chat` grades with `gpt-4o-mini` via
  **OpenRouter** instead of the scripted mock agent. The key is validated
  against OpenRouter on request; a rejected key makes the route fail loudly
  with a clear error.
- `OPENROUTER_MODEL` — OpenRouter model slug, defaults to `openai/gpt-4o-mini`.
- `OPENAI_API_KEY` — alternative real-model path; when set, grades via OpenAI
  directly (only used if `OPENROUTER_API_KEY` is not set).

Any configured key is validated against its provider before use, and output
is capped at 1024 tokens per reply.

Set them in production with:

```bash
vercel env add OPENROUTER_API_KEY production   # value via stdin: cat key | vercel env add ...
vercel env add OPENAI_API_KEY production
# or add in Vercel Dashboard → graderjet → Settings → Environment Variables
```

Currently set in production: `OPENROUTER_API_KEY`.

After changing env vars, redeploy for the new values to take effect.

## Verifying a deployment

```bash
# Homepage responds and renders the landing page
curl -s https://graderjet.vercel.app/ | grep -o GraderJet | head -1

# Chat route streams an agent reply (real model when a key is configured,
# mock otherwise)
curl -s -X POST https://graderjet.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"Raise thesis"}]}]}'
```

Expect an `text/x-ndjson` SSE stream starting with `data: {"type":"start"}`.

The full end-to-end UI smoke test (`scripts/verify-flow.mjs`) walks the user
journey — landing page → setup (or sample) → workspace — in both modes:

```bash
# Mock mode (needs API keys unset): against a local server or a preview
BASE_URL=http://localhost:3100 node scripts/verify-flow.mjs

# Real-model mode against production
BASE_URL=https://graderjet.vercel.app REAL_MODEL=1 node scripts/verify-flow.mjs
```

## Troubleshooting

**`Error: No Output Directory named "public" found after the Build completed`**
— The project is not configured as a Next.js project. Ensure `vercel.json`
contains `"framework": "nextjs"` (already committed) or set *Framework Preset →
Next.js* in the dashboard's Project Settings.

**`/api/chat` returns 500 with a message about a rejected API key** — the
fail-loud guard: a configured key (`OPENROUTER_API_KEY` / `OPENAI_API_KEY`)
was rejected by its provider (HTTP 401/403). The key is invalid or revoked, or
the account lacks access. Fix or remove the env var and redeploy. While a key
is set the mock agent is intentionally NOT used.

**OpenRouter returns HTTP 402 "requires more credits"** — the account balance
is too low for the requested `max_tokens`. Output is capped at 1024 tokens, so
keep the prompt/output small, or add credits at
https://openrouter.ai/settings/credits. The `/v1/models` guard check itself is
free and will still pass, so a 402 only appears when a chat call is actually
made.

**Build log shows `request to https://fonts.googleapis.com/... failed, reason:
Retrying 1/3...`** — `next/font/google` fetches font CSS at build time. This is
usually a transient network blip; Vercel retries and the build succeeds. A
build that cannot reach `fonts.googleapis.com` at all will hang or fail here —
the same reason local builds need outbound network access to complete.

**Local `next build` hangs at "Creating an optimized production build"** — the
`Inter` font from `next/font/google` is fetched during compilation; if the
machine cannot reach Google Fonts, the build stalls at this step. Run the build
on a network that can reach `fonts.googleapis.com`, or (if offline builds are
required) swap to `next/font/local` with a bundled font file.

**Rolling back** — `vercel rollback` reverts production to the previous ready
deployment. Individual deployments are also promotable/rollback-able in the
dashboard under *Deployments*.
