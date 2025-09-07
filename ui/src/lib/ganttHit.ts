export type DragKind = 'none' | 'move' | 'resize-left' | 'resize-right'
// yBar/hBar are optional; when provided, vertical hit area is constrained to the bar band.
export type Hit = { id: string; x: number; y: number; w: number; row: number; yBar?: number; hBar?: number }

export function hitTest(mx: number, my: number, rows: Hit[], rowH = 28, pad = 4): { id: string; kind: DragKind } | null {
  for (const h of rows) {
    const yTop = typeof h.yBar === 'number' && typeof h.hBar === 'number' ? (h.yBar as number) - pad : h.y
    const yBottom = typeof h.yBar === 'number' && typeof h.hBar === 'number' ? (h.yBar as number) + (h.hBar as number) + pad : h.y + rowH
    if (my >= yTop && my <= yBottom && mx >= h.x - pad && mx <= h.x + h.w + pad) {
      if (mx <= h.x + 6) return { id: h.id, kind: 'resize-left' }
      if (mx >= h.x + h.w - 6) return { id: h.id, kind: 'resize-right' }
      return { id: h.id, kind: 'move' }
    }
  }
  return null
}

export const snapPx = (x: number, pxPerDay: number) => Math.round(x / pxPerDay) * pxPerDay
