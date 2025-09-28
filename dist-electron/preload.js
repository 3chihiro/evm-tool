"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('appBridge', {
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },
    exportPDF: async (options) => {
        return electron_1.ipcRenderer.invoke('export-pdf', options ?? {});
    },
});
