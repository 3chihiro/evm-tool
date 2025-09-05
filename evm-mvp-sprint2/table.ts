import type { TaskRow } from '../evm-mvp-sprint1/src.types';
import { formatYen } from './money';

export interface TableModel {
  columns: string[];
  rows: (string | number | null | undefined)[][];
}

function pct(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return '';
  return `${Math.round(v)}%`;
}

export function buildTaskTable(tasks: TaskRow[]): TableModel {
  const columns = [
    'TaskID', 'TaskName', 'Start', 'Finish', 'DurationDays', 'Progress', 'ResourceType', 'Contractor', 'UnitCost', 'ContractAmount', 'PlannedCost', 'ActualCost', 'Notes'
  ];
  const rows = tasks.map(t => [
    t.taskId,
    t.taskName,
    t.start,
    t.finish,
    t.durationDays ?? '',
    pct(t.progressPercent),
    t.resourceType ?? '',
    t.contractorName ?? '',
    t.unitCost == null ? '' : formatYen(t.unitCost),
    t.contractAmount == null ? '' : formatYen(t.contractAmount),
    t.plannedCost == null ? '' : formatYen(t.plannedCost),
    t.actualCost == null ? '' : formatYen(t.actualCost),
    t.notes ?? '',
  ]);
  return { columns, rows };
}

