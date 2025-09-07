import React, { useMemo } from 'react'
import { formatJPY } from '../../../src/adapters'
import type { TaskRow } from '../../../evm-mvp-sprint1/src.types'
import { computeEVM, type Calendar } from '../../../evm-mvp-sprint1/evm'

export default function EvmCard({ tasks, calendar }: { tasks: TaskRow[]; calendar: Calendar }) {
  const evm = useMemo(() => {
    const asOf = new Date().toISOString().slice(0, 10)
    return computeEVM(
      tasks.map((t) => ({
        start: t.start,
        finish: t.finish,
        plannedCost: t.plannedCost,
        progressPercent: t.progressPercent,
        actualCost: t.actualCost,
        resourceType: t.resourceType,
        unitCost: t.unitCost,
        contractAmount: t.contractAmount,
        durationDays: t.durationDays,
      })),
      asOf,
      calendar,
    )
  }, [tasks, calendar])
  const items: Array<[string, string]> = [
    ['PV', formatJPY(evm.PV)],
    ['EV', formatJPY(evm.EV)],
    ['AC', formatJPY(evm.AC)],
    ['SV', formatJPY(evm.SV)],
    ['CV', formatJPY(evm.CV)],
    ['SPI', evm.SPI.toFixed(2)],
    ['CPI', evm.CPI.toFixed(2)],
  ]

  return (
    <div className="card">
      <div className="panel-title">EVM</div>
      <div className="evm-grid">
        {items.map(([k, v]) => (
          <div key={k} className="evm-item">
            <div className="evm-label">{k}</div>
            <div className="evm-value">{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
