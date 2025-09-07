# Changelog

All notable changes to this project will be documented in this file.

## v0.3.0 — Interactive Gantt MVP (YYYY-MM-DD)

- Gantt Interactions Phase 1
  - Drag/move/resize on plan bars (day-snap)
  - Multi-select operations, hover highlight, precise hit-bands
  - Undo/Redo (Cmd/Ctrl+Z, +Shift for redo)
  - Sticky triple header, auto width, horizontal range expansion
- Phase 2
  - Auto-scroll during drag near edges
  - Business-day snapping (weekends/holidays excluded)
  - Dependency validation for plan changes with visual warning/toast
- Phase 3 / UX
  - Weekend/holiday background shading
  - Keyboard ops: ←/→ move (×5 with Shift), Alt+←/→ right-resize, Alt+Shift left-resize
  - Visual grips on plan bars
  - Bottom status bar: selection count, Esc to cancel, clear-selection button
- Actual Bar (execution)
  - Make actual bar draggable/resizable; recompute progress% from actual duration
  - Hover tooltip (plan/actual details)
  - Track `actualStart`/`actualFinish` in TaskRow
- CSV + EVM foundation (from previous sprint)
  - CSV import with validation and tests
  - EVM compute (PV/EV/AC + SV/CV/SPI/CPI) with working-day rules
- Electron
  - PDF export (printToPDF)
  - Devtools auto-open in dev and renderer diagnostics for white-screen troubleshooting

Notes:
- jsdom Canvas is not implemented; UI tests run as smoke tests without canvas context.
- `predIds` can be set to enable plan dependency checks.

