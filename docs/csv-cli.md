# CSV 検証CLI

CSVファイルを `evm-mvp-sprint1/parseCsv` で検証し、要約・依存状況・エラーを出力します。エラーCSVの保存にも対応。

## ビルド

```bash
npm run build:cli
```

## 使い方

```bash
npm run csv:check -- <path/to.csv> [--unknownDeps=error|warn] [--errors-csv=path] [--json]
```

- `--unknownDeps`: `Dependencies` 列で CSV内に存在しない TaskID 参照を検出した際の扱い
  - `error`（既定）: エラーとして当該行を取り込まない
  - `warn`: エラーにせず取り込む（`predIds` はそのまま）
- `--errors-csv`: 指定すると、検出した `ImportError[]` を `Row,Column,Message,Value` のCSVで保存
- `--json`: 検証結果 `ImportResult` を JSON で出力

## 出力例

```text
# CSV Check: sample_tasks.csv
Rows 3 / Imported 3 / Failed 0
Deps: Cycles 0 / Isolated 3
No errors.
```

エラーCSV保存:

```bash
npm run csv:check -- sample_tasks.csv --errors-csv=release/import-errors.csv
```

