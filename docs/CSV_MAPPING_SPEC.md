# CSV Mapping Spec

CSV 列と内部型 `TaskRow` のマッピング仕様（Sprint1）。パーサ実装: `evm-mvp-sprint1/parseCsv.ts`、ブラウザ版: `src/adapters/csv-browser.ts`。

## 列 → フィールド
- ProjectName: `projectName`（string, 必須）
- TaskID: `taskId`（number, 必須）
- TaskName: `taskName`（string, 必須）
- Start: `start`（YYYY-MM-DD, 必須）
- Finish: `finish`（YYYY-MM-DD, 必須）
- DurationDays: `durationDays`（number, 任意）
- ProgressPercent: `progressPercent`（number 0–100, 任意）
- ResourceType: `resourceType`（'社内' | '協力', 任意）
- ContractorName: `contractorName`（string, 任意）
- UnitCost: `unitCost`（number, 任意）
- ContractAmount: `contractAmount`（number, 任意）
- PlannedCost: `plannedCost`（number, 任意）
- ActualCost: `actualCost`（number, 任意）
- ActualStart: `actualStart`（YYYY-MM-DD, 任意）
- ActualFinish: `actualFinish`（YYYY-MM-DD, 任意）
- Dependencies: `predIds`（CSV の TaskID をカンマ区切り → number[]、任意）
- Notes: `notes`（string, 任意）

## バリデーション/パース規則
- ヘッダ: 必須 5 列（ProjectName, TaskID, TaskName, Start, Finish）。不足時は行 1 にエラーを返し、データ行は未読扱い。
- 数値: カンマ・空白は無視して数値化（例: `"1,000"` → 1000）。失敗時は `undefined`。
- 日付: 厳密に `YYYY-MM-DD`（例: `2025-01-05`）。不一致はエラー。
- リソース種別: `社内` or `協力` のみ。その他はエラー。
- 依存: 例 `"10, 20"` → `[10, 20]`。数値化できない項目は破棄。
- 空文字や欠損セルは `undefined` として扱う。

## インポート結果
- `ImportResult.tasks`: バリデーションに通過した行だけを `TaskRow` として格納。
- `ImportResult.errors`: `[{ row, column?, message, value? }]`。`row` は 1 始まり（ヘッダ行含む）。
- `ImportResult.stats`:
  - `rows`: データ行数（ヘッダ除く）
  - `imported`: 取り込んだ行数
  - `failed`: 1 件以上のエラーを持つデータ行のユニーク件数

## コスト計算の前提（UI/EVM 連携）
- `PlannedCost` が明示されていればそれを優先。
- `resourceType==='協力'` かつ `contractAmount` があれば契約額を計画総額として採用。
- `resourceType==='社内'` かつ `unitCost` と稼働日数があれば「日単価×稼働日」で計画総額を推定。
- 稼働日数は土日/祝日を除外（祝日は UI 設定による）。

## サンプル（`sample_tasks.csv`）
```csv
ProjectName,TaskID,TaskName,Start,Finish,DurationDays,ProgressPercent,ResourceType,ContractorName,UnitCost,ContractAmount,PlannedCost,ActualCost,Notes
橋梁補修工事A,1,足場組立,2025-01-05,2025-01-10,6,100,協力,株式会社スカイ足場,50000,300000,300000,290000,高所作業含む
橋梁補修工事A,2,ケレン,2025-01-11,2025-01-15,5,80,社内,,20000,,100000,80000,第1種ケレン
橋梁補修工事A,3,下塗り（プライマー）,2025-01-16,2025-01-20,5,60,協力,塗装工業株式会社,,600000,300000,180000,鋼材防食プライマー
```
