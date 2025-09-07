import { describe, it, expect } from 'vitest'
import { hitTest, snapPx, type Hit } from '../src/lib/ganttHit'

describe('ganttHit', () => {
  it('hitTest detects move and resize zones', () => {
    const rows: Hit[] = [{ id: '1', x: 100, y: 0, w: 40, row: 0 }]
    // left grip
    expect(hitTest(100, 10, rows)?.kind).toBe('resize-left')
    // right grip
    expect(hitTest(139, 10, rows)?.kind).toBe('resize-right')
    // middle
    expect(hitTest(120, 10, rows)?.kind).toBe('move')
    // outside
    expect(hitTest(50, 10, rows)).toBeNull()
  })

  it('snapPx rounds to nearest day in px', () => {
    expect(snapPx(7, 16)).toBe(6) // ~0.375 day -> 0.375*16≈6, nearest 0
    expect(snapPx(9, 16)).toBe(10)
    expect(snapPx(24, 16)).toBe(22)
    expect(snapPx(25, 16)).toBe(26)
  })
})

