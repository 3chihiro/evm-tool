# EVM Tool Starter

開発からデプロイまで扱う Electron + Vite + Vitest 構成のスターターです。CSVインポートやガント/EVMのUIを含みます。

## 開発
- UI/メインを同時起動:
  
  ```bash
  npm run dev
  ```

## テスト
- Node側テスト:
  
  ```bash
  npm test
  ```

- UIテスト（jsdom）:
  
  ```bash
  npm run test:ui
  ```

## ビルド
- レンダラのみ:
  
  ```bash
  npm run build:renderer
  ```

- アプリ（パッケージング）:
  
  ```bash
  # dist-electron に main/preload を出力後、electron-builder で release/ へ出力
  npm run build
  ```

CIではPR時にテスト/型チェック/レンダラビルドのみを実行し、タグ `v*.*.*` で各OSのパッケージを作成します。

## Node向けライブラリエントリ
- EVM計算・CSV入出力・型は `evm-mvp-sprint1` 直下からまとめてインポートできます。

```ts
import { computeEVM, parseCsv, exportCsv, type TaskRow } from './evm-mvp-sprint1'
  ```

## CSV 検証CLI
- ビルド: `npm run build:cli`
- 実行: `npm run csv:check -- sample_tasks.csv --unknownDeps=error --errors-csv=release/import-errors.csv`
- 詳細: `docs/csv-cli.md`

## Git完全ワークフロー支援（ローカルCLI）
- 変更の確認 → ステージング → コミット → プッシュ → PR作成支援までを対話で案内します。

```bash
npm run git:workflow
```

詳細は `docs/git-workflow.md` を参照してください。
