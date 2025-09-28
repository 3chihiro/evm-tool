#!/usr/bin/env node
import { parseCsv } from '../evm-mvp-sprint1/parseCsv'
import type { CsvParseOptions, ImportError } from '../evm-mvp-sprint1/src.types'
import { promises as fs } from 'fs'

type Args = {
  file?: string
  unknownDeps?: 'error' | 'warn'
  errorsCsv?: string
  json?: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (!a) continue
    if (!a.startsWith('--')) {
      if (!args.file) args.file = a
      continue
    }
    const [k, v] = a.split('=')
    switch (k) {
      case '--unknownDeps':
        args.unknownDeps = (v === 'warn' ? 'warn' : 'error')
        break
      case '--errors-csv':
        args.errorsCsv = v
        break
      case '--json':
        args.json = true
        break
      default:
        break
    }
  }
  return args
}

function errorsToCsv(errors: ImportError[]): string {
  const headers = ['Row','Column','Message','Value']
  const esc = (s: string | number | undefined | null) => {
    if (s == null) return ''
    const t = String(s)
    if (t.includes(',') || t.includes('"') || t.includes('\n')) return '"' + t.replace(/"/g, '""') + '"'
    return t
  }
  const lines = [headers.join(',')]
  for (const e of errors) {
    const row = [e.row, e.column ?? '', e.message ?? '', e.value ?? ''].map(esc)
    lines.push(row.join(','))
  }
  return lines.join('\n') + '\n'
}

async function main() {
  const argv = parseArgs(process.argv)
  if (!argv.file) {
    console.error('Usage: csv-check <file> [--unknownDeps=error|warn] [--errors-csv=path] [--json]')
    process.exit(1)
  }
  const opts: CsvParseOptions = { unknownDeps: argv.unknownDeps ?? 'error' }
  const res = await parseCsv(argv.file, opts)

  if (argv.json) {
    console.log(JSON.stringify(res, null, 2))
  } else {
    console.log(`# CSV Check: ${argv.file}`)
    console.log(`Rows ${res.stats.rows} / Imported ${res.stats.imported} / Failed ${res.stats.failed}`)
    if (res.stats.dep) {
      const d = res.stats.dep
      const extra = (typeof d.unknownRefs === 'number') ? ` / UnknownRefs ${d.unknownRefs}` : ''
      console.log(`Deps: Cycles ${d.cycles} / Isolated ${d.isolated}${extra}`)
      if (d.cyclesList && d.cyclesList.length) {
        console.log(`Cycle example: ${d.cyclesList[0].concat(d.cyclesList[0][0]).join(' -> ')}`)
      }
    }
    if (res.stats.byColumn && Object.keys(res.stats.byColumn).length) {
      const items = Object.entries(res.stats.byColumn).map(([k,v]) => `${k}:${v}`).join(' / ')
      console.log(`ByColumn: ${items}`)
    }
    if (res.errors.length) {
      console.log('Errors (first 10):')
      for (const e of res.errors.slice(0, 10)) {
        console.log(`  Row ${e.row} ${e.column ?? ''} ${e.message}${e.value ? ` [${e.value}]` : ''}`)
      }
    } else {
      console.log('No errors.')
    }
  }

  if (argv.errorsCsv && res.errors.length) {
    const csv = errorsToCsv(res.errors)
    await fs.writeFile(argv.errorsCsv, csv, 'utf8')
    console.log(`Wrote errors CSV: ${argv.errorsCsv}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

