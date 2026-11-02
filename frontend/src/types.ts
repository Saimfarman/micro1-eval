export type ModuleName = "M1" | "M2" | "M3" | "M4";

export interface Task {
  id: string;
  module: ModuleName;
  control: boolean;
  status: string;
  expected_verdict: string;
  difficulty?: Record<string, number>;
  derivation?: string[];
  history?: string;
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
