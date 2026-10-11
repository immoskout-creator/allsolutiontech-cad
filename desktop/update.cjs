// Përditësimi i programit: kontrollon versionin e fundit te faqja "Releases" në GitHub,
// shkarkon instaluesin e këtij programi dhe e hap; instaluesi zëvendëson versionin e vjetër.
const { app, dialog, net, shell, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { installerName, isNewer, versionFromTitle } = require('./version.cjs');

const REPO = 'immoskout-creator/allsolutiontech-cad';
const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/tags/windows-latest`;
const RELEASES_PAGE = `https://github.com/${REPO}/releases/tag/windows-latest`;

const TEXT = {
  sq: {
    title: 'Përditësimi',
    available: (v, cur) => `Ka dalë versioni i ri ${v} (ti ke ${cur}).\nTa shkarkoj dhe ta instaloj tani? Programi mbyllet gjatë instalimit; projekti ruhet automatikisht.`,
    yes: 'Po, përditësoje',
    later: 'Më vonë',
    latest: (cur) => `Ke versionin më të fundit (${cur}).`,
    failed: 'Përditësimi nuk u kontrollua (pa internet?). Mund ta shkarkosh edhe nga faqja e shkarkimeve.',
    open: 'Hap faqen e shkarkimeve',
    ok: 'Mirë',
  },
  de: {
    title: 'Update',
    available: (v, cur) => `Version ${v} ist verfügbar (installiert: ${cur}).\nJetzt herunterladen und installieren? Das Programm wird dabei geschlossen; das Projekt wird automatisch gespeichert.`,
    yes: 'Ja, aktualisieren',
    later: 'Später',
    latest: (cur) => `Du hast die neueste Version (${cur}).`,
    failed: 'Update konnte nicht geprüft werden (keine Internetverbindung?). Du kannst es auch von der Download-Seite laden.',
    open: 'Download-Seite öffnen',
    ok: 'OK',
  },
  it: {
    title: 'Aggiornamento',
    available: (v, cur) => `È disponibile la versione ${v} (installata: ${cur}).\nScaricarla e installarla ora? Il programma si chiude durante l'installazione; il progetto è salvato automaticamente.`,
    yes: 'Sì, aggiorna',
    later: 'Più tardi',
    latest: (cur) => `Hai l'ultima versione (${cur}).`,
    failed: "Impossibile controllare l'aggiornamento (niente internet?). Puoi scaricarlo anche dalla pagina dei download.",
    open: 'Apri la pagina dei download',
    ok: 'OK',
  },
  en: {
    title: 'Update',
    available: (v, cur) => `Version ${v} is available (you have ${cur}).\nDownload and install it now? The program closes during the install; your project is saved automatically.`,
    yes: 'Yes, update',
    later: 'Later',
    latest: (cur) => `You have the latest version (${cur}).`,
    failed: 'Could not check for updates (no internet?). You can also download it from the downloads page.',
    open: 'Open downloads page',
    ok: 'OK',
  },
};
const text = () => {
  const l = app.getLocale().slice(0, 2);
  return TEXT[l] || TEXT.en;
};

let busy = false;

/** Kontrollon për version të ri. manual = e kërkoi përdoruesi nga menyja (tregon edhe "s'ka gjë të re" dhe gabimet). */
async function checkForUpdates(editionName, manual) {
  if (busy) return;
  busy = true;
  const T = text();
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  try {
    const res = await net.fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'AllSolutionTech-CAD' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rel = await res.json();
    const latest = versionFromTitle(rel.name);
    const current = app.getVersion();
    const asset = (rel.assets || []).find((a) => a.name === installerName(editionName));
    if (!latest || !asset || !isNewer(latest, current)) {
      if (manual) await dialog.showMessageBox(win, { type: 'info', title: T.title, message: T.latest(current), buttons: [T.ok] });
      return;
    }
    const answer = await dialog.showMessageBox(win, { type: 'question', title: T.title, message: T.available(latest, current), buttons: [T.yes, T.later], defaultId: 0, cancelId: 1 });
    if (answer.response !== 0) return;
    const file = path.join(app.getPath('temp'), asset.name);
    await download(asset.browser_download_url, file, asset.size, win);
    const err = await shell.openPath(file);
    if (err) throw new Error(err);
    app.quit();
  } catch (e) {
    if (win) win.setProgressBar(-1);
    if (!manual) return;
    const r = await dialog.showMessageBox(win, { type: 'warning', title: T.title, message: T.failed, detail: String(e && e.message ? e.message : e), buttons: [T.open, T.ok], defaultId: 0, cancelId: 1 });
    if (r.response === 0) shell.openExternal(RELEASES_PAGE);
  } finally {
    busy = false;
  }
}

/** Shkarkon skedarin, me shiritin e përparimit në ikonën e programit. */
async function download(url, file, size, win) {
  const res = await net.fetch(url, { headers: { 'User-Agent': 'AllSolutionTech-CAD' } });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const chunks = [];
  let got = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (win && size) win.setProgressBar(Math.min(1, got / size));
  }
  if (win) win.setProgressBar(-1);
  if (size && got !== size) throw new Error('download incomplete');
  await fs.writeFile(file, Buffer.concat(chunks));
}

module.exports = { checkForUpdates, RELEASES_PAGE };
