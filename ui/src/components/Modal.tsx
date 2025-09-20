import React, { useEffect, useRef } from 'react'

export default function Modal({ open, title, onClose, children }: { open: boolean; title?: string; onClose?: () => void; children?: React.ReactNode }) {
  if (!open) return null
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
      }
      if (e.key === 'Tab') {
        const root = panelRef.current
        if (!root) return
        const focusables = Array.from(root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
        else if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div ref={panelRef} style={{ background: '#fff', borderRadius: 8, minWidth: 420, maxWidth: 720, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #eee' }}>
          <div style={{ fontWeight: 600 }}>{title ?? '情報'}</div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn" onClick={onClose} ref={closeRef} autoFocus>閉じる</button>
          </div>
        </div>
        <div style={{ padding: 12 }}>{children}</div>
      </div>
    </div>
  )
}
