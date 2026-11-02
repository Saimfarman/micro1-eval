# Accessibility and frontend quality

The dashboard targets WCAG 2.2 AA with semantic landmarks, one-page headings,
keyboard-visible focus, a skip link, labelled controls, status/error
announcements, responsive layouts, and a light/dark theme toggle. The browser
does not receive provider credentials.

The Failure Map is progressive enhancement: Three.js is optional, reduced
motion disables the animated camera rotation, and every visualization has a
2D navigation view plus a semantic data table. The table is the authoritative
keyboard and screen-reader equivalent.

`npm run accessibility` checks the required offline accessibility contract,
`npm run typecheck` checks the strict TypeScript surface, and `npm run build`
produces the static bundle.
