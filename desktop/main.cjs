// Dritarja e programit në Windows: hap faqen e programit (app/index.html) si program më vete.
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const edition = require('./app/edition.json');

app.setAppUserModelId(edition.appId);
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: edition.name,
    icon: path.join(__dirname, 'app', 'icon.png'),
    backgroundColor: '#16191E',
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false, preload: path.join(__dirname, 'preload.cjs') },
  });
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });
  // lidhjet e jashtme hapen në shfletues, jo brenda programit
  const external = (url) => /^https?:/i.test(url) && shell.openExternal(url);
  win.webContents.setWindowOpenHandler(({ url }) => {
    external(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file:')) return;
    e.preventDefault();
    external(url);
  });
  win.on('closed', () => (win = null));
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

// Llojet e skedarëve që ruan programi, për filtrin e dritares "Ruaj si".
const FILTERS = {
  json: { name: 'AllSolutionTech CAD', extensions: ['json'] },
  pdf: { name: 'PDF', extensions: ['pdf'] },
  dxf: { name: 'DXF (AutoCAD, ActCAD)', extensions: ['dxf'] },
  csv: { name: 'CSV (Excel)', extensions: ['csv'] },
  html: { name: 'HTML', extensions: ['html'] },
};

ipcMain.handle('ast:save-file', async (event, { filename, data }) => {
  const name = path.basename(String(filename || 'projekt'));
  const ext = path.extname(name).slice(1).toLowerCase();
  const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  // provat automatike ruajnë pa dritare në këtë dosje
  const testDir = process.env.AST_TEST_SAVE_DIR;
  let target = testDir ? path.join(testDir, name) : null;
  if (!target) {
    const owner = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const res = await dialog.showSaveDialog(owner, {
      defaultPath: path.join(app.getPath('documents'), name),
      filters: [...(FILTERS[ext] ? [FILTERS[ext]] : []), { name: 'All files', extensions: ['*'] }],
    });
    if (res.canceled || !res.filePath) return 'declined';
    target = res.filePath;
  }
  await fs.writeFile(target, bytes);
  return 'saved';
});

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'fileMenu' },
      { role: 'editMenu' },
      {
        label: 'View',
        submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }],
      },
    ]),
  );
  createWindow();
});

app.on('window-all-closed', () => app.quit());
