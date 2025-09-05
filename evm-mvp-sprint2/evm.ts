import { formatYen } from './money';

export interface EVMMetrics {
  PV?: number; // Planned Value (currency)
  EV?: number; // Earned Value (currency)
  AC?: number; // Actual Cost (currency)
  SV?: number; // Schedule Variance (currency)
  CV?: number; // Cost Variance (currency)
  SPI?: number; // Schedule Performance Index
  CPI?: number; // Cost Performance Index
}

export interface EVMSkeletonView {
  labels: string[]; // [PV,EV,AC,SV,CV,SPI,CPI]
  values: (string | number)[]; // formatted string for currency, raw for indices
}

export function buildEVMSkeleton(metrics: Partial<EVMMetrics> = {}): EVMSkeletonView {
  const PV = metrics.PV ?? 0;
  const EV = metrics.EV ?? 0;
  const AC = metrics.AC ?? 0;
  const SV = metrics.SV ?? (EV - PV);
  const CV = metrics.CV ?? (EV - AC);
  const SPI = metrics.SPI ?? (PV === 0 ? 0 : EV / PV);
  const CPI = metrics.CPI ?? (AC === 0 ? 0 : EV / AC);

  return {
    labels: ['PV','EV','AC','SV','CV','SPI','CPI'],
    values: [
      formatYen(PV),
      formatYen(EV),
      formatYen(AC),
      formatYen(SV),
      formatYen(CV),
      Number.isFinite(SPI) ? Number(SPI.toFixed(3)) : 0,
      Number.isFinite(CPI) ? Number(CPI.toFixed(3)) : 0,
    ],
  };
}

