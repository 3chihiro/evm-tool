export type ResourceType = '社内' | '協力';

export interface TaskRow {
  projectName: string;
  taskId: number;
  taskName: string;
  start: string; // YYYY-MM-DD
  finish: string; // YYYY-MM-DD
  actualStart?: string; // optional for interactive actual bar
  actualFinish?: string;
  durationDays?: number;
  progressPercent?: number;
  resourceType?: ResourceType;
  contractorName?: string;
  unitCost?: number;
  contractAmount?: number;
  plannedCost?: number;
  actualCost?: number;
  notes?: string;
  // Optional: predecessor task IDs for dependency constraints (Phase2+)
  predIds?: number[];
}

export interface ImportError {
  row: number; // 1-based, includes header row in count
  column?: string;
  message: string;
  value?: string;
}

export interface ImportResult {
  tasks: TaskRow[];
  errors: ImportError[];
  stats: {
    rows: number; // data rows (excluding header)
    imported: number;
    failed: number; // rows with at least one error considered failed
  };
}
