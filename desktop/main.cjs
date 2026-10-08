// Dritarja e programit në Windows: hap faqen e programit (app/index.html) si program më vete.
const { app, BrowserWindow, Menu, shell } = require('electron');
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
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false },
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
