import * as path from 'node:path';
import { app, BrowserWindow, shell } from 'electron';

const productionRendererUrl = process.env.ELECTRON_PRODUCTION_URL ?? 'https://app.rcpexim.com';

const getRendererUrl = () => {
  if (process.env.ELECTRON_RENDERER_URL) return process.env.ELECTRON_RENDERER_URL;
  const url = new URL(productionRendererUrl);
  if (url.protocol !== 'https:') throw new Error('The production renderer URL must use HTTPS');
  return url.toString();
};

const createWindow = async () => {
  const rendererUrl = getRendererUrl();
  const allowedOrigin = new URL(rendererUrl).origin;
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Dhakad Grading Plant',
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'icon.png')
      : path.resolve(__dirname, '../../../frontend/public/icons/pwa-512.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  );
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).origin === allowedOrigin) void window.loadURL(url);
      else if (url.startsWith('https://')) void shell.openExternal(url);
    } catch {
      // Invalid and non-HTTPS URLs remain blocked.
    }
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    try {
      if (new URL(url).origin !== allowedOrigin) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });
  window.webContents.on('did-fail-load', (_event, errorCode, _description, url, isMainFrame) => {
    if (!app.isPackaged || !isMainFrame || errorCode === -3 || url.startsWith('file://')) return;
    void window.loadFile(path.join(process.resourcesPath, 'offline.html'));
  });
  window.once('ready-to-show', () => window.show());
  await window.loadURL(rendererUrl);
};

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });
  void app
    .whenReady()
    .then(async () => {
      await createWindow();
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) void createWindow();
      });
    })
    .catch(console.error);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
