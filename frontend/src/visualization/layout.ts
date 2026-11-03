import type { Task } from "../types";

export interface MapPoint {
  task: Task;
  x: number;
  y: number;
  z: number;
  size: number;
  difficulty: number;
  category: string;
  model: string;
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
      difficulty: operations + keys,
      category: String((task as Task & { failure_category?: string }).failure_category ?? "unclassified"),
      model: task.model ?? "all models",
    };
  });
}

export function moduleColor(module: string): string {
  return { M1: "#70e1c4", M2: "#8eb8ff", M3: "#f6c177", M4: "#d0a6ff", M5: "#ff9f9f" }[module] ?? "#ffffff";
}

export function qualityForPointCount(count: number, reducedMotion: boolean): {
  pixelRatio: number; segments: number; animate: boolean;
} {
  return {
    pixelRatio: Math.min(1.5, window.devicePixelRatio || 1),
    segments: count > 500 ? 8 : count > 150 ? 12 : 16,
    animate: !reducedMotion && count < 1000,
  };
}

export function mapBounds(points: MapPoint[]): { minX: number; maxX: number; minY: number; maxY: number } {
  if (!points.length) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x), maxX: Math.max(bounds.maxX, point.x),
    minY: Math.min(bounds.minY, point.y), maxY: Math.max(bounds.maxY, point.y),
  }), { minX: points[0].x, maxX: points[0].x, minY: points[0].y, maxY: points[0].y });
}
