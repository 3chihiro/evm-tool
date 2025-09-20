#!/usr/bin/env node
// Git workflow assistant: safe, step-by-step guidance with confirmations
// Usage: node scripts/git-workflow.js

const { execSync } = require('child_process');
const readline = require('readline');

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts }).trim();
  } catch (e) {
    return { error: e, stdout: e.stdout?.toString?.() || '', stderr: e.stderr?.toString?.() || e.message };
  }
}

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function hasGh() {
  const which = sh('command -v gh');
  return typeof which === 'string' && which.length > 0 && !which.error;
}

function parseOriginUrl(url) {
  if (!url) return null;
  // git@github.com:owner/repo.git -> owner/repo
  // https://github.com/owner/repo.git -> owner/repo
  let m = url.match(/github.com[:/](.+?)\.git$/);
  if (!m) m = url.match(/github.com[:/](.+?)$/);
  if (!m) return null;
  return m[1];
}

async function phase1() {
  logSection('Phase 1: 現状確認');
  const status = sh('git status -sb');
  const branches = sh('git branch --all --verbose --no-abbrev');
  const remotes = sh('git remote -v');
  console.log(status.error ? status.stderr : status);
  console.log('\n--- branches ---');
  console.log(branches.error ? branches.stderr : branches);
  console.log('\n--- remotes ---');
  console.log(remotes.error ? remotes.stderr : remotes);

  console.log('\n確認事項:');
  console.log('- 現在のブランチは適切ですか？');
  console.log('- 未コミットの変更は想定通りですか？');
  console.log('- プッシュ先のリモートは正しいですか？');
  const cont = await ask('続行しますか？ [y/N]: ');
  if (!/^y(es)?$/i.test(cont)) {
    console.log('中断しました。');
    process.exit(0);
  }
}

async function phase2() {
  logSection('Phase 2: ステージング/コミット/プッシュ');
  // Show diff summary
  const changed = sh('git status --porcelain');
  if (typeof changed === 'string' && changed.length === 0) {
    console.log('変更はありません。');
  } else {
    console.log('変更ファイル:');
    console.log(changed.error ? changed.stderr : changed);

    const addChoice = await ask('ステージング方法を選択 [a] 全て / [s] 個別 / [n] スキップ: ');
    if (/^a$/i.test(addChoice)) {
      const addRes = sh('git add .');
      if (addRes?.error) console.error(addRes.stderr);
    } else if (/^s$/i.test(addChoice)) {
      const files = await ask('スペース区切りでファイルを指定: ');
      if (files) {
        const addRes = sh(`git add ${files}`);
        if (addRes?.error) console.error(addRes.stderr);
      }
    } else {
      console.log('ステージングをスキップしました。');
    }
  }

  // Commit if staged changes exist
  const staged = sh('git diff --cached --name-only');
  if (typeof staged === 'string' && staged.length > 0) {
    console.log('\nステージ済み:');
    console.log(staged);
    console.log('\nコミットメッセージ（conventional commits 推奨）例:');
    console.log('feat: add CSV import');
    console.log('\n一行サブジェクトを入力（空でスキップ）');
    const subject = await ask('subject: ');
    let body = '';
    if (subject) {
      body = await ask('任意の本文（空で続行）: ');
      const msg = body ? `${subject}\n\n${body}` : subject;
      const commit = sh(`git commit -m ${JSON.stringify(msg)}`);
      if (commit?.error) {
        console.error('コミット失敗:');
        console.error(commit.stderr);
      } else {
        console.log('コミット完了');
      }
    } else {
      console.log('コミットをスキップしました。');
    }
  } else {
    console.log('ステージ済みの変更はありません。コミットをスキップします。');
  }

  // Push
  const branch = sh('git rev-parse --abbrev-ref HEAD');
  const upstream = sh('git rev-parse --abbrev-ref --symbolic-full-name @{u}');
  const hasUpstream = !(upstream && upstream.error);
  const pushCmd = hasUpstream ? 'git push' : `git push -u origin ${branch}`;
  const doPush = await ask(`プッシュしますか？ [${pushCmd}] [y/N]: `);
  if (/^y(es)?$/i.test(doPush)) {
    console.log(`実行: ${pushCmd}`);
    const pushed = sh(pushCmd, { stdio: ['ignore', 'pipe', 'pipe'] });
    if (pushed?.error) {
      console.error('プッシュ失敗:');
      console.error(pushed.stderr);
      console.log('\nヒント: 先にリモート更新を取り込む必要があるかもしれません。');
      console.log(`例: git pull origin ${branch} で取り込み → コンフリクト解消後に git push`);
    } else {
      console.log('プッシュ完了');
    }
  } else {
    console.log('プッシュをスキップしました。');
  }
}

