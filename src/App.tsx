import { useState, useCallback } from 'react'
import { AuditResult, AuditRequest, Finding, CategoryScore } from './types'
import { DEMO_FILE_TREE, DEMO_README, DEMO_PACKAGE_JSON } from './demoData'

// ─── API ──────────────────────────────────────────────────────────────────────

async function runAudit(payload: AuditRequest): Promise<AuditResult> {
  const res = await fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Audit failed')
  return json.data as AuditResult
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradeColor(grade: string) {
  if (grade === 'A') return '#22c55e'
  if (grade === 'B') return '#84cc16'
  if (grade === 'C') return '#f59e0b'
  if (grade === 'D') return '#f97316'
  return '#ef4444'
}

function severityChipColor(s: string) {
  if (s === 'critical') return '#ef4444'
  if (s === 'warning') return '#f59e0b'
  return '#6366f1'
}

function severityCardStyle(s: string): React.CSSProperties {
  const colors: Record<string, { border: string; bg: string }> = {
    critical: { border: 'rgba(239,68,68,0.28)', bg: 'rgba(239,68,68,0.06)' },
    warning:  { border: 'rgba(245,158,11,0.28)', bg: 'rgba(245,158,11,0.06)' },
    info:     { border: 'rgba(99,102,241,0.28)', bg: 'rgba(99,102,241,0.06)' },
  }
  const c = colors[s] || colors.info
  return {
    border: `1px solid ${c.border}`,
    borderLeft: `3px solid ${severityChipColor(s)}`,
    background: c.bg,
  }
}

function catBarColor(pct: number) {
  if (pct >= 80) return '#22c55e'
  if (pct >= 50) return '#f59e0b'
  return '#ef4444'
}

function generateMarkdownReport(result: AuditResult): string {
  const lines: string[] = [
    `# RepoReady AI — Audit Report`,
    ``,
    `**Score:** ${result.score}/${result.max_score} (Grade ${result.grade})`,
    `**Date:** ${new Date(result.timestamp).toLocaleString()}`,
    `**AI Model:** ${result.ai_model || 'N/A'} ${result.demo_mode ? '(Demo Mode)' : ''}`,
    ``,
    `## Summary`,
    ``,
    result.summary,
    ``,
    `## Category Scores`,
    ``,
    `| Category | Score | Max |`,
    `|----------|-------|-----|`,
    ...result.category_scores.map(cs => `| ${cs.label} | ${cs.earned} | ${cs.max} |`),
    ``,
    `## Findings`,
    ``,
  ]
  for (const f of result.findings) {
    lines.push(`### [${f.severity.toUpperCase()}] ${f.title}`)
    lines.push(``)
    lines.push(`**Category:** ${f.category}`)
    lines.push(``)
    lines.push(f.description)
    lines.push(``)
    lines.push(`**Evidence:** ${f.evidence}`)
    lines.push(``)
    lines.push(`**Recommendation:** ${f.recommendation}`)
    lines.push(``)
    lines.push(`---`)
    lines.push(``)
  }
  lines.push(`## Action Checklist`)
  lines.push(``)
  for (const f of result.findings) {
    lines.push(`- [ ] [${f.severity.toUpperCase()}] ${f.recommendation}`)
  }
  return lines.join('\n')
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L3 5v5c0 4.1 3 7.9 7 9 4-1.1 7-4.9 7-9V5l-7-3z" stroke="#818cf8" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      <path d="M7 10l2 2 4-4" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconScore() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="#818cf8" strokeWidth="1.5"/>
      <path d="M10 6v4l2.5 2.5" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconFix() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 10h12M10 4l6 6-6 6" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function LogoIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="8" fill="url(#lg)"/>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1"/>
          <stop offset="1" stopColor="#4f46e5"/>
        </linearGradient>
      </defs>
      <path d="M7 9h10M7 15h8M7 21h11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="22" cy="21" r="3.5" fill="none" stroke="white" strokeWidth="1.8"/>
      <path d="M24.5 23.5l2.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

// Lightweight inline illustration for hero
function HeroIllustration() {
  return (
    <svg width="220" height="130" viewBox="0 0 220 130" fill="none" style={{ display: 'block', margin: '0 auto 28px', opacity: 0.9 }}>
      {/* Repo card */}
      <rect x="10" y="20" width="120" height="90" rx="10" fill="#0e1525" stroke="#243050" strokeWidth="1.5"/>
      <rect x="22" y="34" width="60" height="7" rx="3" fill="#2e3d5c"/>
      <rect x="22" y="47" width="80" height="5" rx="2.5" fill="#1c2740"/>
      <rect x="22" y="58" width="70" height="5" rx="2.5" fill="#1c2740"/>
      <rect x="22" y="69" width="50" height="5" rx="2.5" fill="#1c2740"/>
      <rect x="22" y="80" width="65" height="5" rx="2.5" fill="#1c2740"/>
      {/* Check marks */}
      <circle cx="110" cy="47" r="6" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="1.2"/>
      <path d="M107 47l2 2 4-4" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="110" cy="63" r="6" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.2"/>
      <path d="M110 60v4" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="110" cy="79" r="6" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1.2"/>
      <path d="M108 77l4 4M112 77l-4 4" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Score badge */}
      <rect x="148" y="30" width="62" height="70" rx="10" fill="#0e1525" stroke="#6366f1" strokeWidth="1.5"/>
      <text x="179" y="65" textAnchor="middle" fill="#818cf8" fontSize="22" fontWeight="800" fontFamily="system-ui">74</text>
      <text x="179" y="80" textAnchor="middle" fill="#7a86a8" fontSize="9" fontFamily="system-ui">/100</text>
      <rect x="160" y="86" width="38" height="6" rx="3" fill="#22c55e" opacity="0.5"/>
      {/* Arrow */}
      <path d="M134 65h10" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M140 61l5 4-5 4" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100)
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F'
  const color = gradeColor(grade)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width="148" height="148" viewBox="0 0 148 148">
        <circle cx="74" cy="74" r={r} fill="none" stroke="#1c2740" strokeWidth="13"/>
        <circle cx="74" cy="74" r={r} fill="none" stroke={color} strokeWidth="13"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 74 74)"
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }}
        />
        <text x="74" y="69" textAnchor="middle" fill={color} fontSize="30" fontWeight="800" fontFamily="system-ui">{pct}</text>
        <text x="74" y="86" textAnchor="middle" fill="#7a86a8" fontSize="12" fontFamily="system-ui">out of 100</text>
      </svg>
      <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.5px' }}>Grade {grade}</div>
    </div>
  )
}

