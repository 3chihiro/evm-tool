import { describe, it, expect } from 'vitest'
import { parseCsv } from '../evm-mvp-sprint1/parseCsv'
import { promises as fs } from 'fs'

const DEP_CSV = [
  'ProjectName,TaskID,TaskName,Start,Finish,DurationDays,ProgressPercent,ResourceType,ContractorName,UnitCost,ContractAmount,PlannedCost,ActualCost,ActualStart,ActualFinish,Dependencies,Notes',
  // 10 と 20 が相互依存（サイクル2ノード）+ 30 は孤立
  '工事C,10,タスクA,2025-01-05,2025-01-10,6,0,社内,,20000,,100000,0,,,20,',
  '工事C,20,タスクB,2025-01-11,2025-01-15,5,0,協力,株式会社Y,,,120000,0,,,10,',
  '工事C,30,タスクC,2025-01-16,2025-01-18,3,0,社内,,20000,,0,0,,,,'
].join('\n')

describe('CSV dependency stats', () => {
  it('reports cycles and isolated nodes in stats.dep', async () => {
    const path = 'tests/tmp_dep_stats.csv'
    await fs.writeFile(path, DEP_CSV, 'utf8')
    const res = await parseCsv(path)
    expect(res.errors.length).toBe(0)
    expect(res.tasks.length).toBe(3)
    expect(res.stats.dep?.cycles).toBe(2)
    expect(res.stats.dep?.isolated).toBe(1)
    // cyclesList contains a sample 10->20
    expect(res.stats.dep?.cyclesList && res.stats.dep?.cyclesList[0].includes(10)).toBe(true)
  })
})
