import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import { parseCsv } from '../evm-mvp-sprint1/parseCsv'

describe('CSV Import - dependency warn mode', () => {
  it('imports rows even if Dependencies reference unknown TaskID when unknownDeps=\'warn\'', async () => {
    const path = 'tests/tmp_deps_warn.csv'
    const csv = [
      'ProjectName,TaskID,TaskName,Start,Finish,DurationDays,ProgressPercent,ResourceType,ContractorName,UnitCost,ContractAmount,PlannedCost,ActualCost,Dependencies,Notes',
      '工事DW,10,A,2025-01-05,2025-01-10,6,0,社内,,20000,,100000,0,,',
      '工事DW,20,B,2025-01-11,2025-01-15,5,0,協力,株式会社Z,,,120000,0,999,',
    ].join('\n')
    await fs.writeFile(path, csv, 'utf8')

    const res = await parseCsv(path, { unknownDeps: 'warn' })
    expect(res.stats.rows).toBe(2)
    expect(res.stats.imported).toBe(2)
    expect(res.stats.failed).toBe(0)
    expect(res.errors.some(e => e.column === 'Dependencies')).toBe(false)
  })
})

