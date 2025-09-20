#!/usr/bin/env node
// Branch strategy helper (Git Flow-like): develop/release/hotfix scaffolding
// Usage: node scripts/branch-workflow.js [init|start:release|finish:release|start:hotfix|finish:hotfix]

const { execSync } = require('child_process')
const readline = require('readline')

function sh(cmd) {
  try { return execSync(cmd, { stdio: ['ignore','pipe','pipe'], encoding: 'utf8' }).trim() } catch (e) { return { error: e, stderr: e.stderr?.toString?.() || e.message } }
}
function ask(q) { return new Promise((r)=>{ const rl = readline.createInterface({input:process.stdin,output:process.stdout}); rl.question(q,(a)=>{ rl.close(); r(a.trim()) }) }) }
function log(t){ console.log(`\n=== ${t} ===`) }

async function init() {
  log('Initialize develop branch')
  const hasDevelop = !sh('git rev-parse --verify develop')?.error
  if (hasDevelop) { console.log('develop ブランチは既に存在します。'); return }
  const base = (sh('git rev-parse --abbrev-ref HEAD') || 'main')
  const ans = await ask(`ベースブランチを指定してください [default: ${base}]: `)
  const from = ans || base
  const res = sh(`git checkout -b develop ${from}`)
  if (res?.error) { console.log('作成失敗:', res.stderr) } else {
    console.log('develop を作成しました。push します。')
    const p = sh('git push -u origin develop')
    if (p?.error) console.log('push 失敗:', p.stderr)
  }
}

async function startRelease() {
  log('Start release')
  const v = await ask('リリースバージョン（例: 0.3.0）: ')
  const name = `release/${v}`
  const res = sh(`git checkout -b ${name} develop`)
  if (res?.error) { console.log('作成失敗:', res.stderr); return }
  console.log(`ブランチ ${name} を作成しました。`) 
  const p = sh(`git push -u origin ${name}`)
  if (p?.error) console.log('push 失敗:', p.stderr)
  console.log('完了: リリース準備のコミット（バージョン更新等）をこのブランチに積み、PRを作成してください。')
}

async function finishRelease() {
  log('Finish release')
  const name = await ask('完了する release/<version> ブランチ名（例: release/0.3.0）: ')
  if (!name.startsWith('release/')) { console.log('release/<version> 形式で指定してください。'); return }
  // Merge to main then back-merge to develop
  const mainRes = sh(`git checkout main && git pull && git merge --no-ff ${name}`)
  if (mainRes?.error) { console.log('main へのマージ失敗:', mainRes.stderr); return }
  sh('git push')
  const devRes = sh('git checkout develop && git pull && git merge --no-ff main')
  if (devRes?.error) { console.log('develop へのマージ失敗:', devRes.stderr); return }
  sh('git push')
  console.log('完了: release ブランチの削除は手動で行うか、PR画面から削除してください。タグ付け/リリースは release-please または release:workflow を使用可能です。')
}

async function startHotfix() {
  log('Start hotfix')
  const v = await ask('ホットフィックスバージョン（例: 0.2.2）: ')
  const name = `hotfix/${v}`
  const res = sh(`git checkout -b ${name} main`)
  if (res?.error) { console.log('作成失敗:', res.stderr); return }
  console.log(`ブランチ ${name} を作成しました。`)
  const p = sh(`git push -u origin ${name}`)
  if (p?.error) console.log('push 失敗:', p.stderr)
}

async function finishHotfix() {
  log('Finish hotfix')
  const name = await ask('完了する hotfix/<version> ブランチ名（例: hotfix/0.2.2）: ')
  if (!name.startsWith('hotfix/')) { console.log('hotfix/<version> 形式で指定してください。'); return }
  const mainRes = sh(`git checkout main && git pull && git merge --no-ff ${name}`)
  if (mainRes?.error) { console.log('main へのマージ失敗:', mainRes.stderr); return }
  sh('git push')
  const devRes = sh('git checkout develop && git pull && git merge --no-ff main')
  if (devRes?.error) { console.log('develop へのマージ失敗:', devRes.stderr); return }
  sh('git push')
  console.log('完了: 必要に応じてタグ・リリースを作成してください（release-please 連携可）。')
}

async function main() {
  const sub = process.argv[2]
  if (!sub || sub === 'help') {
    console.log('Usage: node scripts/branch-workflow.js <init|start:release|finish:release|start:hotfix|finish:hotfix>')
    process.exit(0)
  }
  if (sub === 'init') return init()
  if (sub === 'start:release') return startRelease()
  if (sub === 'finish:release') return finishRelease()
  if (sub === 'start:hotfix') return startHotfix()
  if (sub === 'finish:hotfix') return finishHotfix()
  console.log('Unknown subcommand')
}

main()

