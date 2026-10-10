import { Finding, Category, CategoryScore, Severity } from '../src/types';

interface AuditInput {
  file_tree: string;
  readme: string;
  extra_files: Record<string, string>;
}

interface DeterministicResult {
  findings: Finding[];
  category_scores: CategoryScore[];
  score: number;
}

let findingCounter = 0;
function makeId(prefix: string): string {
  return `${prefix}_${++findingCounter}`;
}

function finding(
  category: Category,
  severity: Severity,
  title: string,
  description: string,
  evidence: string,
  recommendation: string,
  points_deducted: number
): Finding {
  return {
    id: makeId(category),
    category,
    severity,
    title,
    description,
    evidence,
    recommendation,
    points_deducted,
  };
}

// ─── Checks ────────────────────────────────────────────────────────────────

function checkSetupInstructions(input: AuditInput): Finding[] {
  const findings: Finding[] = [];
  const readme = input.readme.toLowerCase();
  const tree = input.file_tree.toLowerCase();

  if (!readme.includes('install') && !readme.includes('setup') && !readme.includes('getting started')) {
    findings.push(
      finding(
        'setup_instructions',
        'critical',
        'No installation instructions found',
        'The README does not contain installation steps. Contributors and evaluators cannot set up the project without guidance.',
        'README contains none of: "install", "setup", "getting started"',
        'Add an ## Installation section with step-by-step commands (e.g., `npm install`, `pip install -r requirements.txt`).',
        15
      )
    );
  }

  if (!readme.includes('usage') && !readme.includes('run') && !readme.includes('start') && !readme.includes('quickstart')) {
    findings.push(
      finding(
        'setup_instructions',
        'critical',
        'No usage / run instructions found',
        'The README does not explain how to run or use the project after installation.',
        'README contains none of: "usage", "run", "start", "quickstart"',
        'Add a ## Usage section with the exact commands to start the application.',
        10
      )
    );
  }

  const hasDockerfile = /dockerfile/i.test(input.file_tree);
  const hasDockerMention = /docker/i.test(input.readme);
  if (hasDockerfile && !hasDockerMention) {
    findings.push(
      finding(
        'setup_instructions',
        'warning',
        'Dockerfile present but not documented',
        'A Dockerfile exists but the README does not mention how to build or run the container.',
        'Dockerfile found in file tree; "docker" not mentioned in README',
        'Add Docker build/run instructions: `docker build -t myapp .` and `docker run -p 3000:3000 myapp`.',
        5
      )
    );
  }

  const hasRequirements =
    /requirements\.txt|package\.json|pyproject\.toml|go\.mod|pom\.xml|gemfile|composer\.json/i.test(tree);
  if (!hasRequirements) {
    findings.push(
      finding(
        'setup_instructions',
        'warning',
        'No dependency manifest detected',
        'No standard dependency file (package.json, requirements.txt, etc.) was found in the file tree.',
        'File tree does not contain a recognized dependency manifest',
        'Include a dependency manifest so users can install required packages with a single command.',
        5
      )
    );
  }

  return findings;
}

