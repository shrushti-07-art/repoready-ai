export type Severity = 'critical' | 'warning' | 'info';

export interface Finding {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  points_deducted: number;
}

export type Category =
  | 'setup_instructions'
  | 'dependencies'
  | 'feature_claims'
  | 'testing'
  | 'configuration'
  | 'security'
  | 'ai_analysis';

export interface CategoryScore {
  category: Category;
  label: string;
  earned: number;
  max: number;
  findings_count: number;
}

export interface AuditResult {
  score: number;
  max_score: number;
  grade: string;
  summary: string;
  findings: Finding[];
  category_scores: CategoryScore[];
  ai_powered: boolean;
  ai_model?: string;
  demo_mode: boolean;
  timestamp: string;
}

export interface AuditRequest {
  file_tree: string;
  readme: string;
  extra_files?: Record<string, string>;
}

export interface AuditResponse {
  success: boolean;
  data?: AuditResult;
  error?: string;
}
