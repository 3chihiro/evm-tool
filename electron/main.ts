import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import fs from 'node:fs';

// simple logger to both console and file
const logFile = join(process.cwd(), 'electron.log');
function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}`;
  try {
    fs.appendFileSync(logFile, line + '\n');
  } catch {}
  // still echo to console for dev.log
  // eslint-disable-next-line no-console
  console.log(`[main] ${line}`);
}

let mainWindow: BrowserWindow | null = null;

async function waitForUrl(url: string, timeoutMs = 8000, intervalMs = 200): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), Math.min(intervalMs, 1000));
      const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal }).catch(() => null);
      clearTimeout(id);
      if (res && (res.ok || res.status === 200)) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function createWindow() {
  log('Creating BrowserWindow');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.on('closed', () => {
    log('Main window closed');
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDesc, validatedURL) => {
    log(`did-fail-load code=${errorCode} desc=${errorDesc} url=${validatedURL}`);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    log('did-finish-load');
  });
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    log(`console[${level}] ${sourceId}:${line} ${message}`);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log(`render-process-gone: ${details.reason}`);
  });

  const isDev = !!process.env.VITE_DEV;
  const devPort = Number(process.env.VITE_PORT || 5173);
  const devHost = process.env.VITE_HOST || '127.0.0.1';
  const devUrl = `http://${devHost}:${devPort}`;
  log(`isDev=${isDev} devUrl=${devUrl}`);
  if (isDev) {
    (async () => {
      const ok = await waitForUrl(devUrl, 8000);
      if (ok) {
        log(`dev server alive: ${devUrl}`);
        await mainWindow!.loadURL(devUrl);
        log(`loadURL ${devUrl} ok`);
        try { mainWindow!.webContents.openDevTools({ mode: 'detach' }); } catch {}
      } else {
        log(`dev server unreachable: ${devUrl}. Trying fallback file...`);
        const indexHtml = join(process.cwd(), 'ui', 'dist', 'index.html');
        if (fs.existsSync(indexHtml)) {
          log(`Fallback to built ui: ${indexHtml}`);
          await mainWindow!.loadFile(indexHtml);
        } else {
          log('No built UI found. Showing inline error page.');
          const html = `data:text/html;charset=utf-8,` + encodeURIComponent(`
            <html><body style="font-family: system-ui; padding:16px;">
            <h2>UI dev server に接続できませんでした</h2>
            <p>以下のいずれかを実行してください:</p>
            <ol>
              <li>別ターミナルで <code>npm run ui:dev -- --port 5173</code> を起動</li>
              <li>または <code>npm run build:renderer</code> 後に再起動（ビルド済みUI読み込み）</li>
            </ol>
            <p>現在の設定: <code>${devUrl}</code></p>
            </body></html>
          `);
          await mainWindow!.loadURL(html);
        }
      }
    })();
  } else {
    const indexHtml = join(process.cwd(), 'ui', 'dist', 'index.html');
    log(`Loading file: ${indexHtml}`);
    mainWindow.loadFile(indexHtml);
  }
}

app.whenReady().then(() => {
  log('App ready');
  createWindow();

  app.on('activate', () => {
    log('App activate');
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  log('window-all-closed');
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (err) => {
  log(`uncaughtException: ${err?.stack || err}`);
});
process.on('unhandledRejection', (reason) => {
  log(`unhandledRejection: ${reason}` as any);
});
