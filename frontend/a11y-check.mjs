import { readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "src/main.tsx",
  "src/components/Layout.tsx",
  "src/components/ErrorBoundary.tsx",
  "src/pages/FailureMap.tsx",
];
for (const file of requiredFiles) {
  const content = await readFile(new URL(`./${file}`, import.meta.url), "utf8");
  if (!content.trim()) throw new Error(`${file} is empty`);
}

const index = await readFile(new URL("./index.html", import.meta.url), "utf8");
for (const marker of ['lang="en"', 'name="viewport"', 'id="root"']) {
  if (!index.includes(marker)) throw new Error(`index.html is missing ${marker}`);
}

const layout = await readFile(new URL("./src/components/Layout.tsx", import.meta.url), "utf8");
for (const marker of [
  'aria-label="Primary navigation"',
  'className="skip-link"',
  'id="main"',
  'aria-expanded={sidebarExpanded}',
  'aria-controls="primary-navigation"',
  'sidebar-collapsed',
]) {
  if (!layout.includes(marker)) throw new Error(`Layout is missing ${marker}`);
}

const styles = await readFile(new URL("./src/styles.css", import.meta.url), "utf8");
if (!styles.includes("scrollbar-width: none")) {
  throw new Error("Navigation should not display a distracting scrollbar");
}

const map = await readFile(new URL("./src/pages/FailureMap.tsx", import.meta.url), "utf8");
for (const marker of ['aria-label="Map controls"', 'aria-label="Map view"', 'caption>Task map data']) {
  if (!map.includes(marker)) throw new Error(`Failure map is missing ${marker}`);
}

console.log(`Accessibility contract passed for ${requiredFiles.length} frontend files.`);
