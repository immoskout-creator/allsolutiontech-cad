// Përditësimi i programit në Android vetëm nga faqja jonë: lexon versionin te
// https://allsolutiontech.de/soft/cad/versioni.json (fetch kalon nga CapacitorHttp, pa Origin) dhe, kur ka version
// më të ri, hap në shfletues faqen https://allsolutiontech.de/soft/#cad, ku kolegu shkarkon programin e vet.
// Programi nuk shkarkon asgjë vetë dhe nuk lidhet me GitHub.
import { DOWNLOAD_PAGE, VERSION_URL, isNewer, siteVersion } from '../../desktop/version.cjs';
import { getLang } from '../i18n/strings';

const TEXT = {
  sq: {
    button: 'Përditëso',
    available: (v: string, cur: string) => `Ka dalë versioni ${v} – Përditëso (ti ke ${cur}).\nTa hap faqen allsolutiontech.de/soft? Shkarko aty programin dhe zgjidh "Instalo"; projekti dhe kodi i aktivizimit mbeten.`,
    latest: (cur: string) => `Ke versionin më të fundit (${cur}).`,
    failed: "S'u kontrollua dot – provo më vonë.",
  },
  en: {
    button: 'Update',
    available: (v: string, cur: string) => `Version ${v} is available – Update (installed: ${cur}).\nOpen allsolutiontech.de/soft? Download the app there and choose "Install"; your project and activation code are kept.`,
    latest: (cur: string) => `You have the latest version (${cur}).`,
    failed: "Couldn't check – try again later.",
  },
  de: {
    button: 'Update',
    available: (v: string, cur: string) => `Version ${v} ist da – Aktualisieren (installiert: ${cur}).\nallsolutiontech.de/soft öffnen? Dort die App laden und "Installieren" wählen; Projekt und Aktivierungscode bleiben erhalten.`,
    latest: (cur: string) => `Du hast die neueste Version (${cur}).`,
    failed: 'Konnte nicht geprüft werden – später erneut versuchen.',
  },
  it: {
    button: 'Aggiorna',
    available: (v: string, cur: string) => `È uscita la versione ${v} – Aggiorna (installata: ${cur}).\nAprire allsolutiontech.de/soft? Scarica lì l'app e scegli "Installa"; progetto e codice di attivazione restano.`,
    latest: (cur: string) => `Hai l'ultima versione (${cur}).`,
    failed: 'Controllo non riuscito – riprova più tardi.',
  },
};
const text = () => TEXT[getLang() as keyof typeof TEXT] ?? TEXT.en;

const native = (method: string, options: unknown = {}) => window.Capacitor!.nativePromise!('AstFiles', method, options);

export const isAndroidApp = () => !!(window.Capacitor?.isNativePlatform?.() && window.Capacitor.nativePromise);

/** Versioni i publikuar në faqe për Android; hedh gabim kur faqja s'përgjigjet ose skedari s'është i vlefshëm. */
async function publishedVersion(): Promise<string> {
  const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  const v = siteVersion(await res.json(), 'android');
  if (!v) throw new Error('versioni.json');
  return v;
}

/** `manual`: nga butoni (tregon edhe "ke versionin e fundit" dhe gabimet); përndryshe kontroll i heshtur. */
export async function checkAndroidUpdate(manual: boolean, toast: (m: string, error?: boolean) => void): Promise<void> {
  const tx = text();
  try {
    const { version: current } = (await native('info')) as { version: string };
    const latest = await publishedVersion();
    if (!isNewer(latest, current)) {
      if (manual) toast(tx.latest(current));
      return;
    }
    // adresa e faqes është e shkruar në kod (jo ajo e versioni.json)
    if (window.confirm(tx.available(latest, current))) await native('openUrl', { url: DOWNLOAD_PAGE });
  } catch {
    if (manual) toast(tx.failed);
  }
}

/** Në Android shton butonin "Përditëso" lart dhe kontrollon vetë pak pas hapjes. */
export function setupAndroidUpdate(toast: (m: string, error?: boolean) => void): void {
  if (!isAndroidApp()) return;
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.type = 'button';
  btn.id = 'btnUpdate';
  btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path></svg><span></span>';
  btn.querySelector('span')!.textContent = text().button;
  btn.addEventListener('click', () => void checkAndroidUpdate(true, toast));
  document.getElementById('btnContact')?.after(btn);
  setTimeout(() => void checkAndroidUpdate(false, toast), 8000);
}
