# Task map visualization

The dashboard Failure Map (`#/failure-map`) presents task/run information in
three forms:

- Interactive Three.js 3D view
- 2D view without WebGL
- Semantic HTML table with the underlying records

Visualization metadata comes from task records and saved evaluation data.
Expected-invalid tasks are not labelled as model failures; failure claims
require an actual saved attempt and grade.

The 3D view supports pause/reset, limits rendering scale, disposes graphics
resources when unmounted, and handles WebGL loss. Reduced-motion preferences
are respected. The 2D and table views remain usable without WebGL or animation.
See [ACCESSIBILITY.md](ACCESSIBILITY.md) for the UI accessibility target and
automated checks.
