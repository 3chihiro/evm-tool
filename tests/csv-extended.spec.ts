import { describe, it, expect } from 'vitest'
import { parseCsv } from '../evm-mvp-sprint1/parseCsv'
import { toCsvText } from '../evm-mvp-sprint1/exportCsv'
import { promises as fs } from 'fs'

const EXT_CSV = [
  'ProjectName,TaskID,TaskName,Start,Finish,DurationDays,ProgressPercent,ResourceType,ContractorName,UnitCost,ContractAmount,PlannedCost,ActualCost,ActualStart,ActualFinish,Dependencies,Notes',
  '工事X,10,タスクA,2025-01-05,2025-01-10,6,50,社内,,20000,,100000,50000,2025-01-05,2025-01-08,,Aメモ',
  '工事X,20,タスクB,2025-01-11,2025-01-15,5,0,協力,株式会社Y,,,120000,0,,,10,依存B',
].join('\n')

describe('CSV extended import/export', () => {
  it('imports ActualStart/Finish and Dependencies', async () => {
    const path = 'tests/tmp_ext.csv'
    await fs.writeFile(path, EXT_CSV, 'utf8')
    const res = await parseCsv(path)
    expect(res.errors.length).toBe(0)
    expect(res.tasks.length).toBe(2)
    const a = res.tasks.find(t => t.taskId === 10)!
    expect(a.actualStart).toBe('2025-01-05')
    expect(a.actualFinish).toBe('2025-01-08')
    const b = res.tasks.find(t => t.taskId === 20)!
    expect(b.predIds).toEqual([10])
  })

  it('exports extended columns', async () => {
    const path = 'tests/tmp_ext.csv'
    const res = await parseCsv(path)
    const csv = toCsvText(res.tasks)
    expect(csv.split('\n')[0]).toContain('ActualStart')
    expect(csv).toContain('Dependencies')
  })
})

