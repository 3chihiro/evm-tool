import { promises as fs } from 'fs';
import { ImportError, ImportResult, ResourceType, TaskRow } from './src.types';

type RowObject = Record<string, string>;

const REQUIRED_HEADERS: string[] = [
  'ProjectName',
  'TaskID',
  'TaskName',
  'Start',
  'Finish',
];

const OPTIONAL_HEADERS: string[] = [
  'DurationDays',
  'ProgressPercent',
  'ResourceType',
  'ContractorName',
  'UnitCost',
  'ContractAmount',
  'PlannedCost',
  'ActualCost',
  'ActualStart',
  'ActualFinish',
  'Dependencies',
  'Notes',
];

function stripBOM(s: string): string {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

function parseCsvText(csv: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const n = csv.length;
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  while (i < n) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        // lookahead for escaped quote
        if (i + 1 < n && csv[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        row.push(field);
        field = '';
        i++;
        continue;
      }
      if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        continue;
      }
      if (ch === '\r') {
        // handle CRLF or lone CR
        if (i + 1 < n && csv[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        continue;
      }
      field += ch;
      i++;
    }
  }
  // flush last field/row
  row.push(field);
  rows.push(row);
  // remove possible trailing blank row caused by ending newline
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }
  return rows;
}

function toHeaderIndexMap(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((h, idx) => {
    const key = stripBOM(h).trim();
    map[key] = idx;
  });
  return map;
}

function getCell(row: string[], idx: number): string | undefined {
  if (idx < 0 || idx >= row.length) return undefined;
  const v = row[idx];
  if (v == null) return undefined;
  return v.trim();
}

function parseNumber(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const t = s.replace(/[,\s]/g, '');
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function parseDateString(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return undefined;
  return t;
}

function parseResourceType(s: string | undefined): ResourceType | undefined {
  if (!s) return undefined;
  const t = s.trim();
  if (t === '社内' || t === '協力') return t;
  return undefined;
}

export async function parseCsv(filePath: string): Promise<ImportResult> {
  const raw = await fs.readFile(filePath, 'utf8');
  const rows = parseCsvText(raw);
  if (rows.length === 0) {
    return { tasks: [], errors: [], stats: { rows: 0, imported: 0, failed: 0 } };
  }
  const header = rows[0];
  const hmap = toHeaderIndexMap(header);
  const errors: ImportError[] = [];
  const tasks: TaskRow[] = [];

  for (const rh of REQUIRED_HEADERS) {
    if (!(rh in hmap)) {
      errors.push({ row: 1, column: rh, message: `Missing header: ${rh}` });
    }
  }
  if (errors.length) {
    return { tasks, errors, stats: { rows: Math.max(0, rows.length - 1), imported: 0, failed: Math.max(0, rows.length - 1) } };
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowErrors: ImportError[] = [];

    const cell = (name: string) => getCell(row, hmap[name] ?? -1);

    const projectName = cell('ProjectName') ?? '';
    const taskIdNum = parseNumber(cell('TaskID'));
    const taskName = cell('TaskName') ?? '';
    const startStr = parseDateString(cell('Start'));
    const finishStr = parseDateString(cell('Finish'));
    const durationDays = parseNumber(cell('DurationDays'));
    const progressPercent = parseNumber(cell('ProgressPercent'));
    const resourceType = parseResourceType(cell('ResourceType'));
    const contractorName = cell('ContractorName') || undefined;
    const unitCost = parseNumber(cell('UnitCost'));
    const contractAmount = parseNumber(cell('ContractAmount'));
    const plannedCost = parseNumber(cell('PlannedCost'));
    const actualCost = parseNumber(cell('ActualCost'));
    const actualStart = parseDateString(cell('ActualStart'));
    const actualFinish = parseDateString(cell('ActualFinish'));
    const depsRaw = cell('Dependencies');
    const predIds = depsRaw && depsRaw.trim() !== ''
      ? depsRaw.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n))
      : undefined;
    const notes = cell('Notes') || undefined;

    if (!projectName) rowErrors.push({ row: r + 1, column: 'ProjectName', message: 'ProjectName required' });
    if (taskIdNum == null) rowErrors.push({ row: r + 1, column: 'TaskID', message: 'TaskID required as number', value: cell('TaskID') });
    if (!taskName) rowErrors.push({ row: r + 1, column: 'TaskName', message: 'TaskName required' });
    if (!startStr) rowErrors.push({ row: r + 1, column: 'Start', message: 'Start must be YYYY-MM-DD', value: cell('Start') });
    if (!finishStr) rowErrors.push({ row: r + 1, column: 'Finish', message: 'Finish must be YYYY-MM-DD', value: cell('Finish') });
    if (cell('ResourceType')) {
      if (!resourceType) rowErrors.push({ row: r + 1, column: 'ResourceType', message: 'ResourceType must be 社内 or 協力', value: cell('ResourceType') });
    }

    const task: TaskRow = {
      projectName,
      taskId: taskIdNum ?? NaN,
      taskName,
      start: startStr ?? '',
      finish: finishStr ?? '',
      durationDays: durationDays,
      progressPercent: progressPercent,
      resourceType: resourceType,
      contractorName,
      unitCost,
      contractAmount,
      plannedCost,
      actualCost,
      notes,
      actualStart,
      actualFinish,
      predIds,
    };

    if (rowErrors.length === 0) {
      tasks.push(task);
    }
    errors.push(...rowErrors);
  }

  const dataRows = Math.max(0, rows.length - 1);
  const failed = errors.reduce((acc, e) => acc.add(e.row), new Set<number>()).size - (errors.some(e => e.row === 1) ? 1 : 0);
  const imported = tasks.length;
  return { tasks, errors, stats: { rows: dataRows, imported, failed: Math.max(0, failed) } };
}
