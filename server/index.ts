import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { runDeterministicAudit } from './auditor';
import { analyzeWithGranite } from './granite';
import { AuditResult, CategoryScore } from '../src/types';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

// ─── Request Schema ───────────────────────────────────────────────────────────

const AuditRequestSchema = z.object({
  file_tree: z.string().min(1, 'file_tree is required').max(50000),
  readme: z.string().min(1, 'readme is required').max(100000),
  extra_files: z.record(z.string()).optional().default({}),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    watsonx_configured: !!(process.env.WATSONX_API_KEY && process.env.WATSONX_PROJECT_ID),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/audit', async (req, res) => {
  try {
    const parsed = AuditRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
      });
    }

    const input = {
      file_tree: parsed.data.file_tree,
      readme: parsed.data.readme,
      extra_files: parsed.data.extra_files,
    };

    // Run deterministic checks
    const deterministicResult = runDeterministicAudit(input);

    // Run AI analysis (demo or live)
    const graniteResult = await analyzeWithGranite(input);

    // Merge findings
    const allFindings = [...deterministicResult.findings, ...graniteResult.findings];

    // Update AI category score
    const updatedCategoryScores: CategoryScore[] = deterministicResult.category_scores.map((cs) => {
      if (cs.category === 'ai_analysis') {
        return {
          ...cs,
          earned: graniteResult.ai_score_contribution,
          findings_count: graniteResult.findings.length,
        };
      }
      return cs;
    });

    const totalScore =
      updatedCategoryScores.reduce((sum, cs) => sum + cs.earned, 0);
    const maxScore = updatedCategoryScores.reduce((sum, cs) => sum + cs.max, 0);

    const grade = getGrade(totalScore, maxScore);
    const summary = buildSummary(totalScore, maxScore, allFindings.length, graniteResult.demo_mode);

    const result: AuditResult = {
      score: totalScore,
      max_score: maxScore,
      grade,
      summary,
      findings: allFindings,
      category_scores: updatedCategoryScores,
      ai_powered: !graniteResult.demo_mode,
      ai_model: graniteResult.model,
      demo_mode: graniteResult.demo_mode,
      timestamp: new Date().toISOString(),
    };

    return res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[audit] Unhandled error:', message);
    return res.status(500).json({ success: false, error: message });
  }
});

// ─── Serve Frontend in Production ────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  // __dirname at runtime = dist/server  →  dist/server/../client = dist/client
  const clientDist = path.join(__dirname, '..', 'client');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGrade(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

function buildSummary(score: number, max: number, findingsCount: number, demoMode: boolean): string {
  const pct = Math.round((score / max) * 100);
  const mode = demoMode ? ' (Demo mode — add watsonx.ai credentials for live AI analysis)' : ' (Powered by IBM Granite)';
  if (pct >= 85) return `Excellent! Your repository scores ${pct}% and is well-documented.${mode}`;
  if (pct >= 70) return `Good. Your repository scores ${pct}% with ${findingsCount} issues to address.${mode}`;
  if (pct >= 50) return `Needs work. Your repository scores ${pct}% — ${findingsCount} issues found.${mode}`;
  return `Not ready. Your repository scores ${pct}%. Address the ${findingsCount} findings before submission.${mode}`;
}

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 RepoReady AI server running on http://localhost:${PORT}`);
  console.log(
    `   IBM watsonx.ai: ${process.env.WATSONX_API_KEY ? '✅ configured' : '⚠️  not configured (demo mode)'}`
  );
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
