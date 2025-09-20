# ブランチ戦略テンプレ（Git Flow ライト）

目的: 明確な運用ルールと簡易CLIで、`develop/release/hotfix` フローを効率化。

## 主要ブランチ
- `main`: 常にリリース可能な安定版。
- `develop`: 次版の開発統合ブランチ。
- `feature/*`: 機能開発用（`develop` 起点）。
- `release/x.y.z`: 次リリースの最終調整（`develop` 起点）。
- `hotfix/x.y.z`: 緊急修正（`main` 起点）。

## CLI
```bash
# 初期化（develop 作成）
npm run branch:workflow -- init

# リリース開始/完了
npm run branch:workflow -- start:release
npm run branch:workflow -- finish:release

# ホットフィックス開始/完了
npm run branch:workflow -- start:hotfix
npm run branch:workflow -- finish:hotfix
```

## リリース運用例
1) `feature/*` を `develop` にマージ
2) `start:release`（`release/x.y.z` 作成）→ バージョン・文言最終調整 → PR作成
3) CIグリーン後に `finish:release`（`main` マージ→`develop` へバックマージ）
4) タグ/リリースは release-please により自動化（`main` への push でリリースPR→タグ作成）。

## ホットフィックス例
1) `start:hotfix`（`hotfix/x.y.z` 作成）→ 修正コミット → PR作成
2) CIグリーン後に `finish:hotfix`（`main` マージ→`develop` へバックマージ）
3) タグ/リリースは release-please 経由、もしくは `npm run release:workflow` を利用。

## 注意
- 破壊的操作（force push）は原則禁止。
- リリースPRは Squash Merge 推奨。
- release-please 連携により CHANGELOG/タグ/Release は自動管理されます。

