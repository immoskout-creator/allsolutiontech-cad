import { coversProgram, daysLeft, dayOf, formatDate, importPublicKey, readCode, type License } from './code';
import { PUBLIC_KEY } from './publicKey';
import { lic } from './strings';

/**
 * Dritarja e aktivizimit: programi nuk përdoret pa një kod të vlefshëm për të (ose për "të gjitha").
 * Kodet ruhen në shfletues; data më e madhe e parë ruhet gjithashtu, që kthimi i orës mbrapa të mos zgjasë licencën.
 */

const CODES_KEY = 'astcad.license.v1';
const SEEN_KEY = 'astcad.license.seen';

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // pa ruajtje lokale: kodi duhet shkruar sërish herën tjetër
  }
}

/** Dita e sotme, por jo më herët se dita më e vonë që programi ka parë. */
export function licenseToday(now = Date.now()): number {
  const today = Math.max(dayOf(now), readJson<number>(SEEN_KEY, 0));
  writeJson(SEEN_KEY, today);
  return today;
}

export type Check = { ok: true; license: License; code: string } | { ok: false; reason: 'invalid' | 'wrongProgram' | 'expired'; license?: License };

/** Kontrolli i një kodi për programin `program` në ditën `today`. */
export async function checkCode(code: string, program: string, key: CryptoKey, today: number): Promise<Check> {
  const license = await readCode(code, key);
  if (!license) return { ok: false, reason: 'invalid' };
  if (!coversProgram(license, program)) return { ok: false, reason: 'wrongProgram', license };
  if (daysLeft(license, today) < 0) return { ok: false, reason: 'expired', license };
  return { ok: true, license, code };
}

/** Kodi më i mirë nga ata të ruajtur (ai që zgjat më shumë). */
async function bestStored(program: string, key: CryptoKey, today: number): Promise<Check | null> {
  let best: Check | null = null;
  for (const code of readJson<string[]>(CODES_KEY, [])) {
    const c = await checkCode(code, program, key, today);
    if (c.ok) {
      if (!best || !best.ok || daysLeft(c.license, today) > daysLeft(best.license, today)) best = c;
    } else if (!best && c.reason === 'expired') best = c;
  }
  return best;
}

const CSS = `
.lic-overlay { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 16px;
  background: rgba(10, 12, 16, 0.86); backdrop-filter: blur(3px); }
.lic-box { width: min(520px, 100%); background: var(--panel, #1F242B); border: 1px solid var(--line-2, #3E4651);
  border-radius: 10px; padding: 22px; box-shadow: 0 20px 60px rgba(0,0,0,.5); color: var(--fg, #E6E9ED); }
.lic-box h2 { margin: 0 0 4px; font-size: 18px; }
.lic-box .lic-prod { color: var(--brand, #F59E42); font-weight: 600; font-size: 13px; margin-bottom: 12px; }
.lic-box p { margin: 0 0 12px; color: var(--muted, #A3ACB8); }
.lic-box textarea { width: 100%; box-sizing: border-box; min-height: 92px; resize: vertical; padding: 10px;
  background: var(--bg, #16191E); color: var(--fg, #E6E9ED); border: 1px solid var(--line-2, #3E4651); border-radius: 6px;
  font: 13px/1.5 var(--mono, monospace); text-transform: uppercase; }
.lic-msg { min-height: 20px; margin: 8px 0; font-size: 13px; }
.lic-msg.err { color: #FCA5A5; } .lic-msg.ok { color: var(--ok, #A7F3D0); }
.lic-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
.lic-actions button { padding: 8px 16px; border-radius: 6px; border: 1px solid var(--line-2, #3E4651); background: var(--panel-2, #262C34); }
.lic-actions .lic-go { background: var(--accent, #2F6FD6); border-color: var(--accent, #2F6FD6); color: #fff; font-weight: 600; }
.lic-badge { white-space: nowrap; font-size: 12px; padding: 5px 9px; border-radius: 6px; border: 1px solid var(--line-2, #3E4651);
  background: transparent; color: var(--muted, #A3ACB8); }
.lic-badge.warn { color: var(--warn, #FDE7C2); background: var(--warn-bg, #3A2A12); }
`;

export interface Gate {
  /** Rishkruan tekstet pas ndryshimit të gjuhës. */
  refresh(): void;
}

/**
 * Hap dritaren e aktivizimit menjëherë dhe e mbyll vetëm kur gjendet një kod i vlefshëm.
 * `badgeHost` merr butonin e licencës (ditët që mbeten, ndryshimi i kodit).
 */
