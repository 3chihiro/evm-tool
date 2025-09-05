import { describe, it, expect } from 'vitest';
import { parseCsv } from '../evm-mvp-sprint1/parseCsv';
import { buildTaskTable } from '../evm-mvp-sprint2/table';

describe('Task Table', () => {
  it('formats tasks into a table with yen and percent', async () => {
    const res = await parseCsv('sample_tasks.csv');
    expect(res.errors.length).toBe(0);
    const table = buildTaskTable(res.tasks);
    expect(table.columns[0]).toBe('TaskID');
    expect(table.rows.length).toBe(3);
    // 2nd row (TaskID=2)
    const row2 = table.rows.find(r => r[0] === 2)!;
    expect(row2[1]).toBe('ケレン');
    expect(row2[4]).toBe(5);
    expect(row2[5]).toBe('80%');
    expect(row2[8]).toBe('¥20,000');
    expect(row2[10]).toBe('¥100,000');
    expect(row2[11]).toBe('¥80,000');
  });
});

