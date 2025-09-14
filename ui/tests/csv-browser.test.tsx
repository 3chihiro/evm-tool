import { describe, it, expect } from 'vitest'
import { parseCsvTextBrowser } from '../../src/adapters'

function bom(s: string) { return '\uFEFF' + s }

describe('Browser CSV parser (parseCsvTextBrowser)', () => {
  it('handles BOM/CRLF/quotes and validates progress/unknown deps', () => {
    const rows = [
      'ProjectName,TaskID,TaskName,Start,Finish,ProgressPercent,Dependencies',
      '工事B,1,"A, コンマ",2025-01-01,2025-01-05,100,',
      '工事B,2,B,2025-01-06,2025-01-10,120,1', // 進捗120%（エラー）
      '工事B,3,C,2025-01-06,2025-01-10,50,999', // 未知依存（エラー）
    ]
    const text = bom(rows.join('\r\n'))
    const res = parseCsvTextBrowser(text)
    // 行2と3はエラーで除外、行1のみ取り込み
    expect(res.stats.rows).toBe(3)
    expect(res.stats.imported).toBe(1)
    expect(res.stats.failed).toBe(2)
    expect(res.errors.some(e => e.column === 'ProgressPercent')).toBe(true)
    expect(res.errors.some(e => e.column === 'Dependencies')).toBe(true)
  })

  it('imports unknown deps when option unknownDeps=\'warn\'', () => {
    const rows = [
      'ProjectName,TaskID,TaskName,Start,Finish,ProgressPercent,Dependencies',
      '工事B,1,A,2025-01-01,2025-01-05,0,',
      '工事B,2,B,2025-01-06,2025-01-10,0,999',
    ]
    const text = rows.join('\n')
    const res = parseCsvTextBrowser(text, { unknownDeps: 'warn' })
    expect(res.stats.rows).toBe(2)
    expect(res.stats.imported).toBe(2)
    expect(res.stats.failed).toBe(0)
    expect(res.errors.some(e => e.column === 'Dependencies')).toBe(false)
  })
})