function CategoryBar({ cs }: { cs: CategoryScore }) {
  const pct = cs.max > 0 ? (cs.earned / cs.max) * 100 : 0
  return (
    <div className="cat-row">
      <div className="cat-meta">
        <span className="cat-name">{cs.label}</span>
        <span className="cat-score">{cs.earned}/{cs.max}{cs.findings_count > 0 ? ` · ${cs.findings_count} issue${cs.findings_count !== 1 ? 's' : ''}` : ''}</span>
      </div>
      <div className="cat-bar-bg">
        <div className="cat-bar-fill" style={{ width: `${pct}%`, background: catBarColor(pct) }}/>
      </div>
    </div>
  )
}

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false)
  const chipBg = severityChipColor(finding.severity)
  const cardStyle = severityCardStyle(finding.severity)

  return (
    <div className="finding-card" style={cardStyle}>
      <button className="finding-toggle" onClick={() => setOpen(!open)}>
        <div className="finding-left">
          <span className="sev-chip" style={{ background: chipBg }}>{finding.severity}</span>
          <span className="finding-title">{finding.title}</span>
          {finding.category === 'ai_analysis' && <span className="ai-chip">IBM Granite</span>}
        </div>
        <span className="chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="finding-body">
          <p className="finding-desc">{finding.description}</p>
          <div className="finding-evidence">
            <span className="finding-evidence-label">Evidence:</span>
            <code>{finding.evidence}</code>
          </div>
          <div className="finding-fix">
            <span className="finding-fix-arrow">→</span>
            <span className="finding-fix-text">{finding.recommendation}</span>
          </div>
          {finding.points_deducted > 0 && (
            <div className="finding-pts">−{finding.points_deducted} point{finding.points_deducted !== 1 ? 's' : ''}</div>
          )}
        </div>
      )}
    </div>
  )
}

