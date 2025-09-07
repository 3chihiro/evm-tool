export {}
declare global {
  interface Window {
    appBridge: {
      versions: { node: string; chrome: string; electron: string }
      exportPDF: (options?: { landscape?: boolean }) => Promise<string | null>
    }
  }
}

