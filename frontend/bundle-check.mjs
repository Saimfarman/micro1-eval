import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./src/App.tsx", import.meta.url), "utf8");
const routeModules = [
  "Overview",
  "TaskDetail",
  "Tasks",
  "FailureMap",
  "Results",
  "Failures",
  "Modules",
  "Runs",
  "Providers",
  "LiveRun",
  "Grader",
  "Method",
  "Learn",
  "Reproduce",
  "Settings",
  "Accessibility",
];

for (const name of routeModules) {
  if (!new RegExp(`const ${name} = lazy\\(`).test(app)) {
    throw new Error(`${name} must be loaded lazily at the route boundary`);
  }
}

if (!/import\s*\{\s*lazy,\s*Suspense,/.test(app)) {
  throw new Error("App must import React lazy loading and Suspense");
}
if (!app.includes("<Suspense")) {
  throw new Error("App must provide a Suspense boundary for lazy routes");
}

console.log(`Lazy route contract passed for ${routeModules.length} page modules.`);
