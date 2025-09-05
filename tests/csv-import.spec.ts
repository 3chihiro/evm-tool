import { describe, it, expect } from 'vitest';
import { parseCsv } from '../evm-mvp-sprint1/parseCsv';
import type { ImportResult, TaskRow } from '../evm-mvp-sprint1/src.types';

const SAMPLE = 'sample_tasks.csv';

describe('CSV Import (Sprint1)', () => {
  it('parses sample_tasks.csv and returns ImportResult', async () => {
    const res: ImportResult = await parseCsv(SAMPLE);
    expect(res).toBeDefined();
    expect(res.errors.length).toBe(0);
    expect(res.stats.rows).toBe(3);
    expect(res.stats.imported).toBe(3);
    expect(res.stats.failed).toBe(0);

    const tasks: TaskRow[] = res.tasks;
    expect(tasks.length).toBe(3);

    // Check a specific row mapping
    const t2 = tasks.find(t => t.taskId === 2)!;
    expect(t2.projectName).toBe('橋梁補修工事A');
    expect(t2.taskName).toBe('ケレン');
    expect(t2.start).toBe('2025-01-11');
    expect(t2.finish).toBe('2025-01-15');
    expect(t2.durationDays).toBe(5);
    expect(t2.progressPercent).toBe(80);
    expect(t2.resourceType).toBe('社内');
    expect(t2.contractorName).toBeUndefined();
    expect(t2.unitCost).toBe(20000);
    expect(t2.contractAmount).toBeUndefined();
    expect(t2.plannedCost).toBe(100000);
    expect(t2.actualCost).toBe(80000);
  });

  it('reports errors on invalid data rows', async () => {
    // Create a tiny malformed CSV inline by writing to a temp file
    const badPath = 'tests/tmp_bad.csv';
    const csv = [
      'ProjectName,TaskID,TaskName,Start,Finish,DurationDays,ProgressPercent,ResourceType,ContractorName,UnitCost,ContractAmount,PlannedCost,ActualCost,Notes',
      '工事B,XYZ,不正行,2025/01/01,2025-01-02,,,,,,,,,'
    ].join('\n');
    const fs = await import('fs/promises');
    await fs.writeFile(badPath, csv, 'utf8');

    const res = await parseCsv(badPath);
    expect(res.stats.rows).toBe(1);
    expect(res.stats.imported).toBe(0);
    expect(res.stats.failed).toBe(1);
    expect(res.errors.some(e => e.column === 'TaskID')).toBe(true);
    expect(res.errors.some(e => e.column === 'Start')).toBe(true);
  });
});

