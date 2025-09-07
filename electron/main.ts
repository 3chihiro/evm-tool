import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !!process.env.VITE_DEV;
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    const indexHtml = join(process.cwd(), 'ui', 'dist', 'index.html');
    win.loadFile(indexHtml);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('export-pdf', async (_evt, opts: { landscape?: boolean } = {}) => {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  if (!win) return null
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'PDF出力',
    defaultPath: join(app.getPath('desktop'), 'evm-report.pdf'),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return null
  const pdf = await win.webContents.printToPDF({
    landscape: !!opts.landscape,
    printBackground: true,
    margins: { marginType: 0 },
    pageSize: 'A4',
  } as any)
  await fs.writeFile(filePath, pdf)
  return filePath
})
