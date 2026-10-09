// Dritarja e programit në Windows: hap faqen e programit (app/index.html) si program më vete.
const { app, BrowserWindow, Menu, clipboard, shell } = require('electron');
const path = require('node:path');
const edition = require('./app/edition.json');

app.setAppUserModelId(edition.appId);
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

/** Adresa e kontaktit të AllSolutionTech, te menyja Contact. */
const CONTACT_EMAIL = 'info@allsolutiontech.de';

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
  const external = (url) => /^(https?|mailto):/i.test(url) && shell.openExternal(url);
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
      {
        label: 'Contact',
        submenu: [
          { label: `E-mail: ${CONTACT_EMAIL}`, click: () => shell.openExternal(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(edition.name)}`) },
          { label: 'Copy e-mail', click: () => clipboard.writeText(CONTACT_EMAIL) },
        ],
      },
    ]),
  );
  createWindow();
});

app.on('window-all-closed', () => app.quit());
