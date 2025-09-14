import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import { parseCsv } from '../evm-mvp-sprint1/parseCsv'
import { toCsvText } from '../evm-mvp-sprint1/exportCsv'
import type { TaskRow } from '../evm-mvp-sprint1/src.types'

function normalizeForCompare(t: TaskRow) {
  // 比較に使う主要フィールド（sample_tasks.csv に揃える）
  return {
    projectName: t.projectName,
    taskId: t.taskId,
    taskName: t.taskName,
    start: t.start,
    finish: t.finish,
    durationDays: t.durationDays,
    progressPercent: t.progressPercent,
    resourceType: t.resourceType,
    contractorName: t.contractorName,
    unitCost: t.unitCost,
    contractAmount: t.contractAmount,
    plannedCost: t.plannedCost,
    actualCost: t.actualCost,
    notes: t.notes,
  }
}

describe('CSV round-trip (parse -> export -> parse)', () => {
  it('preserves task semantics for sample_tasks.csv', async () => {
    const srcPath = 'sample_tasks.csv'
    const tmpPath = 'tests/tmp_round.csv'

    const first = await parseCsv(srcPath)
    expect(first.errors).toEqual([])
    const text = toCsvText(first.tasks)
    await fs.writeFile(tmpPath, text, 'utf8')

    const second = await parseCsv(tmpPath)
    expect(second.errors).toEqual([])

    // taskId でソートして比較
    const a = [...first.tasks].sort((x, y) => x.taskId - y.taskId).map(normalizeForCompare)
    const b = [...second.tasks].sort((x, y) => x.taskId - y.taskId).map(normalizeForCompare)
    expect(b).toEqual(a)
  })
})

