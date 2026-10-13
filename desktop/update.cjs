// Përditësimi i programit vetëm nga faqja jonë: lexon versionin te https://allsolutiontech.de/soft/cad/versioni.json
// (nga procesi kryesor, net.fetch) dhe, kur ka version më të ri, hap në shfletues https://allsolutiontech.de/soft/#cad,
// ku kolegu shkarkon instaluesin e programit të vet. Programi nuk shkarkon asgjë vetë.
const { app, dialog, net, shell, BrowserWindow } = require('electron');
const { DOWNLOAD_PAGE, VERSION_URL, isNewer, siteVersion } = require('./version.cjs');

/** Faqja e shkarkimeve (menyja "Downloads page"). */
const RELEASES_PAGE = DOWNLOAD_PAGE;

const TEXT = {
  sq: {
    title: 'Përditësimi',
    available: (v, cur) => `Ka dalë versioni ${v} – Përditëso (ti ke ${cur}).\nTa hap faqen allsolutiontech.de/soft? Shkarko aty instaluesin dhe hape; projekti ruhet automatikisht.`,
    yes: 'Hap faqen',
    later: 'Më vonë',
    latest: (cur) => `Ke versionin më të fundit (${cur}).`,
    failed: "S'u kontrollua dot – provo më vonë.",
    open: 'Hap faqen e shkarkimeve',
    ok: 'Mirë',
  },
  de: {
    title: 'Update',
    available: (v, cur) => `Version ${v} ist da – Aktualisieren (installiert: ${cur}).\nallsolutiontech.de/soft öffnen? Dort das Installationsprogramm laden und starten; das Projekt wird automatisch gespeichert.`,
    yes: 'Seite öffnen',
    later: 'Später',
    latest: (cur) => `Du hast die neueste Version (${cur}).`,
    failed: 'Konnte nicht geprüft werden – später erneut versuchen.',
    open: 'Download-Seite öffnen',
    ok: 'OK',
  },
  it: {
    title: 'Aggiornamento',
    available: (v, cur) => `È uscita la versione ${v} – Aggiorna (installata: ${cur}).\nAprire allsolutiontech.de/soft? Scarica lì il programma di installazione e aprilo; il progetto è salvato automaticamente.`,
    yes: 'Apri la pagina',
    later: 'Più tardi',
    latest: (cur) => `Hai l'ultima versione (${cur}).`,
    failed: 'Controllo non riuscito – riprova più tardi.',
    open: 'Apri la pagina dei download',
    ok: 'OK',
  },
  en: {
    title: 'Update',
    available: (v, cur) => `Version ${v} is available – Update (you have ${cur}).\nOpen allsolutiontech.de/soft? Download the installer there and run it; your project is saved automatically.`,
    yes: 'Open page',
    later: 'Later',
    latest: (cur) => `You have the latest version (${cur}).`,
    failed: "Couldn't check – try again later.",
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
    let latest;
    try {
      const res = await net.fetch(`${VERSION_URL}?t=${Date.now()}`, { headers: { 'User-Agent': 'AllSolutionTech-CAD' }, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      latest = siteVersion(await res.json(), 'windows');
      if (!latest) throw new Error('versioni.json');
    } catch {
      // pa internet ose skedar i pavlefshëm: vetëm njoftim i qetë kur e kërkoi përdoruesi
      if (manual) await dialog.showMessageBox(win, { type: 'info', title: T.title, message: T.failed, buttons: [T.ok] });
      return;
    }
    const current = app.getVersion();
    if (!isNewer(latest, current)) {
      if (manual) await dialog.showMessageBox(win, { type: 'info', title: T.title, message: T.latest(current), buttons: [T.ok] });
      return;
    }
    const answer = await dialog.showMessageBox(win, { type: 'question', title: T.title, message: T.available(latest, current), buttons: [T.yes, T.later], defaultId: 0, cancelId: 1 });
    // adresa e faqes është e shkruar në kod (jo ajo e versioni.json)
    if (answer.response === 0) await shell.openExternal(DOWNLOAD_PAGE);
  } finally {
    busy = false;
  }
}

module.exports = { checkForUpdates, RELEASES_PAGE };
