# Git完全ワークフロー支援（ローカルCLI）

## 概要
- 安全第一の段階的 Git 操作をガイドする CLI。
- 現状確認 → ステージング → コミット → プッシュ → PR 作成支援 → CI 監視の順に案内。

## 使い方
```bash
npm run git:workflow
```

## 実施内容
- Phase 1: `git status`, `git branch`, `git remote -v` を表示し確認を取得。
- Phase 2: 変更のステージング（全て/個別/スキップ）、コミット（conventional commits 推奨）、プッシュ（upstream 未設定時は `-u` 付与）。
- Phase 3: PR 作成支援（GitHub 上の比較URLを生成、PR テンプレ表示）。
- Phase 4/5: マージ/Actions 監視のコマンド例や対応のヒントを提示。

## 備考
- 破壊的操作（force push 等）は自動では実行しません。
- GitHub CLI (`gh`) があれば PR/Actions 関連のコマンド例が表示されます。

