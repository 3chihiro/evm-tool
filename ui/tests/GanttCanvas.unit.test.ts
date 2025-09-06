import { describe, it, expect } from 'vitest'
import { __test } from '../src/components/GanttCanvas'

describe('GanttCanvas helpers', () => {
  it('dateToX returns non-negative for chart range', () => {
    const cfg = { pxPerDay: 10 }
    const x = __test.dateToX('2024-01-05', '2024-01-01', cfg as any)
    expect(x).toBe(40)
  })
})

