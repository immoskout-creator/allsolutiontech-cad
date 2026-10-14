// Kutia e titullit të PDF-së. Firma (logoja, emri, adresa, kontakti) dhe projektuesi (emri, titulli / licenca,
// firma si figurë) ruhen në program dhe dalin vetë në çdo projekt; objekti dhe vizatimi ruhen me projektin (doc.info).
import type { Store } from '../core/store';
import { TITLE_FIELDS, type Doc, type ProjectLogo } from '../core/types';
import { ex, type ExportKey } from '../io/exportStrings';
import { parseInfo, parseLogo } from '../io/files';
import type { TitleBox } from '../io/pdf';

export interface TitleProfile {
  firmName?: string;
  firmAddress?: string;
  firmContact?: string;
  firmLogo?: ProjectLogo;
  designerName?: string;
  designerTitle?: string;
  signature?: ProjectLogo;
}

const PROFILE_KEY = 'astcad.titleProfile.v1';
const PROFILE_TEXT = ['firmName', 'firmAddress', 'firmContact', 'designerName', 'designerTitle'] as const;

/** Profili i lexuar me kujdes: vetëm tekst i shkurtër dhe figura JPEG të vlefshme. */
export function parseProfile(raw: unknown): TitleProfile {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: TitleProfile = {};
  for (const k of PROFILE_TEXT) if (typeof r[k] === 'string' && (r[k] as string).trim()) out[k] = (r[k] as string).trim().slice(0, 160);
  const logo = parseLogo(r.firmLogo);
  if (logo) out.firmLogo = logo;
  const sig = parseLogo(r.signature);
  if (sig) out.signature = sig;
  return out;
}

export function loadProfile(): TitleProfile {
  try {
    return parseProfile(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}'));
  } catch {
    return {};
  }
}

