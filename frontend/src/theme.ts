export type Theme = "light" | "dark";

export function getInitialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return "dark";
}

export function applyTheme(theme: Theme) {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // ignore local storage errors
  }

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    if (theme === "light") {
      root.classList.add("theme-light");
      root.classList.remove("theme-dark");
      document.body?.classList.add("theme-light");
      document.body?.classList.remove("theme-dark");
    } else {
      root.classList.add("theme-dark");
      root.classList.remove("theme-light");
      document.body?.classList.add("theme-dark");
      document.body?.classList.remove("theme-light");
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }
}
