import type {
  ApiError,
  AttemptDetail,
  AttemptGrade,
  FailureBreakdown,
  FailureItem,
  GraderReliability,
  IntegrityStatus,
  LiveRunEvent,
  ModelConfig,
  ModuleInfo,
  Provider,
  Run,
  Summary,
  Task,
} from "./types";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Partial<ApiError>;
    throw new Error(body.detail ?? body.title ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function getTasks(module?: string, control?: boolean): Promise<Task[]> {
  const query = new URLSearchParams({ per_page: "100" });
  if (module && module !== "all") query.set("module", module);
  if (control !== undefined) query.set("control", String(control));
  const payload = await request<{ tasks: Task[]; total: number }>(`/api/tasks?${query.toString()}`);
  return payload.tasks;
}

export function getTask(id: string): Promise<Task> {
  return request<Task>(`/api/tasks/${encodeURIComponent(id)}`);
}

export function getSummary(): Promise<Summary> {
  return request<Summary>("/api/results/summary");
}

export function getIntegrity(): Promise<IntegrityStatus> {
  return request<IntegrityStatus>("/api/integrity");
}

export async function getRuns(): Promise<Run[]> {
  const res = await request<{ runs: Run[] }>("/api/runs");
  return res.runs;
}

export async function getModules(): Promise<ModuleInfo[]> {
  const res = await request<{ modules: ModuleInfo[] }>("/api/modules");
  return res.modules;
}

export async function getProviders(): Promise<Provider[]> {
  const res = await request<{ providers: Provider[] }>("/api/providers");
  return res.providers;
}

export async function getModels(): Promise<ModelConfig[]> {
  const res = await request<{ models: ModelConfig[] }>("/api/models");
  return res.models;
}

export async function getAttempts(page = 1, perPage = 50): Promise<{ attempts: AttemptGrade[]; total: number }> {
  return request<{ attempts: AttemptGrade[]; total: number }>(`/api/results/attempts?page=${page}&per_page=${perPage}`);
}

export function getAttemptDetail(attemptKey: string): Promise<AttemptDetail> {
  return request<AttemptDetail>(`/api/results/attempt?key=${encodeURIComponent(attemptKey)}`);
}

export async function getFailures(): Promise<FailureItem[]> {
  const res = await request<{ failures: FailureItem[] }>("/api/failures");
  return res.failures;
}

export function getFailuresBreakdown(): Promise<FailureBreakdown> {
  return request<FailureBreakdown>("/api/failures/breakdown");
}

export function getGraderReliability(): Promise<GraderReliability> {
  return request<GraderReliability>("/api/grader/reliability");
}

export async function getManifests(): Promise<unknown[]> {
  const res = await request<{ manifests: unknown[] }>("/api/manifests");
  return res.manifests;
}

export function getHealth(): Promise<{ status: string; database: boolean }> {
  return request<{ status: string; database: boolean }>("/api/health");
}

export function subscribeToRun(runId: string, onEvent: (event: LiveRunEvent) => void): () => void {
  const source = new EventSource(`/api/runs/${encodeURIComponent(runId)}/events`);
  const handler = (message: MessageEvent<string>) => {
    try {
      onEvent(JSON.parse(message.data) as LiveRunEvent);
    } catch {
      /* malformed events ignored */
    }
  };
  source.onmessage = handler;
  [
    "run-created",
    "queued",
    "started",
    "progress",
    "attempt-completed",
    "quota-paused",
    "failed",
    "cancelled",
    "finished",
  ].forEach(type => source.addEventListener(type, handler));
  return () => source.close();
}