function checkDependencies(input: AuditInput): Finding[] {
  const findings: Finding[] = [];
  const readme = input.readme.toLowerCase();
  const tree = input.file_tree.toLowerCase();

  // Check for version pinning in common manifest names
  const hasPackageJson = /package\.json/i.test(tree);
  const hasRequirements = /requirements\.txt/i.test(tree);

  const packageJsonContent = input.extra_files['package.json'] || '';
  const requirementsContent = input.extra_files['requirements.txt'] || '';

  if (hasPackageJson && packageJsonContent) {
    const unpinned = (packageJsonContent.match(/"[^"]+"\s*:\s*"\^/g) || []).length;
    if (unpinned > 5) {
      findings.push(
        finding(
          'dependencies',
          'warning',
          'Many dependencies use loose version ranges (^)',
          `${unpinned} dependencies use the ^ range operator, which can cause build failures when packages release breaking changes.`,
          `${unpinned} entries with "^" found in package.json`,
          'Consider pinning critical dependencies or using a lockfile (package-lock.json / yarn.lock).',
          5
        )
      );
    }
  }

  if (hasRequirements && requirementsContent) {
    const unpinned = requirementsContent
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('#') && !l.includes('==') && !l.includes('>=') && l.trim().length > 0).length;
    if (unpinned > 3) {
      findings.push(
        finding(
          'dependencies',
          'warning',
          'requirements.txt contains unpinned dependencies',
          `${unpinned} packages have no version specifier, making installs non-reproducible.`,
          `${unpinned} unpinned lines in requirements.txt`,
          'Pin dependencies with exact versions: `package==1.2.3` or use `pip freeze > requirements.txt`.',
          5
        )
      );
    }
  }

  const mentionedTools = ['node', 'python', 'java', 'ruby', 'go', 'rust', 'php'];
  const missingVersions: string[] = [];
  for (const tool of mentionedTools) {
    if (readme.includes(tool) && !readme.match(new RegExp(`${tool}[\\s\\S]{0,30}\\d+\\.\\d+`, 'i'))) {
      // mentioned but no version near it
    }
  }

  if (!readme.includes('node') && !readme.includes('python') && !readme.includes('java') && !readme.includes('ruby') && !readme.includes('go') && !readme.includes('php')) {
    if (/package\.json|requirements|gemfile|pom\.xml|go\.mod/i.test(tree)) {
      findings.push(
        finding(
          'dependencies',
          'info',
          'Runtime version not specified in README',
          'The README does not mention the required runtime version (e.g., Node.js 18+, Python 3.11+).',
          'No runtime version mentioned in README',
          'State the minimum required runtime version near the top of your README.',
          3
        )
      );
    }
  }

  return findings;
}

function checkFeatureClaims(input: AuditInput): Finding[] {
  const findings: Finding[] = [];
  const readme = input.readme;
  const tree = input.file_tree.toLowerCase();

  // Check for feature claims without evidence (demo/screenshots/tests)
  const claimKeywords = ['supports', 'features', 'provides', 'includes', 'integrates', 'powered by', 'enables'];
  const evidenceKeywords = ['screenshot', 'demo', 'gif', 'video', 'example', 'test', 'spec', 'see below', 'see above'];

  const hasFeatureClaims = claimKeywords.some((k) => readme.toLowerCase().includes(k));
  const hasEvidence = evidenceKeywords.some((k) => readme.toLowerCase().includes(k));

  if (hasFeatureClaims && !hasEvidence) {
    findings.push(
      finding(
        'feature_claims',
        'warning',
        'Feature claims lack evidence',
        'The README makes feature claims but provides no screenshots, demos, or examples to substantiate them.',
        `Found: "${claimKeywords.find((k) => readme.toLowerCase().includes(k))}" — no evidence keywords found`,
        'Add screenshots, a demo GIF, or a live demo link to support your feature claims.',
        8
      )
    );
  }

  // License check
  const hasLicense =
    /license/i.test(readme) || /license/i.test(tree) || /mit|apache|gpl|bsd/i.test(readme);
  if (!hasLicense) {
    findings.push(
      finding(
        'feature_claims',
        'warning',
        'No license information found',
        'The project does not declare a license in the README or file tree. Without a license, the project is legally "all rights reserved."',
        'Neither "license" nor common SPDX identifiers found in README or file tree',
        'Add a LICENSE file and a license badge to your README. For open source, MIT or Apache 2.0 are good choices.',
        5
      )
    );
  }

  // Contribution guide
  if (!readme.toLowerCase().includes('contribut') && !tree.includes('contributing')) {
    findings.push(
      finding(
        'feature_claims',
        'info',
        'No contributing guide',
        'There is no CONTRIBUTING file or contributing section in the README.',
        'No "contribut" in README; no contributing file in tree',
        'Add a CONTRIBUTING.md or a ## Contributing section explaining how to submit issues and pull requests.',
        3
      )
    );
  }

  return findings;
}

