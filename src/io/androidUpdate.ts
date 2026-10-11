// Përditësimi i programit në Android: si te Windows (desktop/update.cjs), kontrollon publikimin e fundit
// "Programet për Android" në GitHub dhe, kur ka version më të ri, hap në shfletues APK-në e këtij programi.
// Android e shkarkon dhe e instalon mbi versionin e vjetër (projektet dhe kodi i aktivizimit mbeten).
import { isNewer, versionFromTitle } from '../../desktop/version.cjs';
import { productName } from '../edition';
import { getLang } from '../i18n/strings';

const REPO = 'immoskout-creator/allsolutiontech-cad';
const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/tags/android-latest`;
export const ANDROID_RELEASES_PAGE = `https://github.com/${REPO}/releases/tag/android-latest`;

const TEXT = {
  sq: {
    button: 'Përditëso',
    available: (v: string, cur: string) => `Ka dalë versioni i ri ${v} (ti ke ${cur}).\nTa shkarkoj tani? Pasi të shkarkohet, hape skedarin dhe zgjidh "Instalo"; projekti dhe kodi i aktivizimit mbeten.`,
    latest: (cur: string) => `Ke versionin më të fundit (${cur}).`,
    failed: 'Përditësimi nuk u kontrollua (pa internet?).',
  },
  en: {
    button: 'Update',
    available: (v: string, cur: string) => `Version ${v} is available (installed: ${cur}).\nDownload it now? When the download finishes, open the file and choose "Install"; your project and activation code are kept.`,
    latest: (cur: string) => `You have the latest version (${cur}).`,
    failed: 'Could not check for updates (no internet?).',
  },
  de: {
    button: 'Update',
    available: (v: string, cur: string) => `Version ${v} ist verfügbar (installiert: ${cur}).\nJetzt herunterladen? Danach die Datei öffnen und "Installieren" wählen; Projekt und Aktivierungscode bleiben erhalten.`,
    latest: (cur: string) => `Du hast die neueste Version (${cur}).`,
    failed: 'Update konnte nicht geprüft werden (keine Internetverbindung?).',
  },
  it: {
    button: 'Aggiorna',
    available: (v: string, cur: string) => `È disponibile la versione ${v} (installata: ${cur}).\nScaricarla ora? Al termine apri il file e scegli "Installa"; progetto e codice di attivazione restano.`,
    latest: (cur: string) => `Hai l'ultima versione (${cur}).`,
    failed: "Impossibile controllare l'aggiornamento (niente internet?).",
  },
};
const text = () => TEXT[getLang() as keyof typeof TEXT] ?? TEXT.en;

/** Emri i APK-së së programit te publikimi, si te mobile/build-apk.mjs: AllSolutionTech-CAD-All-in-One.apk */
export const apkName = (name: string) => `${name.replace(/\s+/g, '-')}.apk`;

interface Release {
  name?: string;
  assets?: { name: string; browser_download_url: string }[];
}

/** Versioni i ri dhe lidhja e APK-së nga publikimi, ose null kur s'ka version më të ri. */
export function newerApk(release: Release, current: string, name: string): { version: string; url: string } | null {
  const version = versionFromTitle(release.name ?? '');
  const asset = release.assets?.find((a) => a.name === apkName(name));
  if (!version || !asset || !isNewer(version, current)) return null;
  return { version, url: asset.browser_download_url };
}

const native = (method: string, options: unknown = {}) => window.Capacitor!.nativePromise!('AstFiles', method, options);

export const isAndroidApp = () => !!(window.Capacitor?.isNativePlatform?.() && window.Capacitor.nativePromise);

/** `manual`: nga butoni (tregon edhe "ke versionin e fundit" dhe gabimet); përndryshe kontroll i heshtur. */
export async function checkAndroidUpdate(manual: boolean, toast: (m: string, error?: boolean) => void): Promise<void> {
  const tx = text();
  try {
    const { version: current } = (await native('info')) as { version: string };
    const res = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
    // 404: ende s'ka publikim për Android, pra ky është versioni i fundit
    if (!res.ok && res.status !== 404) throw new Error(String(res.status));
    const found = res.ok ? newerApk((await res.json()) as Release, current, productName()) : null;
    if (!found) {
      if (manual) toast(tx.latest(current));
      return;
    }
    if (window.confirm(tx.available(found.version, current))) await native('openUrl', { url: found.url });
  } catch {
    if (manual) toast(tx.failed, true);
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
