// Dritarja e programit në Windows: hap faqen e programit (app/index.html) si program më vete.
const { app, BrowserWindow, Menu, clipboard, dialog, ipcMain, net, shell } = require('electron');
const { execFile } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const edition = require('./app/edition.json');
const { checkForUpdates, RELEASES_PAGE } = require('./update.cjs');

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
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false, preload: path.join(__dirname, 'preload.cjs') },
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

// Llojet e skedarëve që ruan programi, për filtrin e dritares "Ruaj si".
const FILTERS = {
  json: { name: 'AllSolutionTech CAD', extensions: ['json'] },
  pdf: { name: 'PDF', extensions: ['pdf'] },
  dxf: { name: 'DXF (AutoCAD, ActCAD)', extensions: ['dxf'] },
  csv: { name: 'CSV (Excel)', extensions: ['csv'] },
  html: { name: 'HTML', extensions: ['html'] },
  svg: { name: 'SVG', extensions: ['svg'] },
  png: { name: 'PNG', extensions: ['png'] },
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

// "Ruaj si": një dritare e vetme e Windows-it, ku zgjidhet edhe lloji i skedarit (PDF, DXF, ...).
// Faqja mund të shkruajë vetëm te shtegu që sapo zgjodhi përdoruesi në këtë dritare.
const chosenPaths = new Set();
ipcMain.handle('ast:save-as', async (event, { defaultName, filters }) => {
  const owner = BrowserWindow.fromWebContents(event.sender) ?? undefined;
  const list = (Array.isArray(filters) ? filters : [])
    .filter((f) => f && typeof f.name === 'string' && Array.isArray(f.extensions))
    .map((f) => ({ name: f.name, extensions: f.extensions.map(String) }));
  const res = await dialog.showSaveDialog(owner, {
    defaultPath: path.join(app.getPath('documents'), path.basename(String(defaultName || 'projekt'))),
    filters: list,
  });
  if (res.canceled || !res.filePath) return null;
  chosenPaths.add(res.filePath);
  return res.filePath;
});
ipcMain.handle('ast:write-file', async (event, { filePath, data }) => {
  if (!chosenPaths.has(filePath)) throw new Error('path not chosen');
  chosenPaths.delete(filePath);
  await fs.writeFile(filePath, typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data));
  return 'saved';
});

// Prova falas 7 ditë: pajisja është SHA-256 e "ast-cad|" + MachineGuid i Windows-it, që çinstalimi s'e rifillon provën.
// Kërkesa te serveri bëhet këtu, në procesin kryesor (net.fetch, pa Origin), jo nga faqja.
const TRIAL_URL = 'https://admin.allsolutiontech.de/api/cad/prova';
let deviceIdPromise = null;

function machineGuid() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(null);
    const reg = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe');
    execFile(reg, ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid', '/reg:64'], { windowsHide: true, timeout: 10000 }, (err, stdout) => {
      const m = !err && /MachineGuid\s+REG_SZ\s+(\S+)/i.exec(String(stdout));
      resolve(m ? m[1].trim() : null);
    });
  });
}

/** Identifikuesi i pajisjes; pa MachineGuid (rrallë), një identifikues i rastësishëm i ruajtur te programi. */
async function rawDeviceId() {
  const guid = await machineGuid();
  if (guid) return guid;
  const file = path.join(app.getPath('userData'), 'device-id.txt');
  const saved = await fs.readFile(file, 'utf8').catch(() => '');
  if (saved.trim()) return saved.trim();
  const id = crypto.randomUUID();
  await fs.writeFile(file, id).catch(() => {});
  return id;
}

const deviceId = () =>
  (deviceIdPromise ??= rawDeviceId().then((id) => crypto.createHash('sha256').update(`ast-cad|${id}`, 'utf8').digest('hex')));

ipcMain.handle('ast:device-id', () => deviceId());
ipcMain.handle('ast:trial', async () => {
  const res = await net.fetch(TRIAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pajisja: await deviceId(), programi: edition.id, platforma: 'windows' }),
  });
  return { status: res.status, text: await res.text() };
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
      {
        label: 'Contact',
        submenu: [
          { label: `E-mail: ${CONTACT_EMAIL}`, click: () => shell.openExternal(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(edition.name)}`) },
          { label: 'Copy e-mail', click: () => clipboard.writeText(CONTACT_EMAIL) },
        ],
      },
      {
        label: 'Help',
        submenu: [
          { label: 'Check for updates…', click: () => checkForUpdates(edition.name, true) },
          { label: 'Downloads page', click: () => shell.openExternal(RELEASES_PAGE) },
          { type: 'separator' },
          { label: `Version ${app.getVersion()}`, enabled: false },
        ],
      },
    ]),
  );
  createWindow();
  // kontroll i heshtur për version të ri pak pas hapjes (vetëm në programin e instaluar)
  if (app.isPackaged && !process.env.AST_TEST_SAVE_DIR) setTimeout(() => checkForUpdates(edition.name, false), 8000);
});

app.on('window-all-closed', () => app.quit());