function checkTesting(input: AuditInput): Finding[] {
  const findings: Finding[] = [];
  const readme = input.readme.toLowerCase();
  const tree = input.file_tree.toLowerCase();

  const hasTestFiles = /test|spec|__tests__|\.test\.|\.spec\./i.test(tree);
  const hasTestMention = /test|testing|jest|pytest|mocha|vitest|unittest/i.test(readme);

  if (!hasTestFiles) {
    findings.push(
      finding(
        'testing',
        'critical',
        'No test files detected',
        'No test or spec files were found in the file tree. Untested code is risky and may fail silently.',
        'File tree contains no test/spec directories or *.test.* / *.spec.* files',
        'Add unit tests using a suitable framework (Jest, Vitest, pytest, etc.) and a tests/ or __tests__/ directory.',
        15
      )
    );
  }

  if (!hasTestMention) {
    findings.push(
      finding(
        'testing',
        'warning',
        'Testing not documented in README',
        'The README does not describe how to run tests.',
        'No testing-related keywords in README',
        'Add a ## Testing section with the command to run the test suite (e.g., `npm test`, `pytest`).',
        7
      )
    );
  }

  const hasCiConfig = /\.github\/workflows|\.gitlab-ci|\.travis\.yml|circle\.yml|jenkinsfile|\.circleci/i.test(tree);
  if (!hasCiConfig) {
    findings.push(
      finding(
        'testing',
        'info',
        'No CI/CD configuration found',
        'No continuous integration configuration was detected. CI ensures tests run automatically on every push.',
        'No CI config files found in file tree',
        'Add a GitHub Actions workflow (.github/workflows/ci.yml) or equivalent CI configuration.',
        5
      )
    );
  }

  return findings;
}

function checkConfiguration(input: AuditInput): Finding[] {
  const findings: Finding[] = [];
  const readme = input.readme.toLowerCase();
  const tree = input.file_tree.toLowerCase();

  const hasEnvExample = /\.env\.example|\.env\.sample|\.env\.template/i.test(tree);
  const hasEnvMention = /\.env|environment variable|env var|configuration/i.test(readme);
  const hasEnvFile = /\.env(?!\w)/i.test(tree);

  if (hasEnvFile && !hasEnvExample) {
    findings.push(
      finding(
        'configuration',
        'critical',
        '.env file present without .env.example',
        'A .env file was detected but no .env.example template exists. Other users will not know what environment variables are required.',
        '.env found in file tree; no .env.example present',
        'Create a .env.example file with all required variable names (values can be empty or descriptive placeholders).',
        10
      )
    );
  }

  if (hasEnvExample && !hasEnvMention) {
    findings.push(
      finding(
        'configuration',
        'warning',
        '.env.example exists but README does not document configuration',
        'Environment variable requirements are not described in the README.',
        '.env.example found; "env" not mentioned in README',
        'Add a ## Configuration section listing each required variable and its purpose.',
        5
      )
    );
  }

  const hasConfig = /config\.(json|yaml|yml|toml|ini)/i.test(tree);
  if (hasConfig && !readme.includes('config')) {
    findings.push(
      finding(
        'configuration',
        'info',
        'Configuration files present but undocumented',
        'Configuration files exist in the project but the README does not explain how to use them.',
        'config file found in tree; "config" not in README',
        'Document the configuration file format, required fields, and any defaults.',
        3
      )
    );
  }

  return findings;
}

