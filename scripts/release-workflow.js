#!/usr/bin/env node
// Release workflow assistant: bump version, generate notes, tag, and publish
// Usage: node scripts/release-workflow.js

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts }).trim()
  } catch (e) {
    return { error: e, stdout: e.stdout?.toString?.() || '', stderr: e.stderr?.toString?.() || e.message }
  }
}

function ask(q) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(q, (ans) => { rl.close(); resolve(ans.trim()) })
  })
}

function logSection(title) { console.log(`\n=== ${title} ===`) }

function hasGh() { const which = sh('command -v gh'); return typeof which === 'string' && which.length > 0 && !which.error }

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }
function writeJSON(p, data) { fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8') }

function semverBump(v, kind) {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/)
  if (!m) throw new Error(`Invalid semver: ${v}`)
  let [_, M, mnr, pch] = m
  let major = +M, minor = +mnr, patch = +pch
  if (kind === 'major') { major++; minor = 0; patch = 0 }
  else if (kind === 'minor') { minor++; patch = 0 }
  else { patch++ }
  return `${major}.${minor}.${patch}`
}

function todayISO() { return new Date().toISOString().slice(0, 10) }

async function main() {
  logSection('Release: 現状確認')
  const branch = sh('git rev-parse --abbrev-ref HEAD')
  const dirty = sh('git status --porcelain')
  if (typeof dirty === 'string' && dirty.length > 0) {
    console.log(dirty)
    const cont = await ask('未コミットの変更があります。続行しますか？ [y/N]: ')
    if (!/^y(es)?$/i.test(cont)) { console.log('中断'); process.exit(1) }
  }
  const pkgPath = path.resolve(process.cwd(), 'package.json')
  const pkg = readJSON(pkgPath)
  const cur = pkg.version
  console.log(`現在のブランチ: ${branch}`)
  console.log(`package.json のバージョン: ${cur}`)

  let bump = await ask('バージョン種別を選択 [patch/minor/major] (default: patch): ')
  bump = ['patch','minor','major'].includes(bump) ? bump : 'patch'
  const next = semverBump(cur, bump)
  console.log(`次バージョン案: ${next}`)
  const ok = await ask('このバージョンで進めますか？ [y/N]: ')
  if (!/^y(es)?$/i.test(ok)) { console.log('中断'); process.exit(1) }

  logSection('Release: リリースノート生成')
  const lastTag = sh("git describe --tags --abbrev=0")
  const range = (typeof lastTag === 'string' && !lastTag.error && lastTag) ? `${lastTag}..HEAD` : ''
  // Conventional Commits の subject を収集
  const logCmd = range ? `git log --pretty=%s ${range}` : 'git log --pretty=%s'
  const raw = sh(logCmd)
  const lines = (typeof raw === 'string' ? raw.split('\n') : [])
  const groups = { feat: [], fix: [], chore: [], docs: [], refactor: [], perf: [], test: [], build: [], ci: [], other: [] }
  for (const s of lines) {
    if (/^feat[:(]/.test(s)) groups.feat.push(s)
    else if (/^fix[:(]/.test(s)) groups.fix.push(s)
    else if (/^chore[:(]/.test(s)) groups.chore.push(s)
    else if (/^docs[:(]/.test(s)) groups.docs.push(s)
    else if (/^refactor[:(]/.test(s)) groups.refactor.push(s)
    else if (/^perf[:(]/.test(s)) groups.perf.push(s)
    else if (/^test[:(]/.test(s)) groups.test.push(s)
    else if (/^build[:(]/.test(s)) groups.build.push(s)
    else if (/^ci[:(]/.test(s)) groups.ci.push(s)
    else groups.other.push(s)
  }
  const notesLines = []
  notesLines.push(`# v${next} — ${todayISO()}`)
  const order = ['feat','fix','perf','refactor','docs','test','build','ci','chore','other']
  const labels = { feat: 'Features', fix: 'Bug Fixes', perf: 'Performance', refactor: 'Refactors', docs: 'Docs', test: 'Tests', build: 'Build', ci: 'CI', chore: 'Chore', other: 'Others' }
  for (const g of order) {
    const arr = groups[g]
    if (!arr || arr.length === 0) continue
    notesLines.push(`\n## ${labels[g]}`)
    for (const s of arr) notesLines.push(`- ${s}`)
  }
  const notes = notesLines.join('\n')
  console.log('\n--- Release Notes (preview) ---\n')
  console.log(notes)
  console.log('\n--------------------------------\n')
  const writeChangelog = await ask('CHANGELOG.md の先頭に追記しますか？ [y/N]: ')
  if (/^y(es)?$/i.test(writeChangelog)) {
    const chPath = path.resolve(process.cwd(), 'CHANGELOG.md')
    let prev = ''
    try { prev = fs.readFileSync(chPath, 'utf8') } catch { prev = '# Changelog\n\n' }
    const updated = prev.replace(/^# Changelog\n?/, '# Changelog\n\n')
    fs.writeFileSync(chPath, updated.startsWith('# Changelog') ? (updated + `\n${notes}\n`) : (`# Changelog\n\n${notes}\n\n${updated}`), 'utf8')
    console.log('CHANGELOG.md を更新しました。')
  }

  logSection('Release: バージョン反映とタグ付け')
  pkg.version = next
  writeJSON(pkgPath, pkg)
  console.log(`package.json を ${cur} -> ${next} に更新`)
  const commitMsg = `chore(release): v${next}`
  const commitRes = sh('git add package.json CHANGELOG.md && git commit -m ' + JSON.stringify(commitMsg))
  if (commitRes?.error) { console.error('コミットエラー:', commitRes.stderr) }
  const tagName = `v${next}`
  const tagRes = sh(`git tag -a ${tagName} -m ${JSON.stringify(`Release ${tagName}`)}`)
  if (tagRes?.error) { console.error('タグ作成エラー:', tagRes.stderr) }
  const pushRes = sh('git push && git push --tags')
  if (pushRes?.error) { console.error('プッシュエラー:', pushRes.stderr) }

  if (hasGh()) {
    const rel = await ask('GitHub Release を作成して公開しますか？ [y/N]: ')
    if (/^y(es)?$/i.test(rel)) {
      const tmpNotes = path.join(process.cwd(), `.release-notes-${next}.md`)
      fs.writeFileSync(tmpNotes, notes, 'utf8')
      const cmd = `gh release create ${tagName} -F ${JSON.stringify(tmpNotes)} --title ${JSON.stringify(tagName)}`
      console.log('実行:', cmd)
      const r = sh(cmd, { stdio: ['ignore','pipe','pipe'] })
      if (r?.error) console.error('Release作成失敗:', r.stderr)
      else console.log('GitHub Release を作成しました。')
      try { fs.unlinkSync(tmpNotes) } catch {}
    }
  }

  console.log('\n完了: リリースフローを終了します。')
}

main().catch((e) => { console.error(e); process.exit(1) })

