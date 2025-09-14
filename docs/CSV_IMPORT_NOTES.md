# CSV Import Notes

CSV 取り込み時の詳細と注意点。

## 文字コード / 改行
- UTF-8（BOM あり/なしどちらも可）。
- 改行は `\n`/`\r\n` をどちらも受け付ける。
- CSV の二重引用符エスケープ（`""`）に対応。

## 必須ヘッダ
- `ProjectName,TaskID,TaskName,Start,Finish`
- いずれか不足時は、行 1（ヘッダ）に `ヘッダ不足: <列名>` のエラーを返して終了。

## 検証エラーの扱い
- エラーは `ImportError` として収集し、エラーのない行のみ `tasks` に格納。
- 代表的なエラー（日本語メッセージ）:
  - `TaskID`: `TaskID は数値で入力してください`
  - `Start`/`Finish`: `Start/Finish は YYYY-MM-DD 形式で入力してください`
  - `ProjectName`/`TaskName`: `... は必須です`
  - `ResourceType`: `ResourceType は「社内」または「協力」を指定してください`
  - `ProgressPercent`: `ProgressPercent は 0-100 の範囲で指定してください`
  - `Dependencies`: `Dependencies に存在しない TaskID: <IDの一覧>`（CSV 内に存在しない TaskID を参照した場合）
- `stats.failed` は、1 つ以上のエラーを持つ「データ行」のユニーク件数。

## 数値/日付のパース
- 数値: カンマ/空白を除去してから数値化。失敗時は `undefined`。
- 日付: 完全一致で `YYYY-MM-DD`。失敗時は `undefined`（列に値があればエラーとして報告）。

## 依存関係
- `Dependencies` 列は TaskID をカンマ区切りで指定（例: `"10, 20"`）。
- 数値化できない要素は無視。空列は `undefined`。
- 未知依存（CSV内に存在しない TaskID 参照）の扱い:
  - 既定（厳格）: エラー（列=Dependencies）として報告し、当該行は取り込まない。
  - オプション: `unknownDeps: 'warn'` を指定すると、エラーにせず取り込み（`predIds` はそのまま保持）。
    - Node: `parseCsv(path, { unknownDeps: 'warn' })`
    - ブラウザ: `parseCsvTextBrowser(text, { unknownDeps: 'warn' })`

## 統計値（`stats`）
- `rows`: ヘッダを除く総データ行数。
- `imported`: 取り込み成功行数。
- `failed`: 失敗行数（ユニーク）。
- `byColumn?`: 列名ごとのエラー件数（例: `{ TaskID: 1, Start: 2 }`）。

## 実装位置
- Node 用: `evm-mvp-sprint1/parseCsv.ts`
- ブラウザ用: `src/adapters/csv-browser.ts`

## テスト
- `tests/csv-import.spec.ts`: サンプル CSV の正常系/異常系。
- `tests/csv-extended.spec.ts`: `ActualStart/Finish` と `Dependencies` の取り込み/エクスポート。
