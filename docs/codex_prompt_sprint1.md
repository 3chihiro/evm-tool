# Codex用プロンプト（コピペOK）
本リポジトリの docs/requirements.md（要件定義 v0.3）と AGENTS.md を前提に、
次を実装してください：

- スプリント1：CSVインポート機能（sample_tasks.csv を読み込んで ImportResult を返す）
- 型定義は evm-mvp-sprint1/src.types.ts をベースに
- 仕様：evm-mvp-sprint1/CSV_MAPPING_SPEC.md と CSV_IMPORT_NOTES.md を遵守
- テスト：tests/csv-import.spec.ts を追加/更新し、CIが通ること（Vitest）

開発ルール：小さく安全なPR、コミットメッセージは conventional commits 準拠。