function saveProfile(p: TitleProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // pa ruajtje lokale: profili vlen vetëm këtë herë
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Data dhe ora si "14.10.2026 09:30" (dita, muaji, viti, ora, minuta). */
export function nowStamp(d = new Date()): string {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Kutia e titullit për PDF-në: profili i programit + të dhënat e projektit + emrat e fushave. */
export function titleBox(doc: Doc, profile = loadProfile()): TitleBox {
  const i = doc.info ?? {};
  return {
    firm: { name: profile.firmName, address: profile.firmAddress, contact: profile.firmContact, logo: profile.firmLogo },
    designer: { name: profile.designerName, title: profile.designerTitle, signature: profile.signature },
    object: { name: i.objectName || doc.name, address: i.address, client: i.client },
    drawing: { sheet: i.sheetName, number: i.drawingNo, revision: i.revision, date: i.date, checked: i.checkedBy },
    labels: {
      designer: ex('tbDesigner'),
      object: ex('tbObject'),
      client: ex('client'),
      number: ex('drawingNo'),
      revision: ex('revision'),
      date: ex('date'),
      checked: ex('checkedBy'),
    },
  };
}

/** Figura e ngarkuar ose e vizatuar si JPEG mbi të bardhë, e zvogëluar deri në max piksel. */
function toJpeg(src: CanvasImageSource, w0: number, h0: number, max: number): ProjectLogo {
  const k = Math.min(1, max / Math.max(w0 || 1, h0 || 1));
  const w = Math.max(1, Math.round((w0 || max) * k));
  const h = Math.max(1, Math.round((h0 || max) * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#FFFFFF';
  g.fillRect(0, 0, w, h);
  g.drawImage(src, 0, 0, w, h);
  return { jpeg: c.toDataURL('image/jpeg', 0.9), w, h };
}

/** Firma pa hapësirën e bardhë përreth (që të dalë sa më e madhe në kutinë e titullit). */
function inkOnly(c: HTMLCanvasElement): ProjectLogo | undefined {
  const { data, width, height } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] + data[i + 1] + data[i + 2] < 600) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  if (x1 < 0) return undefined;
  const m = 6;
  x0 = Math.max(0, x0 - m);
  y0 = Math.max(0, y0 - m);
  const w = Math.min(width, x1 + m) - x0, h = Math.min(height, y1 + m) - y0;
  const crop = document.createElement('canvas');
  crop.width = w;
  crop.height = h;
  crop.getContext('2d')!.drawImage(c, x0, y0, w, h, 0, 0, w, h);
  return toJpeg(crop, w, h, 480);
}

function pickImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
    input.click();
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Dritarja "Kutia e titullit". okLabel: teksti i butonit kryesor (p.sh. "Ruaj PDF" kur hapet nga Ruaj si → PDF).
 * Kthen true kur u ruajt, false kur u mbyll pa ruajtur.
 */
/** Fusha shtesë në fund të dritares (p.sh. zgjedhja e pamjes së PDF-së): HTML dhe leximi i vlerës kur ruhet. */
export interface TitleBoxExtra {
  html: string;
  onSubmit: (root: HTMLElement) => void;
}

export function openTitleBox(store: Store, labels: { cancel: string; save: string; ok?: string }, extra?: TitleBoxExtra): Promise<boolean> {
  document.getElementById('titleInfoModal')?.remove();
  const profile = loadProfile();
  const info = store.doc.info ?? {};
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'titleInfoModal';
  const input = (id: string, key: ExportKey, value = '', extra = '') =>
    `<label class="field" for="${id}"><span>${esc(ex(key))}${extra}</span><input id="${id}" type="text" maxlength="160" value="${esc(value)}"></label>`;
  modal.innerHTML = `<form class="modal-box ti-box" role="dialog" aria-modal="true" aria-labelledby="tiTitle">
    <h2 id="tiTitle">${esc(ex('titleBlock'))}</h2>
    <fieldset class="ti-sec"><legend>${esc(ex('tbFirm'))}</legend><div class="ti-grid">
      ${input('tiFirmName', 'firmName', profile.firmName)}
      ${input('tiFirmAddress', 'firmAddress', profile.firmAddress)}
      ${input('tiFirmContact', 'firmContact', profile.firmContact)}
      <div class="field"><span>${esc(ex('firmLogo'))}</span><span class="ti-img"><span class="ti-logo" id="tiLogoPrev"></span>
        <button class="btn" type="button" id="tiLogoUp">${esc(ex('upload'))}</button><button class="btn" type="button" id="tiLogoDel">${esc(ex('clear'))}</button></span></div>
    </div></fieldset>
    <fieldset class="ti-sec"><legend>${esc(ex('tbDesigner'))}</legend><div class="ti-grid">
      ${input('tiDesName', 'designerName', profile.designerName)}
      ${input('tiDesTitle', 'designerTitle', profile.designerTitle)}
      <div class="field ti-wide"><span>${esc(ex('signature'))}</span>
        <canvas id="tiSig" class="ti-sig" width="480" height="150"></canvas>
        <span class="ti-img"><button class="btn" type="button" id="tiSigUp">${esc(ex('upload'))}</button><button class="btn" type="button" id="tiSigDel">${esc(ex('clear'))}</button>
        <span class="muted small">${esc(ex('sigHint'))}</span></span></div>
    </div></fieldset>
    <fieldset class="ti-sec"><legend>${esc(ex('tbObject'))}</legend><div class="ti-grid">
      ${input('ti_objectName', 'objectName', info.objectName ?? store.doc.name)}
      ${input('ti_address', 'address', info.address)}
      ${input('ti_client', 'client', info.client)}
    </div></fieldset>
    <fieldset class="ti-sec"><legend>${esc(ex('tbDrawing'))}</legend><div class="ti-grid">
      <label class="field ti-wide" for="ti_sheetName"><span>${esc(ex('sheetName'))}</span><input id="ti_sheetName" type="text" maxlength="160" value="${esc(info.sheetName ?? '')}" placeholder="${esc(ex('sheetHint'))}"></label>
      ${input('ti_drawingNo', 'drawingNo', info.drawingNo)}
      ${input('ti_revision', 'revision', info.revision)}
      <label class="field" for="ti_date"><span>${esc(ex('date'))}</span><span class="ti-date"><input id="ti_date" type="text" maxlength="60" value="${esc(info.date ?? '')}" placeholder="${esc(nowStamp())}"><button class="btn" type="button" id="tiNow">${esc(ex('now'))}</button></span></label>
      ${input('ti_checkedBy', 'checkedBy', info.checkedBy, ` (${esc(ex('optional'))})`)}
    </div></fieldset>
    ${extra?.html ?? ''}
    <p class="muted small">${esc(ex('tbHint'))}</p>
    <div class="modal-actions"><button class="btn" type="button" id="tiCancel">${esc(labels.cancel)}</button>
    <button class="btn btn-primary" type="submit">${esc(labels.ok ?? labels.save)}</button></div></form>`;
  const $ = <T extends HTMLElement>(id: string) => modal.querySelector<T>(`#${id}`)!;

  // logoja e firmës
  let logo = profile.firmLogo;
  const showLogo = () => ($('tiLogoPrev').innerHTML = logo ? `<img src="${logo.jpeg}" alt="">` : 'AST');
  showLogo();
  $('tiLogoUp').addEventListener('click', async () => {
    const img = await pickImage();
    if (img) {
      logo = toJpeg(img, img.naturalWidth, img.naturalHeight, 600);
      showLogo();
    }
  });
  $('tiLogoDel').addEventListener('click', () => {
    logo = undefined;
    showLogo();
  });

  // firma: kutia ku vizatohet me gisht/mi; ngarkimi e vendos figurën brenda saj
  const sig = $<HTMLCanvasElement>('tiSig');
  const g = sig.getContext('2d')!;
  let signed = false;
  const clearSig = () => {
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, sig.width, sig.height);
    signed = false;
  };
  const drawImage = (img: CanvasImageSource, w: number, h: number) => {
    clearSig();
    const k = Math.min(sig.width / w, sig.height / h);
    g.drawImage(img, (sig.width - w * k) / 2, (sig.height - h * k) / 2, w * k, h * k);
    signed = true;
  };
  clearSig();
  if (profile.signature) {
    const im = new Image();
    im.onload = () => drawImage(im, im.naturalWidth, im.naturalHeight);
    im.src = profile.signature.jpeg;
    signed = true;
  }
  let last: { x: number; y: number } | null = null;
  const at = (e: PointerEvent) => {
    const r = sig.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * sig.width) / r.width, y: ((e.clientY - r.top) * sig.height) / r.height };
  };
  sig.addEventListener('pointerdown', (e) => {
    sig.setPointerCapture(e.pointerId);
    last = at(e);
    e.preventDefault();
  });
  sig.addEventListener('pointermove', (e) => {
    if (!last) return;
    const p = at(e);
    g.strokeStyle = '#0F172A';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(last.x, last.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    last = p;
    signed = true;
  });
  const end = () => (last = null);
  sig.addEventListener('pointerup', end);
  sig.addEventListener('pointercancel', end);
  $('tiSigDel').addEventListener('click', clearSig);
  $('tiSigUp').addEventListener('click', async () => {
    const img = await pickImage();
    if (img) drawImage(img, img.naturalWidth, img.naturalHeight);
  });
  $('tiNow').addEventListener('click', () => ($<HTMLInputElement>('ti_date').value = nowStamp()));

  return new Promise((resolve) => {
    const close = (ok: boolean) => {
      modal.remove();
      resolve(ok);
    };
    $('tiCancel').addEventListener('click', () => close(false));
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    });
    modal.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      extra?.onSubmit(modal);
      const val = (id: string) => $<HTMLInputElement>(id).value;
      saveProfile(
        parseProfile({
          firmName: val('tiFirmName'),
          firmAddress: val('tiFirmAddress'),
          firmContact: val('tiFirmContact'),
          firmLogo: logo,
          designerName: val('tiDesName'),
          designerTitle: val('tiDesTitle'),
          signature: signed ? inkOnly(sig) : undefined,
        }),
      );
      const raw: Record<string, string> = {};
      for (const f of TITLE_FIELDS) raw[f] = val(`ti_${f}`);
      // emri i objektit i njëjtë me emrin e projektit nuk ruhet veçmas
      if (raw.objectName.trim() === store.doc.name) raw.objectName = '';
      const next = parseInfo(raw);
      if (JSON.stringify(next ?? null) !== JSON.stringify(store.doc.info ?? null))
        store.commit((d) => {
          if (next) d.info = next;
          else delete d.info;
        });
      close(true);
    });
    document.body.appendChild(modal);
    $<HTMLInputElement>('tiFirmName').focus();
  });
}