async function phase3() {
  logSection('Phase 3: PR作成支援');
  const branch = sh('git rev-parse --abbrev-ref HEAD');
  const originUrl = sh('git remote get-url origin');
  const repoPath = parseOriginUrl(typeof originUrl === 'string' ? originUrl : '');
  if (!repoPath) {
    console.log('origin の URL を解釈できませんでした。手動で PR を作成してください。');
    return;
  }
  const prUrl = `https://github.com/${repoPath}/compare/${branch}?expand=1`;
  console.log(`PR作成URL: ${prUrl}`);

  console.log('\nPR Description Template:\n');
  console.log('### 変更内容');
  console.log('- ');
  console.log('\n### 動作確認');
  console.log('- [ ] ローカルでの動作確認完了');
  console.log('- [ ] テスト実行完了');
  console.log('\n### チェックリスト');
  console.log('- [ ] コードレビューが必要');
  console.log('- [ ] ドキュメント更新が必要');
  console.log('- [ ] Breaking Changeあり');

  if (hasGh()) {
    console.log('\nGitHub CLI が見つかりました。以下のコマンド例も利用できます:');
    console.log('gh pr create --fill --web');
  }
}

async function phase3b() {
  // Optional: CI 監視と（PRがあれば）自動マージ支援（GitHub CLI 依存）
  logSection('Phase 3b: CI 監視と自動マージ（任意）');
  if (!hasGh()) {
    console.log('GitHub CLI (gh) が見つかりません。Actions タブでご確認ください。');
    return;
  }
  const branch = sh('git rev-parse --abbrev-ref HEAD');
  const watch = await ask('Actions を監視しますか？（gh run watch --exit-status を実行）[y/N]: ');
  if (/^y(es)?$/i.test(watch)) {
    try {
      // 直近の実行を監視。未起動の場合は適宜 GitHub 側の遅延がある点に留意。
      console.log('gh run watch --exit-status を実行します...');
      execSync('gh run watch --exit-status', { stdio: 'inherit' });
    } catch (e) {
      console.log('watch 中にエラーが発生:', e?.stderr?.toString?.() || e.message);
    }
  }

  // PR が存在すれば、自動マージのオプションを提示
  const prStatus = sh('gh pr status');
  const hasOpenPr = typeof prStatus === 'string' && /Current branch has an open pull request/i.test(prStatus);
  if (hasOpenPr) {
    console.log('\n現在のブランチに対するPRが見つかりました。');
    console.log(prStatus);
    const auto = await ask('CI 成功後に Squash マージし、ブランチを削除しますか？ [gh pr merge --squash --auto --delete-branch] [y/N]: ');
    if (/^y(es)?$/i.test(auto)) {
      const res = sh('gh pr merge --squash --auto --delete-branch');
      if (res?.error) {
        console.log('自動マージの起動に失敗しました。PR の状態/権限をご確認ください。');
        console.log(res.stderr);
      } else {
        console.log('自動マージを設定しました。PR が条件を満たすと自動でマージされます。');
      }
    }
  } else {
    console.log('現在ブランチのオープンPRは検出されませんでした。必要に応じて Phase 3 の手順で作成してください。');
  }
}

async function phase4and5() {
  logSection('Phase 4: マージ・デプロイ監視（ガイダンス）');
  console.log('- マージ前チェック: CI ステータス、コンフリクト、レビュー完了');
  console.log('- 推奨: Squash Merge（履歴を簡潔に）');
  console.log('- マージ後: ブランチ削除、ローカル更新（git fetch -p）');

  logSection('Phase 5: GitHub Actions 対応');
  if (hasGh()) {
    console.log('CI 監視コマンド例:');
    console.log('- gh run list');
    console.log('- gh run view <run-id>');
  } else {
    console.log('GitHub CLI が無い場合は、GitHub の Actions タブで実行状況を確認してください。');
  }
  console.log('\nエラー対応のヒント:');
  console.log('- コンフリクト: git status → 手動解決 → git add . → git commit');
  console.log('- プッシュ拒否: git pull origin <branch> で取り込み後、再度 push');
  console.log('- Actions ビルドエラー: 依存関係や設定ファイルを確認');
}

(async function main() {
  console.log('Git完全ワークフロー支援（ローカルCLI）');
  console.log('安全第一: 各操作は確認後に実行されます。');
  await phase1();
  await phase2();
  await phase3();
  await phase3b();
  await phase4and5();
  console.log('\n完了: 必要に応じて次のステップに進んでください。');
})();
