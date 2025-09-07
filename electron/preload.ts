import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('appBridge', {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  exportPDF: async (options?: { landscape?: boolean }) => {
    return ipcRenderer.invoke('export-pdf', options ?? {}) as Promise<string | null>
  },
});
