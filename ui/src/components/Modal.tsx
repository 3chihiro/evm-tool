import React from 'react'

export default function Modal({ open, title, onClose, children }: { open: boolean; title?: string; onClose?: () => void; children?: React.ReactNode }) {
  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 8, minWidth: 420, maxWidth: 720, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #eee' }}>
          <div style={{ fontWeight: 600 }}>{title ?? '情報'}</div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn" onClick={onClose}>閉じる</button>
          </div>
        </div>
        <div style={{ padding: 12 }}>{children}</div>
      </div>
    </div>
  )
}