function checkSecurity(input: AuditInput): Finding[] {
  const findings: Finding[] = [];
  const readme = input.readme.toLowerCase();
  const tree = input.file_tree.toLowerCase();
  const allContent = Object.values(input.extra_files).join('\n');

  const hasGitignore = /\.gitignore/i.test(tree);
  if (!hasGitignore) {
    findings.push(
      finding(
        'security',
        'critical',
        'No .gitignore file found',
        'Without a .gitignore, sensitive files like .env, node_modules, API keys, and build artifacts may be committed.',
        'No .gitignore in file tree',
        'Add a .gitignore appropriate for your stack. Use gitignore.io to generate one.',
        10
      )
    );
  }

  // Check for hardcoded credentials in extra files
  const credentialPatterns = [
    /api[_-]?key\s*=\s*["'][a-z0-9]{16,}/i,
    /secret\s*=\s*["'][a-z0-9]{16,}/i,
    /password\s*=\s*["'][^\s"']{8,}/i,
    /token\s*=\s*["'][a-z0-9]{20,}/i,
  ];

  const foundCredentials = credentialPatterns.some((p) => p.test(allContent));
  if (foundCredentials) {
    findings.push(
      finding(
        'security',
        'critical',
        'Potential hardcoded credentials detected',
        'Patterns matching hardcoded API keys, secrets, or passwords were found in the submitted file contents.',
        'Credential-like pattern matched in provided file contents',
        'Move all secrets to environment variables. Never commit real credentials. Use a secret scanning tool like GitLeaks.',
        15
      )
    );
  }

  if (!hasGitignore && /node_modules|__pycache__|\.pyc/i.test(tree)) {
    findings.push(
      finding(
        'security',
        'warning',
        'Build artifacts or virtual environments may be tracked',
        'node_modules or Python cache directories appear in the file tree, which should be gitignored.',
        'node_modules / __pycache__ visible in tree',
        'Add node_modules/ and __pycache__/ to your .gitignore.',
        5
      )
    );
  }

  if (!readme.includes('security') && !tree.includes('security.md')) {
    findings.push(
      finding(
        'security',
        'info',
        'No security policy documented',
        'No SECURITY.md or security section in README. Responsible disclosure guidelines are missing.',
        'No security documentation found',
        'Add a SECURITY.md file describing how to report vulnerabilities.',
        3
      )
    );
  }

  return findings;
}

// ─── Score Calculator ────────────────────────────────────────────────────────

const CATEGORY_MAX: Record<Category, number> = {
  setup_instructions: 20,
  dependencies: 10,
  feature_claims: 10,
  testing: 20,
  configuration: 15,
  security: 15,
  ai_analysis: 10,
};

const CATEGORY_LABELS: Record<Category, string> = {
  setup_instructions: 'Setup Instructions',
  dependencies: 'Dependencies',
  feature_claims: 'Feature Claims & Docs',
  testing: 'Testing',
  configuration: 'Configuration',
  security: 'Security',
  ai_analysis: 'AI Analysis',
};

export function runDeterministicAudit(input: AuditInput): DeterministicResult {
  findingCounter = 0;

  const allFindings: Finding[] = [
    ...checkSetupInstructions(input),
    ...checkDependencies(input),
    ...checkFeatureClaims(input),
    ...checkTesting(input),
    ...checkConfiguration(input),
    ...checkSecurity(input),
  ];

  const categories: Category[] = [
    'setup_instructions',
    'dependencies',
    'feature_claims',
    'testing',
    'configuration',
    'security',
  ];

  const category_scores: CategoryScore[] = categories.map((cat) => {
    const catFindings = allFindings.filter((f) => f.category === cat);
    const deducted = catFindings.reduce((sum, f) => sum + f.points_deducted, 0);
    const max = CATEGORY_MAX[cat];
    const earned = Math.max(0, max - deducted);
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      earned,
      max,
      findings_count: catFindings.length,
    };
  });

  // ai_analysis slot starts at 0 — filled in by AI layer
  category_scores.push({
    category: 'ai_analysis',
    label: CATEGORY_LABELS['ai_analysis'],
    earned: 0,
    max: CATEGORY_MAX['ai_analysis'],
    findings_count: 0,
  });

  const deterministicScore = category_scores
    .filter((c) => c.category !== 'ai_analysis')
    .reduce((sum, c) => sum + c.earned, 0);

  const maxDeterministic = categories.reduce((sum, c) => sum + CATEGORY_MAX[c], 0);

  return {
    findings: allFindings,
    category_scores,
    score: deterministicScore,
  };
}

export { CATEGORY_MAX, CATEGORY_LABELS };
