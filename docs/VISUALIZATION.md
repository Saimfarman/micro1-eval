# Task map visualization

Phase 9 adds a restrained task topology view at `#/failure-map`. It uses
shared deterministic layout data for three equivalent presentations:

- Three.js points for the interactive 3D view
- CSS/SVG-like 2D points for environments without WebGL
- An accessible HTML table containing every plotted value

The map uses module, operation count, key count, and control status from the
oracle-derived task corpus. It deliberately does not label expected invalid
tasks as model failures. Model failure claims require completed attempts and
are reserved for the results/failure analysis surfaces.

The 3D view caps pixel ratio, renders on demand through an animation loop,
disposes geometry/materials on unmount, supports pause/reset, and reports a
WebGL fallback. Reduced-motion preferences are respected by the global
stylesheet; the 2D and table views remain fully usable without motion or
WebGL.