export function startLicenseGate(program: string, productName: string, badgeHost: HTMLElement | null): Gate {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'lic-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `<form class="lic-box">
    <h2 id="licTitle"></h2><div class="lic-prod"></div><p class="lic-intro"></p>
    <textarea spellcheck="false" autocomplete="off" aria-labelledby="licTitle"></textarea>
    <div class="lic-msg" role="status"></div>
    <div class="lic-actions"><button type="button" class="lic-close"></button><button type="submit" class="lic-go"></button></div>
  </form>`;
  document.body.appendChild(overlay);
  const form = overlay.querySelector('form')!;
  const input = overlay.querySelector('textarea')!;
  const msg = overlay.querySelector<HTMLElement>('.lic-msg')!;
  const closeBtn = overlay.querySelector<HTMLButtonElement>('.lic-close')!;
  overlay.querySelector('.lic-prod')!.textContent = productName;

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'lic-badge';
  badge.hidden = true;
  badgeHost?.prepend(badge);

  let current: Check | null = null;
  let message: { key: 'invalid' | 'wrongProgram' | 'expired' | 'renew' | 'noCrypto' | 'activated'; date?: number; error: boolean } | null = null;
  let key: CryptoKey | null = null;

  const locked = () => !current?.ok;

  // pa kod të vlefshëm, tastiera nuk arrin te programi
  const block = (e: Event) => {
    if (!overlay.hidden && !overlay.contains(e.target as Node)) {
      e.stopPropagation();
      if (e.type !== 'keyup') e.preventDefault();
    }
  };
  for (const type of ['keydown', 'keyup', 'paste', 'wheel']) window.addEventListener(type, block, { capture: true, passive: false });

  function render(): void {
    overlay.querySelector('#licTitle')!.textContent = lic('title');
    overlay.querySelector('.lic-intro')!.textContent = lic('intro');
    input.placeholder = lic('placeholder');
    overlay.querySelector('.lic-go')!.textContent = lic('activate');
    closeBtn.textContent = lic('close');
    closeBtn.hidden = locked();
    msg.textContent = message ? lic(message.key, { date: message.date !== undefined ? formatDate(message.date) : '' }) : '';
    msg.className = `lic-msg ${message?.error ? 'err' : 'ok'}`;
    if (current?.ok) {
      const left = daysLeft(current.license, licenseToday());
      badge.textContent = `${lic('badge')}: ${left === Infinity ? lic('life') : lic('days', { n: left + 1, date: formatDate(current.license.expiry) })}`;
      badge.title = lic('change');
      badge.classList.toggle('warn', left < 7);
      badge.hidden = false;
    } else badge.hidden = true;
  }

  function show(): void {
    overlay.hidden = false;
    render();
    input.focus();
  }

  closeBtn.addEventListener('click', () => {
    if (locked()) return;
    overlay.hidden = true;
    message = null;
  });
  badge.addEventListener('click', () => {
    input.value = '';
    message = null;
    show();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!key) return;
    const code = input.value.trim();
    if (!code) return;
    const c = await checkCode(code, program, key, licenseToday());
    if (!c.ok) {
      message = { key: c.reason, date: c.reason === 'expired' ? c.license!.expiry : undefined, error: true };
      return render();
    }
    const codes = readJson<string[]>(CODES_KEY, []).filter((x) => x !== c.code);
    writeJson(CODES_KEY, [c.code, ...codes].slice(0, 10));
    current = c;
    message = { key: 'activated', error: false };
    render();
    window.setTimeout(() => {
      if (current?.ok) overlay.hidden = true;
      message = null;
    }, 900);
  });

  async function recheck(): Promise<void> {
    if (!key) return;
    const best = await bestStored(program, key, licenseToday());
    const wasOk = current?.ok;
    current = best?.ok ? best : null;
    if (!current) {
      if (best && !best.ok) message = { key: 'renew', error: true };
      show();
    } else if (!wasOk) overlay.hidden = true;
    render();
  }

  render();
  input.focus();
  importPublicKey(PUBLIC_KEY)
    .then((k) => {
      key = k;
      return recheck();
    })
    .catch(() => {
      message = { key: 'noCrypto', error: true };
      render();
    });
  // licenca mund të skadojë ndërsa programi është i hapur
  window.setInterval(() => void recheck(), 30 * 60_000);

  return { refresh: render };
}
