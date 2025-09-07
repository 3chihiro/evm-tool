# Next Steps

Shortlist of high-impact follow-ups:

- CSV IO
  - Extend CSV to include `ActualStart`,`ActualFinish` columns (optional)
  - Export current project to CSV (round-trip)

- Calendar & Holidays
  - GUI to manage holidays; persist in project file
  - Toggle business-day snapping on/off per operation

- Constraints & Visualization
  - Show dependency arrows and violations in-line
  - Optional constraint for actual vs plan (e.g., actual cannot precede plan start)

- Accessibility
  - `aria-selected` sync with rows, `aria-live` announcements for changes
  - Keyboard shortcuts help overlay

- Performance
  - Virtualized row rendering (visible rows only)
  - Partial redraws for hover/drag overlays

- UI Polish
  - Tooltip customization (costs/AC), theme variables, grip affordances
  - Project status summary panel

