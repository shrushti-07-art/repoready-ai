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
  if (grade === 'C') return '#eab308'
  if (grade === 'D') return '#f97316'
  return '#ef4444'
}

function severityColor(s: string) {
  if (s === 'critical') return '#ef4444'
  if (s === 'warning') return '#eab308'
  return '#6366f1'
}

function severityBg(s: string) {
  if (s === 'critical') return 'rgba(239,68,68,0.1)'
  if (s === 'warning') return 'rgba(234,179,8,0.1)'
  return 'rgba(99,102,241,0.1)'
}

function categoryLabel(cat: string) {
  const m: Record<string, string> = {
    setup_instructions: 'Setup Instructions',
    dependencies: 'Dependencies',
    feature_claims: 'Feature Claims & Docs',
    testing: 'Testing',
    configuration: 'Configuration',
    security: 'Security',
    ai_analysis: 'AI Analysis',
  }
  return m[cat] || cat
}

function generateMarkdownReport(result: AuditResult): string {
  const lines: string[] = [
    `# RepoReady AI — Audit Report`,
    ``,
    `**Score:** ${result.score}/${result.max_score} (${result.grade})`,
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
    lines.push(`**Category:** ${categoryLabel(f.category)}`)
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
  for (const f of result.findings.filter(f => f.severity !== 'info')) {
    lines.push(`- [ ] ${f.recommendation}`)
  }
  for (const f of result.findings.filter(f => f.severity === 'info')) {
    lines.push(`- [ ] ${f.recommendation}`)
  }
  return lines.join('\n')
}

// ─── Components ───────────────────────────────────────────────────────────────

function Header({ demoMode }: { demoMode: boolean | null }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'var(--surface)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#6366f1" />
          <path d="M8 10h10M8 16h8M8 22h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="22" r="4" fill="none" stroke="white" strokeWidth="2" />
          <path d="M27 25l3 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>RepoReady AI</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Repository Readiness Auditor</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {demoMode === true && (
          <span style={{
            background: 'rgba(234,179,8,0.15)',
            color: '#eab308',
            border: '1px solid rgba(234,179,8,0.3)',
            borderRadius: 20,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 600,
          }}>⚠ Demo Mode</span>
        )}
        {demoMode === false && (
          <span style={{
            background: 'rgba(34,197,94,0.15)',
            color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 20,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 600,
          }}>✓ IBM Granite Live</span>
        )}
        <a
          href="https://github.com"
          style={{
            color: 'var(--muted)',
            fontSize: 12,
            border: '1px solid var(--border)',
            padding: '4px 12px',
            borderRadius: 20,
          }}
        >GitHub</a>
      </div>
    </header>
  )
}

function ScoreRing({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100)
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F'
  const color = gradeColor(grade)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="70" y="64" textAnchor="middle" fill={color} fontSize="28" fontWeight="700" fontFamily="system-ui">{pct}</text>
        <text x="70" y="82" textAnchor="middle" fill="var(--muted)" fontSize="13" fontFamily="system-ui">/ 100</text>
      </svg>
      <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.5px' }}>Grade: {grade}</div>
    </div>
  )
}

