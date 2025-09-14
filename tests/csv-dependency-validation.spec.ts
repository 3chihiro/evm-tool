import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import { parseCsv } from '../evm-mvp-sprint1/parseCsv'

describe('CSV Import - dependency existence validation', () => {
  it('flags unknown TaskID references in Dependencies and excludes the row', async () => {
    const path = 'tests/tmp_deps.csv'
    const csv = [
      'ProjectName,TaskID,TaskName,Start,Finish,DurationDays,ProgressPercent,ResourceType,ContractorName,UnitCost,ContractAmount,PlannedCost,ActualCost,Dependencies,Notes',
      '工事D,10,基準タスク,2025-01-05,2025-01-10,6,0,社内,,20000,,100000,0,,ベース',
      '工事D,20,参照タスク,2025-01-11,2025-01-15,5,0,協力,株式会社Z,,,120000,0,999,未知参照',
    ].join('\n')
    await fs.writeFile(path, csv, 'utf8')

    const res = await parseCsv(path)
    expect(res.stats.rows).toBe(2)
    expect(res.stats.imported).toBe(1)
    expect(res.stats.failed).toBe(1)
    // 依存列のエラーがある
    expect(res.errors.some(e => e.column === 'Dependencies')).toBe(true)
    // 列別エラー集計
    expect(res.stats.byColumn?.Dependencies).toBeGreaterThanOrEqual(1)
  })
})