function ActionChecklist({ findings }: { findings: Finding[] }) {
  const [copied, setCopied] = useState(false)
  const ordered = [
    ...findings.filter(f => f.severity === 'critical'),
    ...findings.filter(f => f.severity === 'warning'),
    ...findings.filter(f => f.severity === 'info'),
  ]
  const text = ordered.map(f => `- [ ] [${f.severity.toUpperCase()}] ${f.recommendation}`).join('\n')
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="panel-title" style={{ margin: 0 }}>Action Checklist</h3>
        <button className="btn-secondary" onClick={copy} style={{ padding: '6px 14px', fontSize: 13 }}>
          {copied ? '✓ Copied!' : '⎘ Copy Checklist'}
        </button>
      </div>
      {ordered.map((f, i) => (
        <div key={i} className="checklist-item">
          <span className="sev-chip" style={{ background: severityChipColor(f.severity), marginTop: 3, flexShrink: 0 }}>{f.severity}</span>
          <span className="checklist-rec">{f.recommendation}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [fileTree, setFileTree] = useState('')
  const [readme, setReadme] = useState('')
  const [extraFiles, setExtraFiles] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const loadDemo = useCallback(() => {
    setFileTree(DEMO_FILE_TREE)
    setReadme(DEMO_README)
    setExtraFiles(JSON.stringify({ 'package.json': DEMO_PACKAGE_JSON }, null, 2))
    setResult(null)
    setError(null)
  }, [])

  const handleAudit = useCallback(async () => {
    if (!fileTree.trim() || !readme.trim()) {
      setError('Please provide both a file tree and a README.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    let parsedExtra: Record<string, string> = {}
    if (extraFiles.trim()) {
      try { parsedExtra = JSON.parse(extraFiles) }
      catch {
        setError('Extra files must be valid JSON: { "filename": "content" }')
        setLoading(false)
        return
      }
    }
    try {
      const data = await runAudit({ file_tree: fileTree, readme, extra_files: parsedExtra })
      setResult(data)
      setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Audit failed. Is the server running?')
    } finally {
      setLoading(false)
    }
  }, [fileTree, readme, extraFiles])

  const downloadReport = useCallback(() => {
    if (!result) return
    const md = generateMarkdownReport(result)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'repoready-audit.md'; a.click()
    URL.revokeObjectURL(url)
  }, [result])

  const filteredFindings = result
    ? severityFilter === 'all' ? result.findings : result.findings.filter(f => f.severity === severityFilter)
    : []

  const criticalCount = result?.findings.filter(f => f.severity === 'critical').length ?? 0
  const warningCount  = result?.findings.filter(f => f.severity === 'warning').length ?? 0
  const infoCount     = result?.findings.filter(f => f.severity === 'info').length ?? 0

  return (
    <div className="app-shell">

      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-brand">
          <LogoIcon />
          <div>
            <div className="brand-name">RepoReady AI</div>
            <div className="brand-sub">Repository Readiness Auditor</div>
          </div>
        </div>
        <div className="topbar-right">
          {result?.demo_mode === true  && <span className="badge-pill badge-demo">⚠ Demo Mode</span>}
          {result?.demo_mode === false && <span className="badge-pill badge-live">✓ IBM Granite Live</span>}
          <a href="https://github.com" className="badge-pill badge-github">GitHub</a>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="hero">
          <div className="hero-eyebrow">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="#818cf8" strokeWidth="1.4"/>
              <path d="M6 4v3" stroke="#818cf8" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="6" cy="9" r="0.6" fill="#818cf8"/>
            </svg>
            Powered by IBM Granite via watsonx.ai
          </div>
          <h1>Ship Your Project<br/>With Confidence</h1>
          <p className="hero-sub">
            Paste your file tree and README — get a transparent readiness score with AI-powered findings, severity badges, and concrete fixes in seconds.
          </p>
          <HeroIllustration />
          <div className="hero-actions">
            <button className="btn-primary" onClick={handleAudit} disabled={loading || (!fileTree && !readme)}>
              {loading
                ? <><span className="spin" style={{ display: 'inline-block', marginRight: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/><path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                  </span>Analyzing…</>
                : '🔍 Analyze Project'}
            </button>
            <button className="btn-cta-demo" onClick={loadDemo}>Load Demo Project</button>
          </div>
        </section>

        {/* ── Feature cards ── */}
        <div className="feature-row">
          <div className="feature-card">
            <div className="feature-icon"><IconShield /></div>
            <div>
              <h3>Evidence-Based Checks</h3>
              <p>Every finding cites the exact evidence that triggered it — no guessing, no false positives.</p>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><IconScore /></div>
            <div>
              <h3>Transparent Score</h3>
              <p>A 0–100 readiness score broken into 7 auditable categories with per-deduction traceability.</p>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><IconFix /></div>
            <div>
              <h3>Actionable Fixes</h3>
              <p>Each finding includes a concrete recommendation you can act on immediately.</p>
            </div>
          </div>
        </div>

        {/* ── Input form ── */}
        <div className="form-section">
          <div className="input-grid">
            <div>
              <label className="field-label">File Tree *</label>
              <textarea
                value={fileTree}
                onChange={e => setFileTree(e.target.value)}
                placeholder={"my-project/\n├── src/\n│   ├── index.js\n│   └── app.js\n├── package.json\n└── README.md"}
                style={{ height: 230 }}
              />
              <div className="field-hint">Paste the output of <code>tree</code> or <code>find . -type f</code></div>
            </div>
            <div>
              <label className="field-label">README.md *</label>
              <textarea
                value={readme}
                onChange={e => setReadme(e.target.value)}
                placeholder={"# My Project\n\nPaste the full contents of your README.md here…"}
                style={{ height: 230 }}
              />
              <div className="field-hint">Paste the full Markdown source, not the rendered preview</div>
            </div>
          </div>

          <div className="extra-field">
            <label className="field-label">Extra Files <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
            <textarea
              value={extraFiles}
              onChange={e => setExtraFiles(e.target.value)}
              placeholder={'{\n  "package.json": "{ \\"dependencies\\": { \\"express\\": \\"^4.18\\" } }",\n  "requirements.txt": "flask==2.3.0\\nrequests==2.31.0"\n}'}
              style={{ height: 110 }}
            />
            <div className="field-hint">JSON object mapping filename → file content. Enables deeper dependency and credential checks.</div>
          </div>

          {error && <div className="error-box">⚠ {error}</div>}

          <div className="audit-cta">
            <button className="btn-primary" onClick={handleAudit} disabled={loading}
              style={{ minWidth: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {loading ? (
                <>
                  <span className="spin">
                    <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/><path d="M9 2a7 7 0 0 1 7 7" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                  </span>
                  Analyzing with {result?.demo_mode === false ? 'IBM Granite' : 'AI'}…
                </>
              ) : '🔍 Run Audit'}
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        {result && (
          <div id="results" className="results-section">

            {/* Score banner */}
            <div className="score-banner">
              <ScoreRing score={result.score} max={result.max_score} />
              <div className="score-meta">
                <p className="score-summary">{result.summary}</p>
                <div className="score-tags">
                  <span className="sev-tag sev-critical">{criticalCount} Critical</span>
                  <span className="sev-tag sev-warning">{warningCount} Warning</span>
                  <span className="sev-tag sev-info">{infoCount} Info</span>
                </div>
                <div className="score-actions">
                  <button className="btn-secondary" onClick={downloadReport} style={{ fontSize: 13, padding: '8px 16px' }}>
                    ↓ Download Report
                  </button>
                  <button className="btn-ghost" onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                    ← New Audit
                  </button>
                </div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="panel">
              <h3 className="panel-title">Category Breakdown</h3>
              {result.category_scores.map(cs => <CategoryBar key={cs.category} cs={cs} />)}
            </div>

            {/* Findings */}
            <div>
              <div className="findings-header">
                <h3 className="findings-title">
                  Findings <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({filteredFindings.length})</span>
                </h3>
                <div className="filter-row">
                  {(['all', 'critical', 'warning', 'info'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                      className={`filter-btn ${severityFilter === s ? `active-${s}` : ''}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              {filteredFindings.length === 0
                ? <div className="empty-state">No findings for this filter 🎉</div>
                : filteredFindings.map(f => <FindingCard key={f.id} finding={f} />)
              }
            </div>

            {/* Action checklist */}
            <div style={{ marginTop: 20 }}>
              <ActionChecklist findings={result.findings} />
            </div>

            {/* AI attribution */}
            <div className="ai-attribution">
              {result.demo_mode
                ? <>⚠ Demo mode — add <code>WATSONX_API_KEY</code> + <code>WATSONX_PROJECT_ID</code> to .env for live IBM Granite analysis</>
                : <>✓ AI analysis by <strong>IBM Granite</strong> via watsonx.ai · model: <code>{result.ai_model}</code></>
              }
            </div>
          </div>
        )}

        {/* Trust note */}
        <div className="trust-note">
          🔒 Audits are based on supplied project evidence. Results do not guarantee security or correctness.
        </div>
      </main>

      <footer>
        RepoReady AI · Built for IBM watsonx Hackathon · Powered by IBM Granite ·{' '}
        <a href="https://github.com">View Source</a>
      </footer>
    </div>
  )
}
