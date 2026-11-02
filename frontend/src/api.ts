import type { ApiError, Summary, Task } from "./types";

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
