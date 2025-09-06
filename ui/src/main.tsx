import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Global error hooks to surface issues in Electron logs
window.addEventListener('error', (e) => {
  // eslint-disable-next-line no-console
  console.error('[renderer] window.error', e.message, e.error?.stack || '')
})
window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  // eslint-disable-next-line no-console
  console.error('[renderer] unhandledrejection', e.reason)
})

const container = document.getElementById('root')!
const root = createRoot(container)
console.log('[renderer] mount start')
try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  console.log('[renderer] mount done')
} catch (err: any) {
  console.error('[renderer] render error', err?.stack || err)
  container.innerHTML = `<pre style="color:#c00">Render Error: ${String(err)}</pre>`
}

