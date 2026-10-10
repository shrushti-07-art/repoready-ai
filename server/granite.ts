import axios from 'axios';
import { Finding } from '../src/types';

interface GraniteInput {
  file_tree: string;
  readme: string;
  extra_files: Record<string, string>;
}

interface GraniteResult {
  findings: Finding[];
  ai_score_contribution: number;
  model: string;
  demo_mode: boolean;
}

// ─── IAM Token Cache ─────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getIAMToken(apiKey: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const response = await axios.post(
    'https://iam.cloud.ibm.com/identity/token',
    new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey: apiKey,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    }
  );

  cachedToken = response.data.access_token as string;
  // expires_in is in seconds; refresh 5 minutes early
  tokenExpiry = now + (response.data.expires_in - 300) * 1000;
  return cachedToken;
}

// ─── Granite Prompt Builder ──────────────────────────────────────────────────

function buildPrompt(input: GraniteInput): string {
  const extraSnippet =
    Object.keys(input.extra_files).length > 0
      ? `\n\n### Extra File Contents\n${Object.entries(input.extra_files)
          .slice(0, 3)
          .map(([name, content]) => `**${name}**:\n\`\`\`\n${content.slice(0, 800)}\n\`\`\``)
          .join('\n\n')}`
      : '';

  return `You are a senior software engineer reviewing a project for submission readiness.

### Project File Tree
\`\`\`
${input.file_tree.slice(0, 1500)}
\`\`\`

### README.md
\`\`\`markdown
${input.readme.slice(0, 3000)}
\`\`\`
${extraSnippet}

Analyze this repository for readiness issues. Focus on:
1. Architectural clarity (is the project structure logical and explained?)
2. Documentation quality (is the README well-written, complete, and accurate?)
3. Code quality signals from the file tree (any red flags like massive files, unclear structure?)
4. Completeness for a real user trying to onboard
5. Any specific risks or improvements not covered by standard checklists

Return ONLY a valid JSON object with this exact structure:
{
  "score_contribution": <integer 0-10>,
  "findings": [
    {
      "title": "<short title>",
      "severity": "<critical|warning|info>",
      "description": "<2-3 sentence explanation>",
      "recommendation": "<concrete fix>",
      "evidence": "<specific text or pattern that led to this finding>"
    }
  ],
  "overall_comment": "<1-2 sentence overall quality assessment>"
}

Produce between 2 and 5 findings. Be specific and actionable. Do not repeat issues already obvious from the file tree structure.`;
}

// ─── Demo Mode Fallback ──────────────────────────────────────────────────────

function buildDemoFindings(input: GraniteInput): GraniteResult {
  const findings: Finding[] = [];
  let score = 7;

  const readme = input.readme.toLowerCase();

  if (readme.length < 300) {
    findings.push({
      id: 'ai_1',
      category: 'ai_analysis',
      severity: 'warning',
      title: 'README is very short (AI observation)',
      description:
        'The README is unusually brief. A complete README should cover purpose, installation, usage, and contributing guidelines and typically runs 200-500+ words.',
      evidence: `README length: ${input.readme.length} characters`,
      recommendation: 'Expand the README to cover all key sections. Use a template like https://www.makeareadme.com/',
      points_deducted: 5,
    });
    score -= 3;
  }

  const hasBadges = /\!\[/i.test(input.readme);
  if (!hasBadges) {
    findings.push({
      id: 'ai_2',
      category: 'ai_analysis',
      severity: 'info',
      title: 'No status badges in README (AI observation)',
      description:
        'Professional open-source projects typically include badges (build status, coverage, license) near the top of the README.',
      evidence: 'No markdown image syntax (![) found',
      recommendation: 'Add relevant shields.io badges for build status, license, and test coverage.',
      points_deducted: 2,
    });
    score -= 1;
  }

  const hasDescription =
    readme.includes('description') || readme.includes('overview') || readme.includes('about') || readme.includes('what is');
  if (!hasDescription) {
    findings.push({
      id: 'ai_3',
      category: 'ai_analysis',
      severity: 'warning',
      title: 'No project description/overview (AI observation)',
      description:
        'The README does not contain an introductory description explaining what the project does and who it is for.',
      evidence: 'No "description", "overview", "about", or "what is" section found',
      recommendation:
        'Start your README with a concise 2-3 sentence description of the project purpose and target audience.',
      points_deducted: 3,
    });
    score -= 2;
  }

  return {
    findings,
    ai_score_contribution: Math.max(0, score),
    model: 'demo-mode',
    demo_mode: true,
  };
}

// ─── Live Granite Call ────────────────────────────────────────────────────────

export async function analyzeWithGranite(input: GraniteInput): Promise<GraniteResult> {
  const apiKey = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  const watsonxUrl = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';

  if (!apiKey || !projectId || apiKey.trim() === '' || projectId.trim() === '') {
    console.log('[granite] No credentials configured — using demo mode');
    return buildDemoFindings(input);
  }

  try {
    console.log('[granite] Fetching IAM token...');
    const token = await getIAMToken(apiKey);

    const prompt = buildPrompt(input);
    console.log('[granite] Sending request to watsonx.ai (ibm/granite-3-8b-instruct)...');

    const response = await axios.post(
      `${watsonxUrl}/ml/v1/text/generation?version=2023-05-29`,
      {
        model_id: 'ibm/granite-3-8b-instruct',
        input: prompt,
        parameters: {
          decoding_method: 'greedy',
          max_new_tokens: 1200,
          stop_sequences: ['```'],
          temperature: 0.2,
        },
        project_id: projectId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const rawText: string = response.data.results?.[0]?.generated_text || '';
    console.log('[granite] Raw response length:', rawText.length);

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[granite] Could not extract JSON from response, falling back to demo');
      return buildDemoFindings(input);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const scoreContrib = Math.min(10, Math.max(0, parseInt(parsed.score_contribution) || 7));

    const findings: Finding[] = (parsed.findings || []).slice(0, 5).map((f: {
      title?: string;
      severity?: string;
      description?: string;
      recommendation?: string;
      evidence?: string;
    }, i: number) => ({
      id: `ai_granite_${i + 1}`,
      category: 'ai_analysis' as const,
      severity: (['critical', 'warning', 'info'].includes(f.severity || '') ? f.severity : 'info') as 'critical' | 'warning' | 'info',
      title: f.title || 'AI Finding',
      description: f.description || '',
      recommendation: f.recommendation || '',
      evidence: f.evidence || 'Identified by IBM Granite AI analysis',
      points_deducted: f.severity === 'critical' ? 5 : f.severity === 'warning' ? 3 : 1,
    }));

    console.log(`[granite] Got ${findings.length} findings, score contribution: ${scoreContrib}`);

    return {
      findings,
      ai_score_contribution: scoreContrib,
      model: 'ibm/granite-3-8b-instruct',
      demo_mode: false,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[granite] Error calling watsonx.ai:', message);

    // Return demo mode but signal the failure
    const demo = buildDemoFindings(input);
    return {
      ...demo,
      model: `demo-mode (watsonx.ai error: ${message.slice(0, 80)})`,
    };
  }
}