function CategoryBar({ cs }: { cs: CategoryScore }) {
  const pct = cs.max > 0 ? (cs.earned / cs.max) * 100 : 0
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
        <span>{cs.label}</span>
        <span style={{ color: 'var(--muted)' }}>{cs.earned}/{cs.max} {cs.findings_count > 0 && `(${cs.findings_count} issues)`}</span>
      </div>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false)
  const color = severityColor(finding.severity)
  const bg = severityBg(finding.severity)

  return (
    <div style={{
      border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 'var(--radius)',
      background: bg,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          background: 'transparent',
          borderRadius: 0,
          textAlign: 'left',
          color: 'var(--text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            background: color,
            color: '#fff',
            padding: '2px 7px',
            borderRadius: 3,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}>{finding.severity}</span>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{finding.title}</span>
          {finding.category === 'ai_analysis' && (
            <span style={{ fontSize: 10, color: '#6366f1', background: 'rgba(99,102,241,0.15)', padding: '1px 7px', borderRadius: 10, flexShrink: 0 }}>IBM Granite</span>
          )}
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 18, marginLeft: 8 }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 14px', fontSize: 14, lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 8px', color: 'var(--text)' }}>{finding.description}</p>
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '8px 12px', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>Evidence: </span>
            <span style={{ fontFamily: 'monospace' }}>{finding.evidence}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }}>→</span>
            <span style={{ color: '#22c55e' }}>{finding.recommendation}</span>
          </div>
          {finding.points_deducted > 0 && (
            <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 12 }}>
              −{finding.points_deducted} point{finding.points_deducted !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ActionChecklist({ findings }: { findings: Finding[] }) {
  const [copied, setCopied] = useState(false)
  const actionable = findings.filter(f => f.severity === 'critical' || f.severity === 'warning')
  const info = findings.filter(f => f.severity === 'info')

  const text = [
    '## Action Checklist',
    '',
    ...actionable.map(f => `- [ ] [${f.severity.toUpperCase()}] ${f.recommendation}`),
    '',
    ...info.map(f => `- [ ] [INFO] ${f.recommendation}`),
  ].join('\n')

  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Action Checklist</h3>
        <button onClick={copy} style={{ background: 'var(--surface2)', color: 'var(--text)', padding: '6px 14px', fontSize: 13 }}>
          {copied ? '✓ Copied!' : '⎘ Copy'}
        </button>
      </div>
      <div style={{ fontSize: 14 }}>
        {actionable.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{
              fontSize: 10, fontWeight: 700, background: severityColor(f.severity), color: '#fff',
              padding: '2px 6px', borderRadius: 3, alignSelf: 'flex-start', marginTop: 3, flexShrink: 0
            }}>{f.severity}</span>
            <span>{f.recommendation}</span>
          </div>
        ))}
        {info.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)', opacity: 0.8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#6366f1', color: '#fff', padding: '2px 6px', borderRadius: 3, alignSelf: 'flex-start', marginTop: 3, flexShrink: 0 }}>info</span>
            <span>{f.recommendation}</span>
          </div>
        ))}
      </div>
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
      try {
        parsedExtra = JSON.parse(extraFiles)
      } catch {
        setError('Extra files must be valid JSON: { "filename": "content" }')
        setLoading(false)
        return
      }
    }

    try {
      const data = await runAudit({ file_tree: fileTree, readme, extra_files: parsedExtra })
      setResult(data)
      // scroll to results
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
    a.href = url
    a.download = 'repoready-audit.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [result])

  const filteredFindings = result
    ? severityFilter === 'all'
      ? result.findings
      : result.findings.filter(f => f.severity === severityFilter)
    : []

  const criticalCount = result?.findings.filter(f => f.severity === 'critical').length || 0
  const warningCount = result?.findings.filter(f => f.severity === 'warning').length || 0
  const infoCount = result?.findings.filter(f => f.severity === 'info').length || 0

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header demoMode={result ? result.demo_mode : null} />

      <main style={{ maxWidth: 900, margin: '0 auto', width: '100%', padding: '32px 20px', flex: 1 }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-1px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Is your repo ready?
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 540, margin: '0 auto 20px' }}>
            Paste your project's file tree and README to get an AI-powered readiness score with actionable fixes.
          </p>
          <button onClick={loadDemo} style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 14 }}>
            Load Demo Project
          </button>
        </div>

        {/* Input Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              File Tree *
            </label>
            <textarea
              value={fileTree}
              onChange={e => setFileTree(e.target.value)}
              placeholder={"my-project/\n├── src/\n│   ├── index.js\n│   └── app.js\n├── package.json\n└── README.md"}
              style={{ height: 220 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              README.md *
            </label>
            <textarea
              value={readme}
              onChange={e => setReadme(e.target.value)}
              placeholder={"# My Project\n\nPaste your README.md content here..."}
              style={{ height: 220 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Extra Files (Optional) — JSON object: {"{ \"package.json\": \"...content...\" }"}
          </label>
          <textarea
            value={extraFiles}
            onChange={e => setExtraFiles(e.target.value)}
            placeholder={'{\n  "package.json": "{ \\"dependencies\\": {...} }",\n  "requirements.txt": "flask==2.3.0"\n}'}
            style={{ height: 120 }}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, color: '#fca5a5', fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <button
            onClick={handleAudit}
            disabled={loading}
            style={{
              background: loading ? 'var(--surface2)' : '#6366f1',
              color: 'white',
              padding: '14px 40px',
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 'var(--radius)',
              minWidth: 200,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                  <path d="M9 2a7 7 0 0 1 7 7" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Analyzing...
              </>
            ) : '🔍 Run Audit'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div id="results">
            {/* Score Banner */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 28,
              marginBottom: 24,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 28,
              alignItems: 'center',
            }}>
              <ScoreRing score={result.score} max={result.max_score} />
              <div>
                <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 15 }}>{result.summary}</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>
                    {criticalCount} Critical
                  </span>
                  <span style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>
                    {warningCount} Warning
                  </span>
                  <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>
                    {infoCount} Info
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={downloadReport}
                    style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 13, padding: '8px 16px' }}
                  >
                    ↓ Download Report
                  </button>
                  <button
                    onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', fontSize: 13, padding: '8px 16px' }}
                  >
                    ← New Audit
                  </button>
                </div>
              </div>
            </div>

            {/* Category Scores */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Category Breakdown</h3>
              {result.category_scores.map(cs => <CategoryBar key={cs.category} cs={cs} />)}
            </div>

            {/* Findings */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  Findings <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({filteredFindings.length})</span>
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['all', 'critical', 'warning', 'info'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        background: severityFilter === s ? (s === 'all' ? '#6366f1' : severityColor(s)) : 'var(--surface2)',
                        color: severityFilter === s ? '#fff' : 'var(--muted)',
                        border: '1px solid var(--border)',
                        borderRadius: 20,
                        fontWeight: 500,
                        textTransform: 'capitalize',
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>
              {filteredFindings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  No findings for this filter. 🎉
                </div>
              ) : (
                filteredFindings.map(f => <FindingCard key={f.id} finding={f} />)
              )}
            </div>

            {/* Action Checklist */}
            <ActionChecklist findings={result.findings} />

            {/* AI Attribution */}
            <div style={{ marginTop: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              {result.demo_mode ? (
                <span>⚠ Demo mode active — add <code>WATSONX_API_KEY</code> and <code>WATSONX_PROJECT_ID</code> to .env for live IBM Granite analysis</span>
              ) : (
                <span>✓ Analyzed by <strong>IBM Granite</strong> via watsonx.ai — model: <code>{result.ai_model}</code></span>
              )}
            </div>
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        RepoReady AI — Built for IBM watsonx Hackathon &nbsp;·&nbsp; Powered by IBM Granite &nbsp;·&nbsp;{' '}
        <a href="https://github.com">View Source</a>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
