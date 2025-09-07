# CSV Import Notes

CSV 取り込み時の詳細と注意点。

## 文字コード / 改行
- UTF-8（BOM あり/なしどちらも可）。
- 改行は `\n`/`\r\n` をどちらも受け付ける。
- CSV の二重引用符エスケープ（`""`）に対応。

## 必須ヘッダ
- `ProjectName,TaskID,TaskName,Start,Finish`
- いずれか不足時は、行 1（ヘッダ）に `Missing header: <列名>` のエラーを返して終了。

## 検証エラーの扱い
- エラーは `ImportError` として収集し、エラーのない行のみ `tasks` に格納。
- 代表的なエラー:
  - `TaskID`: 数値でない。
  - `Start`/`Finish`: `YYYY-MM-DD` でない。
  - `ProjectName`/`TaskName`: 空。
  - `ResourceType`: `社内`/`協力` 以外の値。
- `stats.failed` は、1 つ以上のエラーを持つ「データ行」のユニーク件数。

## 数値/日付のパース
- 数値: カンマ/空白を除去してから数値化。失敗時は `undefined`。
- 日付: 完全一致で `YYYY-MM-DD`。失敗時は `undefined`（列に値があればエラーとして報告）。

## 依存関係
- `Dependencies` 列は TaskID をカンマ区切りで指定（例: `"10, 20"`）。
- 数値化できない要素は無視。空列は `undefined`。

## 統計値（`stats`）
- `rows`: ヘッダを除く総データ行数。
- `imported`: 取り込み成功行数。
- `failed`: 失敗行数（ユニーク）。

## 実装位置
- Node 用: `evm-mvp-sprint1/parseCsv.ts`
- ブラウザ用: `src/adapters/csv-browser.ts`

## テスト
- `tests/csv-import.spec.ts`: サンプル CSV の正常系/異常系。
- `tests/csv-extended.spec.ts`: `ActualStart/Finish` と `Dependencies` の取り込み/エクスポート。
