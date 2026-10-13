// Ruajtja në Android: <a download> dhe dritarja "Ruaj si" s'punojnë mirë brenda WebView-it, prandaj skedari
// shkruhet me @capacitor/filesystem te Dokumentet / AllSolutionTech CAD dhe pastaj mund të hapet ose ndahet me
// @capacitor/share (email, WhatsApp, Drive, printim). Kur Android-i s'lejon Dokumentet, skedari shkruhet te
// Cache dhe hapet menjëherë dritarja "Ndaj". Windows-i dhe shfletuesi nuk preken (src/io/files.ts).
import { getLang } from '../i18n/strings';

export const ANDROID_FOLDER = 'AllSolutionTech CAD';

type Native = (plugin: string, method: string, options: unknown) => Promise<unknown>;

const TEXT = {
  sq: {
    saved: (name: string) => `U ruajt te Dokumentet / ${ANDROID_FOLDER} / ${name}`,
    share: 'Hap / Ndaj',
    close: 'Mbyll',
    failed: (why: string) => `Ruajtja dështoi: ${why}`,
  },
  en: {
    saved: (name: string) => `Saved to Documents / ${ANDROID_FOLDER} / ${name}`,
    share: 'Open / Share',
    close: 'Close',
    failed: (why: string) => `Saving failed: ${why}`,
  },
  de: {
    saved: (name: string) => `Gespeichert unter Dokumente / ${ANDROID_FOLDER} / ${name}`,
    share: 'Öffnen / Teilen',
    close: 'Schließen',
    failed: (why: string) => `Speichern fehlgeschlagen: ${why}`,
  },
  it: {
    saved: (name: string) => `Salvato in Documenti / ${ANDROID_FOLDER} / ${name}`,
    share: 'Apri / Condividi',
    close: 'Chiudi',
    failed: (why: string) => `Salvataggio non riuscito: ${why}`,
  },
};
const text = () => TEXT[getLang() as keyof typeof TEXT] ?? TEXT.sq;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Emri në Android: "<emri> – <data>.<prapashtesa>", pa shkronjat që s'lejohen në emra skedarësh.
 * Prapashtesat e dyfishta të programit (.astcad.json, .astlib.json) mbeten të plota.
 */
export function androidFileName(filename: string, now = new Date()): string {
  const m = /^(.*?)((?:\.(?:astcad|astlib))?\.[A-Za-z0-9]{1,8})?$/.exec(filename.trim())!;
  const base = m[1]
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${base || 'projekt'} – ${date}${m[2] ?? ''}`;
}

const reason = (err: unknown) => {
  const msg = (err as { message?: string } | null)?.message ?? String(err ?? '');
  return msg.trim() || 'gabim i panjohur';
};

const cancelled = (err: unknown) => /cancel/i.test(reason(err));

export interface AndroidSaved {
  name: string;
  uri: string;
  /** "documents": te Dokumentet / AllSolutionTech CAD; "cache": vetëm për t'u ndarë menjëherë. */
  where: 'documents' | 'cache';
}

/** Shkruan skedarin (base64) te Dokumentet; kur s'lejohet, te Cache. Hedh "Ruajtja dështoi: …" kur s'ruhet fare. */
export async function writeAndroidFile(native: Native, filename: string, base64: string, now = new Date()): Promise<AndroidSaved> {
  const name = androidFileName(filename, now);
  try {
    const r = (await native('Filesystem', 'writeFile', { path: `${ANDROID_FOLDER}/${name}`, data: base64, directory: 'DOCUMENTS', recursive: true })) as { uri?: string };
    if (!r?.uri) throw new Error('pa adresë skedari');
    return { name, uri: r.uri, where: 'documents' };
  } catch (first) {
    try {
      const r = (await native('Filesystem', 'writeFile', { path: name, data: base64, directory: 'CACHE', recursive: true })) as { uri?: string };
      if (!r?.uri) throw new Error('pa adresë skedari');
      return { name, uri: r.uri, where: 'cache' };
    } catch {
      throw new Error(text().failed(reason(first)));
    }
  }
}

/** Dritarja "Ndaj" e Android-it për skedarin: email, WhatsApp, Drive, printim. false kur përdoruesi e mbyll. */
export async function shareAndroidFile(native: Native, saved: AndroidSaved): Promise<boolean> {
  try {
    await native('Share', 'share', { title: saved.name, files: [saved.uri], dialogTitle: saved.name });
    return true;
  } catch (err) {
    if (cancelled(err)) return false;
    throw err;
  }
}

/** Mesazhi pas ruajtjes, me "Hap / Ndaj" dhe "Mbyll". */
function showSavedDialog(native: Native, saved: AndroidSaved): void {
  const tx = text();
  document.getElementById('androidSaved')?.remove();
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'androidSaved';
  modal.innerHTML =
    '<div class="modal-box" role="dialog" aria-modal="true"><p class="as-msg"></p><p class="as-err" hidden></p>' +
    '<div class="modal-actions"><button class="btn" type="button" data-act="close"></button>' +
    '<button class="btn btn-primary" type="button" data-act="share"></button></div></div>';
  const msg = modal.querySelector<HTMLElement>('.as-msg')!;
  const err = modal.querySelector<HTMLElement>('.as-err')!;
  msg.textContent = tx.saved(saved.name);
  modal.querySelector<HTMLElement>('[data-act="close"]')!.textContent = tx.close;
  const shareBtn = modal.querySelector<HTMLButtonElement>('[data-act="share"]')!;
  shareBtn.textContent = tx.share;
  const close = () => modal.remove();
  modal.querySelector('[data-act="close"]')!.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  shareBtn.addEventListener('click', async () => {
    err.hidden = true;
    try {
      await shareAndroidFile(native, saved);
    } catch (e) {
      err.textContent = reason(e);
      err.hidden = false;
    }
  });
  document.body.appendChild(modal);
  shareBtn.focus();
}

/**
 * Ruan skedarin në Android. Te Dokumentet: tregon ku u ruajt, me "Hap / Ndaj". Te Cache: hap menjëherë "Ndaj"
 * ('declined' kur përdoruesi e mbyll pa e dërguar askund). Gabimet dalin si "Ruajtja dështoi: …".
 */
export async function saveAndroidData(native: Native, filename: string, base64: string): Promise<'saved' | 'declined'> {
  const saved = await writeAndroidFile(native, filename, base64);
  if (saved.where === 'documents') {
    showSavedDialog(native, saved);
    return 'saved';
  }
  try {
    return (await shareAndroidFile(native, saved)) ? 'saved' : 'declined';
  } catch (err) {
    throw new Error(text().failed(reason(err)));
  }
}
