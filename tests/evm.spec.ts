import { describe, it, expect } from 'vitest'
import { computeEVM, countWorkingDays, dailyRateFromContract, DefaultCalendar } from '../evm-mvp-sprint1/evm'

describe('EVM calculations (initial spec)', () => {
  it('TC-001: 5 working days, PV/EV/AC at day3, progress 60%, AC=55,000', () => {
    const tasks = [
      {
        start: '2025-01-06', // Mon
        finish: '2025-01-10', // Fri (5 working days)
        plannedCost: 100_000,
        progressPercent: 60,
        actualCost: 55_000,
      },
    ]
    const asOf = '2025-01-08' // Wed (3rd working day)
    const evm = computeEVM(tasks, asOf, DefaultCalendar)

    expect(evm.PV).toBe(60_000)
    expect(evm.EV).toBe(60_000)
    expect(evm.AC).toBe(55_000)
    expect(evm.SV).toBe(0)
    expect(evm.CV).toBe(5_000)
    expect(evm.SPI).toBeCloseTo(1, 1e-6)
    expect(evm.CPI).toBeCloseTo(60_000 / 55_000, 1e-6)
  })

  it('TC-002: 7-day span including weekend + 1 holiday excluded => working days = 5', () => {
    const cal = { holidays: ['2025-01-12'] } // Sun holiday (does not change weekdays)
    const wd = countWorkingDays('2025-01-06', '2025-01-12', cal)
    expect(wd).toBe(5)
  })

  it('TC-003: Contractor daily rate from contract', () => {
    const rate = dailyRateFromContract(1_000_000, 20)
    expect(rate).toBe(50_000)
  })
})

