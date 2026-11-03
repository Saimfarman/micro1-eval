import type { ApiError, LiveRunEvent, ModuleInfo, Provider, Run, Summary, Task } from "./types";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Partial<ApiError>;
    throw new Error(body.detail ?? body.title ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function getTasks(): Promise<Task[]> {
  const payload = await request<{ tasks: Task[] }>("/api/tasks?per_page=100");
  return payload.tasks;
}

export function getTask(id: string): Promise<Task> {
  return request<Task>(`/api/tasks/${encodeURIComponent(id)}`);
}

export function getSummary(): Promise<Summary> {
  return request<Summary>("/api/results/summary");
}

export function getIntegrity(): Promise<{ ok: boolean; errors: string[] }> {
  return request("/api/integrity");
}

export async function getRuns(): Promise<Run[]> {
  return (await request<{ runs: Run[] }>("/api/runs")).runs;
}

export async function getModules(): Promise<ModuleInfo[]> {
  return (await request<{ modules: ModuleInfo[] }>("/api/modules")).modules;
}

export async function getProviders(): Promise<Provider[]> {
  return (await request<{ providers: Provider[] }>("/api/providers")).providers;
}

export function subscribeToRun(runId: string, onEvent: (event: LiveRunEvent) => void): () => void {
  const source = new EventSource(`/api/runs/${encodeURIComponent(runId)}/events`);
  const handler = (message: MessageEvent<string>) => {
    try { onEvent(JSON.parse(message.data) as LiveRunEvent); } catch { /* malformed events are ignored by the UI */ }
  };
  source.onmessage = handler;
  ["run-created", "queued", "started", "progress", "attempt-completed", "quota-paused", "failed", "cancelled", "finished"]
    .forEach(type => source.addEventListener(type, handler));
  return () => source.close();
}
