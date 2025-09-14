import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import { parseCsv } from '../evm-mvp-sprint1/parseCsv'

describe('CSV Import - progress percent validation', () => {
  it('rejects ProgressPercent outside 0–100', async () => {
    const path = 'tests/tmp_progress.csv'
    const csv = [
      'ProjectName,TaskID,TaskName,Start,Finish,DurationDays,ProgressPercent,ResourceType,ContractorName,UnitCost,ContractAmount,PlannedCost,ActualCost,Notes',
      '工事V,1,タスクV,2025-01-05,2025-01-10,6,120,社内,,20000,,100000,50000,過大進捗',
    ].join('\n')
    await fs.writeFile(path, csv, 'utf8')

    const res = await parseCsv(path)
    expect(res.stats.rows).toBe(1)
    expect(res.stats.imported).toBe(0)
    expect(res.stats.failed).toBe(1)
    expect(res.errors.some(e => e.column === 'ProgressPercent')).toBe(true)
  })

  it('accepts ProgressPercent boundary values 0 and 100', async () => {
    const path = 'tests/tmp_progress_ok.csv'
    const csv = [
      'ProjectName,TaskID,TaskName,Start,Finish,DurationDays,ProgressPercent,ResourceType,ContractorName,UnitCost,ContractAmount,PlannedCost,ActualCost,Notes',
      '工事W,2,タスクW,2025-01-05,2025-01-10,6,0,協力,株式会社A,50000,300000,300000,100000,下限',
      '工事W,3,タスクX,2025-01-11,2025-01-15,5,100,社内,,20000,,100000,80000,上限',
    ].join('\n')
    await fs.writeFile(path, csv, 'utf8')

    const res = await parseCsv(path)
    expect(res.errors.length).toBe(0)
    expect(res.stats.rows).toBe(2)
    expect(res.stats.imported).toBe(2)
    expect(res.stats.failed).toBe(0)
  })
})

