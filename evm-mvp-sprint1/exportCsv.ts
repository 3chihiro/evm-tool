import type { TaskRow } from './src.types'
import { promises as fs } from 'fs'

export function toCsvText(tasks: TaskRow[]): string {
  const headers = [
    'ProjectName','TaskID','TaskName','Start','Finish','DurationDays','ProgressPercent','ResourceType','ContractorName','UnitCost','ContractAmount','PlannedCost','ActualCost','ActualStart','ActualFinish','Dependencies','Notes'
  ]
  const esc = (s: string | number | undefined | null) => {
    if (s == null) return ''
    const t = String(s)
    if (t.includes(',') || t.includes('"') || t.includes('\n')) {
      return '"' + t.replace(/"/g, '""') + '"'
    }
    return t
  }
  const lines = [headers.join(',')]
  for (const t of tasks) {
    const deps = t.predIds && t.predIds.length ? t.predIds.join(',') : ''
    const row = [
      t.projectName,
      t.taskId,
      t.taskName,
      t.start,
      t.finish,
      t.durationDays,
      t.progressPercent,
      t.resourceType,
      t.contractorName,
      t.unitCost,
      t.contractAmount,
      t.plannedCost,
      t.actualCost,
      t.actualStart,
      t.actualFinish,
      deps,
      t.notes,
    ].map(esc)
    lines.push(row.join(','))
  }
  return lines.join('\n') + '\n'
}

export async function exportCsv(filePath: string, tasks: TaskRow[]): Promise<void> {
  const text = toCsvText(tasks)
  await fs.writeFile(filePath, text, 'utf8')
}

