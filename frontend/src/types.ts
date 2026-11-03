export type ModuleName = "M1" | "M2" | "M3" | "M4" | "M5";

export interface Task {
  id: string;
  module: ModuleName;
  control: boolean;
  status: string;
  expected_verdict: string;
  difficulty?: Record<string, number>;
  derivation?: string[];
  history?: string;
  model?: string;
  failure_category?: string;
}

export interface Summary {
  attempts?: number;
  passed?: number;
  pass_at_1?: number;
  mean_score?: number;
  scopes?: Record<string, { attempts: number; passed: number; pass_at_1: number }>;
}

export interface ApiError {
  title: string;
  detail?: string;
  status: number;
}

export interface Run { run_id?: string; provider?: string; status?: string; [key: string]: unknown }
export interface Provider { id: string; [key: string]: unknown }
export interface ModuleInfo { id: string; description?: string; [key: string]: unknown }
export interface LiveRunEvent { version: string; run_id: string; type: string; payload: Record<string, unknown> }
