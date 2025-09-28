"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: (0, node_path_1.join)(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    const isDev = !!process.env.VITE_DEV;
    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        // In packaged app, resolve relative to compiled main.js directory
        const indexHtml = (0, node_path_1.join)(__dirname, '..', 'ui', 'dist', 'index.html');
        win.loadFile(indexHtml);
    }
    // Debug diagnostics for white screen
    win.webContents.on('did-fail-load', (_e, code, desc) => {
        const html = `<h2>Renderer failed to load</h2><p>${code}: ${desc}</p>`;
        win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    });
    win.webContents.on('render-process-gone', (_e, details) => {
        const html = `<h2>Renderer crashed</h2><pre>${JSON.stringify(details)}</pre>`;
        win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    });
    win.on('unresponsive', () => {
        const html = `<h2>Window unresponsive</h2><p>Please restart the app.</p>`;
        win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.ipcMain.handle('export-pdf', async (_evt, opts = {}) => {
    const win = electron_1.BrowserWindow.getFocusedWindow() ?? electron_1.BrowserWindow.getAllWindows()[0];
    if (!win)
        return null;
    const { filePath, canceled } = await electron_1.dialog.showSaveDialog(win, {
        title: 'PDF出力',
        defaultPath: (0, node_path_1.join)(electron_1.app.getPath('desktop'), 'evm-report.pdf'),
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (canceled || !filePath)
        return null;
    const pdf = await win.webContents.printToPDF({
        landscape: !!opts.landscape,
        printBackground: true,
        margins: { marginType: 0 },
        pageSize: 'A4',
    });
    await node_fs_1.promises.writeFile(filePath, pdf);
    return filePath;
});
