export type ModuleName = "M1" | "M2" | "M3" | "M4" | "M5";

export interface Task {
  id: string;
  module: ModuleName;
  control: boolean;
  status: string;
  expected_verdict: "valid" | "invalid" | "undetermined" | string;
  history?: string;
  prompt?: string;
  difficulty?: {
    transactions?: number;
    keys?: number;
    operations?: number;
    reads?: number;
    writes?: number;
    prepared?: number;
    certificate_items?: number;
    [key: string]: number | undefined;
  };
  expected_certificate?: {
    module?: string;
    verdict?: string;
    reads_from?: Record<string, string>;
    violations?: unknown[];
    derivation?: string[];
    cycle?: unknown[];
    anomaly?: string;
    edges?: unknown[];
    versions?: Record<string, string[]>;
    [key: string]: unknown;
  };
  derivation?: string[];
  canonical_hash?: string;
  provenance?: {
    source?: string;
    seed?: number;
    generated_at?: string;
    verified_by?: string[];
    [key: string]: unknown;
  };
  model?: string;
  failure_category?: string;
  control_relationship?: string;
}

export interface SummaryScope {
  attempts: number;
  passed: number;
  pass_at_1: number;
  mean_score: number;
  consistency?: number;
  bootstrap_95?: {
    low: number;
    high: number;
    seed: number;
    samples: number;
  };
}

export interface Summary {
  run_id?: string;
  runs?: number;
  attempts?: number;
  passed?: number;
  pass_at_1?: number;
  mean_score?: number;
  scopes?: {
    core?: SummaryScope;
    control?: SummaryScope;
    [key: string]: SummaryScope | undefined;
  };
  modules?: Record<string, SummaryScope>;
  control_vs_core?: {
    core_pass_at_1?: number;
    control_pass_at_1?: number;
    difference?: number;
  };
  seed?: number;
  human_review?: {
    status?: string;
    reviewed?: boolean;
  };
}

export interface AttemptGrade {
  attempt_key: string;
  task_id: string;
  score: number;
  passed: boolean;
  reason?: string;
  expected_verdict?: string;
  observed_verdict?: string;
  grader_method?: string;
  criteria?: {
    certificate?: boolean;
    completeness?: boolean;
    naming?: boolean;
    verdict?: boolean;
    [key: string]: boolean | undefined;
  };
  criterion_weights?: Record<string, number>;
}

export interface AttemptDetail {
  attempt_key: string;
  task_id: string;
  task_hash?: string;
  prompt_sent?: string;
  model_requested?: string;
  model_returned?: string;
  settings?: {
    temperature?: number;
    max_tokens?: number;
  };
  response_text?: string;
  finish_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  latency_ms?: number;
  provider_response_id?: string;
  created_at?: string;
  content_sha256?: string;
}

export interface FailureBreakdown {
  total: number;
  by_reason: Record<string, number>;
  human_review?: {
    status: string;
    reviewed: boolean;
  };
}

export interface FailureItem {
  id?: string;
  task_id: string;
  model: string;
  tag: string;
  reason?: string;
  attempt_key?: string;
  [key: string]: unknown;
}

export interface GraderReliability {
  method: string;
  human_review: boolean;
  note?: string;
}

export interface Run {
  id?: string;
  run_id?: string;
  provider?: string;
  repetitions?: number;
  resumable?: boolean;
  max_retries?: number;
  spend_cap_usd?: number | null;
  status?: string;
  completed_attempts?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface Provider {
  id: string;
  display_name?: string;
  live?: boolean;
  protocol?: string;
  key_env?: string;
  [key: string]: unknown;
}

export interface ModelConfig {
  id: string;
  provider: string;
  display_name?: string;
  enabled?: boolean;
  requests_per_minute?: number;
  requests_per_day?: number;
  tokens_per_minute?: number;
  tokens_per_day?: number;
  price_per_million_tokens?: number;
  max_tokens?: number;
  base_url?: string;
  key_env?: string;
  model_env?: string;
}

export interface ModuleInfo {
  id: string;
  name?: string;
  description?: string;
  formal_definition?: string;
  rules?: string[];
  anomalies?: string[];
}

export interface IntegrityStatus {
  ok: boolean;
  errors: string[];
}

export interface ManifestInfo {
  digest: string;
  files?: Record<string, string>;
  count?: number;
}

export interface MetaInfo {
  title: string;
  domain: string;
  modules: string[];
  integrity: boolean;
}

export interface ApiError {
  title: string;
  detail?: string;
  status: number;
}

export interface LiveRunEvent {
  version: string;
  run_id: string;
  type: string;
  payload: Record<string, unknown>;
}
