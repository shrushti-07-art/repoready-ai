# RepoReady AI 🔍

> **AI-powered Code Repository Readiness Auditor** — Know if your project is ready for submission before reviewers do.

[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org)
[![IBM Granite](https://img.shields.io/badge/IBM-Granite%203%208B-purple)](https://www.ibm.com/products/watsonx-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

RepoReady AI analyzes a software project's documentation completeness and produces a **transparent readiness score out of 100** with severity-ranked findings, evidence citations, and concrete fixes — powered by IBM Granite via watsonx.ai.

---

## Demo

Paste your project's **file tree** + **README.md** → get a score in seconds.

![Demo screenshot placeholder](docs/screenshot.png)

**Try it live:** `http://localhost:5173` (after setup below)

---

## Features

- **Readiness score (0–100)** with letter grade across 7 categories
- **6 deterministic check categories:** Setup Instructions, Dependencies, Feature Claims, Testing, Configuration, Security
- **IBM Granite AI analysis** (7th category) via `ibm/granite-3-8b-instruct` on watsonx.ai
- **Clearly labelled Demo Mode** when watsonx.ai credentials are not configured — no silent fallback
- **Severity-ranked findings** (Critical / Warning / Info) with evidence snippets and fix recommendations
- **Copyable action checklist** and **downloadable Markdown audit report**
- **No GitHub auth, no database, no repo cloning required** — paste and go

---

## Architecture

```
repoready-ai/
├── server/
│   ├── index.ts        # Express API server (port 3001)
│   ├── auditor.ts      # Deterministic rule engine (6 categories, ~20 checks)
│   └── granite.ts      # IBM Granite / watsonx.ai integration + demo fallback
├── src/
│   ├── App.tsx         # React frontend (single page)
│   ├── types.ts        # Shared TypeScript types (client + server)
│   ├── demoData.ts     # Pre-loaded demo project
│   └── index.css       # Dark-mode UI styles
├── .env.example        # Environment variable template
├── vite.config.ts      # Vite dev server + /api proxy to port 3001
└── tsconfig.server.json
```

**Request flow:**
```
Browser → Vite (5173) → /api proxy → Express (3001)
                                        ├── runDeterministicAudit()   [always]
                                        └── analyzeWithGranite()       [live or demo]
                                              └── watsonx.ai API → ibm/granite-3-8b-instruct
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** — `node --version`
- **npm 9+** — `npm --version`

### Installation

```bash
git clone https://github.com/your-username/repoready-ai.git
cd repoready-ai
npm install
```

### Configuration

Copy the environment template:

```bash
cp .env.example .env
```

Edit `.env` and fill in your IBM watsonx.ai credentials (**optional** — app runs in demo mode without them):

```env
WATSONX_API_KEY=your_ibm_cloud_api_key
WATSONX_PROJECT_ID=your_watsonx_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
```

**How to get credentials:**
1. Create a free IBM Cloud account at [cloud.ibm.com](https://cloud.ibm.com)
2. Provision a **watsonx.ai** service instance
3. Create an **API key** under Manage → Access (IAM) → API keys
4. Copy your **Project ID** from the watsonx.ai project settings

> ⚠️ Without credentials, the app runs in **Demo Mode** — all deterministic checks run normally, and the AI analysis slot shows clearly labelled demo findings instead of live Granite output.

### Running (Development)

```bash
# Start both frontend and backend together
npm run dev

# Or separately:
npm run dev:server   # Express on http://localhost:3001
npm run dev:client   # Vite on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

### Running (Production)

```bash
npm run build        # Compiles server TypeScript + builds React bundle
NODE_ENV=production node dist/server/index.js
```

The production server serves the React app and the API from a single port (3001 by default).

---

## Usage

1. Open `http://localhost:5173`
2. Click **"Load Demo Project"** to pre-fill a sample poorly-documented project, or paste your own:
   - **File Tree** — the directory structure (use `tree` or `find` output)
   - **README.md** — paste the full README content
   - **Extra Files** (optional) — JSON object with file contents, e.g. `{ "package.json": "..." }`
3. Click **"Run Audit"**
4. Review the score, category breakdown, and findings
5. Use the **Action Checklist** to prioritize fixes
6. Download the **Markdown report** to track progress

---

## Testing

```bash
# TypeScript type checks
npm run typecheck

# Manual API test (requires server running on 3001)
curl -X POST http://localhost:3001/api/audit \
  -H "Content-Type: application/json" \
  -d '{"file_tree":"proj/\n├── README.md","readme":"# Hello\n\n## Installation\nnpm install","extra_files":{}}'
```

---

## Scoring Methodology

| Category | Max Points | What's Checked |
|----------|-----------|----------------|
| Setup Instructions | 20 | Install steps, usage/run commands, Dockerfile docs, dependency manifest |
| Dependencies | 10 | Version pinning, lockfiles, runtime version declaration |
| Feature Claims & Docs | 10 | Evidence for claims, license, contributing guide |
| Testing | 20 | Test files present, test docs in README, CI/CD config |
| Configuration | 15 | .env.example, config documentation |
| Security | 15 | .gitignore, hardcoded credentials, security policy |
| AI Analysis | 10 | IBM Granite qualitative review (demo fallback if unconfigured) |
| **Total** | **100** | |

Scores are **deterministic and transparent** — every deduction is traced to a specific finding with evidence.

---

## IBM Granite Integration

When `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` are set:

1. Server fetches an IAM bearer token from `iam.cloud.ibm.com`
2. Sends a structured prompt to `ibm/granite-3-8b-instruct` via the watsonx.ai generation API
3. Parses the JSON response into 2–5 qualitative findings
4. Adds a score contribution (0–10) to the AI Analysis category
5. Labels results as **"IBM Granite Live"** in the UI header

When credentials are absent or invalid, the server logs the reason and falls back to rule-based demo findings — clearly labelled in both the API response (`demo_mode: true`) and the UI.

---

## License

MIT — see [LICENSE](LICENSE)

---

## Contributing

Pull requests welcome. Please open an issue first to discuss significant changes.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-change`
3. Commit changes: `git commit -m "feat: description"`
4. Push and open a PR
