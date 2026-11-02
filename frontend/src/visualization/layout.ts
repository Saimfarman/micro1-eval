import type { Task } from "../types";

export interface MapPoint {
  task: Task;
  x: number;
  y: number;
  z: number;
  size: number;
}

export function taskMapLayout(tasks: Task[]): MapPoint[] {
  return tasks.map((task, index) => {
    const difficulty = task.difficulty ?? {};
    const operations = Number(difficulty.operations ?? 1);
    const keys = Number(difficulty.keys ?? 1);
    return {
      task,
      x: (index % 8) * 1.8 - 6.3,
      y: Math.min(5, operations / 2) - 2,
      z: Math.min(5, keys) - 2.5,
      size: 0.14 + Math.min(0.25, operations / 40),
    };
  });
}

export function moduleColor(module: string): string {
  return { M1: "#70e1c4", M2: "#8eb8ff", M3: "#f6c177", M4: "#d0a6ff" }[module] ?? "#ffffff";
}
