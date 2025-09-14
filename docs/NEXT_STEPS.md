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

---

## Done (recent)
- CSV import
  - 日本語エラーメッセージ化、0–100 の進捗検証、列別エラー集計（byColumn）
  - 依存（Dependencies）の存在確認（未知ID検出）とオプション化（`unknownDeps: 'error' | 'warn'`）
  - ラウンドトリップテスト（parse → export → parse）
  - 代表的エッジケース（BOM/CRLF/引用/数値カンマ等）のテスト追加
- UI
  - インポート結果ダイアログ（行数/取込/失敗・列別件数・先頭10件エラー）
  - 未知依存の扱い（厳格/警告）の切替スイッチをヘッダに追加（ローカル保存）

## Next Candidates
- エラー出力: インポートエラーのみのCSV保存（列・値・行番号を含む）
- 依存整合性の拡張: 循環/孤立の検出と簡易レポートを `stats` に追加
- i18n: エラーメッセージやUI文言の国際化枠組み（ja/en）
- UIアクセシビリティ: エラーダイアログのキーボード操作/フォーカス管理の強化
- 設定の永続化: すべてのCSVインポート設定をまとめて保存/復元
