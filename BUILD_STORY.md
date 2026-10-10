# Build Story — RepoReady AI

*Submitted for the IBM watsonx Hackathon*

---

## The Problem

Every hackathon, conference, and open-source submission has the same silent killer: a project that works beautifully on the author's machine but is undocumented, misconfigured, or inscrutable to everyone else. Reviewers and contributors hit dead ends — missing install steps, undocumented environment variables, claims with no evidence, no tests.

There's no fast, automated way to catch this before you hit submit.

---

## The Solution

**RepoReady AI** is a repository readiness auditor. Paste your project's file tree and README, and within seconds you get:

- A **transparent score out of 100** broken into 7 auditable categories
- **Severity-ranked findings** (Critical / Warning / Info) with the exact evidence that triggered each one
- **Concrete fix recommendations** for every finding
- A **copyable action checklist** and **downloadable Markdown report**
- **IBM Granite AI analysis** that goes beyond rules — reviewing documentation quality, architectural clarity, and onboarding completeness

---

## How It Was Built

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Express 4 + TypeScript + Node.js 20 |
| AI | IBM Granite 3 8B Instruct via watsonx.ai |
| Validation | Zod |
| Build | tsc + Vite |

### Architecture Decision: Two-Layer Analysis

The audit engine runs two layers in every request:

**Layer 1 — Deterministic Rules (`server/auditor.ts`)**
Six categories of regex, keyword, and structural checks that produce fully reproducible results. Every deduction is traceable to a specific rule. This layer always runs and produces the same output for the same input — no AI variability, no hallucinations, no latency.

**Layer 2 — IBM Granite AI (`server/granite.ts`)**
A structured prompt is sent to `ibm/granite-3-8b-instruct` asking for qualitative review: documentation writing quality, architectural clarity, onboarding friction, and risks not caught by rules. The model returns a JSON payload with 2–5 findings and a score contribution (0–10). This layer adds the human-reasoning dimension that rules cannot capture.

**Why separate layers?** Rules are fast, free, and perfectly reproducible. AI is expensive and non-deterministic. Keeping them separate means the core audit always works, the AI layer adds real value on top, and demo mode (no credentials) is honest about what it is.

### IBM Granite Integration

```
POST /api/audit
  → runDeterministicAudit()          [sync, always]
  → analyzeWithGranite()             [async, live or demo]
       ├── GET IAM token             [iam.cloud.ibm.com]
       ├── POST text/generation      [us-south.ml.cloud.ibm.com]
       │     model: ibm/granite-3-8b-instruct
       │     max_new_tokens: 1200
       │     decoding: greedy, temp: 0.2
       └── parse JSON → findings[]
```

The prompt instructs Granite to return structured JSON — not prose. This makes parsing reliable and results actionable rather than descriptive.

**Demo Mode** activates automatically when `WATSONX_API_KEY` or `WATSONX_PROJECT_ID` are missing. Demo findings are rule-based (README length, badge presence, description quality) and clearly labelled in both the API response and the UI. There is no silent fallback — the app never claims live AI results it doesn't have.

### Judging Criteria

| Criterion | Implementation |
|-----------|---------------|
| **Use of IBM Technology** | IBM Granite 3 8B Instruct via watsonx.ai text generation API; IAM token auth; structured JSON prompting |
| **Innovation** | Two-layer audit (deterministic + AI) with transparent per-finding evidence and score attribution |
| **Technical Implementation** | Full-stack TypeScript, Zod validation, production build, graceful demo fallback, downloadable reports |
| **Impact & Usefulness** | Immediately useful for any developer preparing a submission; no auth, no database, no cloning required |
| **Presentation** | Dark-mode UI with score ring, category bars, severity-filtered findings, live AI badge vs demo badge |
| **Completeness** | Working application, production build, documented setup, error handling, MIT license, contributing guide |

---

## What Works (Verified)

- ✅ React frontend loads at `http://localhost:5173`
- ✅ Express backend responds at `http://localhost:3001`
- ✅ Vite proxies `/api` → backend in development
- ✅ Production build compiles (`npm run build`) and serves frontend from `dist/client`
- ✅ Deterministic audit engine: 20+ checks across 6 categories
- ✅ Score arithmetic: per-category floor-clamped at 0, deductions transparent
- ✅ Demo mode AI findings: clearly labelled, rule-based, no credential required
- ✅ Demo project pre-loaded with a deliberately poor README (scores ~18/100)
- ✅ A well-documented project scores proportionally higher (~45–70/100)
- ✅ Downloadable Markdown report
- ✅ Copyable action checklist
- ✅ `api/health` endpoint reports `watsonx_configured` truthfully
- ⚠️ **IBM Granite live mode**: code complete and tested for API shape — requires live `WATSONX_API_KEY` + `WATSONX_PROJECT_ID` to activate (not available during build)

---

## Limitations & Known Issues

- **No GitHub URL ingestion** — file tree and README must be pasted (by design for MVP; avoids auth complexity)
- **Live Granite not verified in this build** — credentials not available during hackathon build; the integration code is complete and the fallback path is tested
- **File tree parsing is text-based** — the auditor reads the tree as a string, not an actual filesystem; very unusual tree formats may miss some checks
- **Single-turn AI prompt** — Granite gets one shot; very large projects may need chunking in a future version

---

## Setup Instructions for Judges

```bash
git clone https://github.com/your-username/repoready-ai.git
cd repoready-ai
npm install

# Option A — Demo mode (no credentials needed)
npm run dev
# Open http://localhost:5173, click "Load Demo Project", click "Run Audit"

# Option B — Live IBM Granite
cp .env.example .env
# Edit .env with your WATSONX_API_KEY and WATSONX_PROJECT_ID
npm run dev
# The header badge changes from "⚠ Demo Mode" to "✓ IBM Granite Live"
```

---

## Future Enhancements

- GitHub URL ingestion (fetch tree + README via GitHub API)
- Per-language rule packs (Python, Go, Rust)
- Historical audit tracking with score trends
- PR comment bot via GitHub Actions
- Badge generation (`![RepoReady](score-badge.svg)`)
