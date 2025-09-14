import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import { parseCsv } from '../evm-mvp-sprint1/parseCsv'
import type { ImportResult, TaskRow } from '../evm-mvp-sprint1/src.types'

function bom(s: string) {
  return '\uFEFF' + s
}

describe('CSV Import - edge cases', () => {
  it('handles BOM, CRLF, quoted commas/quotes, and numeric commas', async () => {
    const path = 'tests/tmp_edge.csv'
    const rows = [
      'ProjectName,TaskID,TaskName,Start,Finish,DurationDays,ProgressPercent,ResourceType,ContractorName,UnitCost,ContractAmount,PlannedCost,ActualCost,ActualStart,ActualFinish,Dependencies,Notes',
      // ContractorName contains comma, Notes contains escaped quotes, numeric with commas/spaces, deps with spaces and junk
      '工事Z,101,"タスク, カンマ",2025-02-01,2025-02-05, 5 , 75 ,協力,"塗装工業,株式会社","50,000","300,000","120,000","80,000",2025-02-02,2025-02-04,"101, x","メモ ""重要"""',
    ]
    // Join with CRLF and prepend BOM
    const csv = bom(rows.join('\r\n'))
    await fs.writeFile(path, csv, 'utf8')

    const res: ImportResult = await parseCsv(path)
    expect(res.errors).toEqual([])
    expect(res.stats.rows).toBe(1)
    expect(res.stats.imported).toBe(1)
    expect(res.stats.failed).toBe(0)

    const t: TaskRow = res.tasks[0]
    expect(t.taskId).toBe(101)
    expect(t.taskName).toBe('タスク, カンマ')
    expect(t.contractorName).toBe('塗装工業,株式会社')
    expect(t.unitCost).toBe(50000)
    expect(t.contractAmount).toBe(300000)
    expect(t.plannedCost).toBe(120000)
    expect(t.actualCost).toBe(80000)
    expect(t.actualStart).toBe('2025-02-02')
    expect(t.actualFinish).toBe('2025-02-04')
    expect(t.predIds).toEqual([101])
    expect(t.notes).toBe('メモ "重要"')
  })
})
