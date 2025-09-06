import React from 'react'
import { computeEvmStub, formatJPY } from '../../../src/adapters'

const tasks = [
  { id: 'T1', name: '企画', start: '2024-01-01', end: '2024-01-05', progress: 0.6 },
  { id: 'T2', name: '設計', start: '2024-01-03', end: '2024-01-10', progress: 0.3 },
]

export default function EvmCard() {
  const evm = computeEvmStub(tasks as any)
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
      <div className="panel-title">EVM（ダミー）</div>
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

