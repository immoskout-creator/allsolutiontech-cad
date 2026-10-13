import { coversProgram, daysLeft, dayOf, formatDate, importPublicKey, readCode, type License } from './code';
import { PUBLIC_KEY } from './publicKey';
import { lic, type LicenseKey } from './strings';
import { checkTrial, parseTrialResponse, trialPlatform, type SignedTrial, type TrialState } from './trial';
import { tr, type TrialKey } from './trialStrings';

/**
 * Dritarja e aktivizimit: programi nuk përdoret pa një kod të vlefshëm për të, ose pa provën falas 7 ditë
 * (vetëm programet e instaluara në Windows dhe Android). Kodi ka përparësi mbi provën.
 * Kodet dhe prova ruhen lokalisht; koha më e madhe e parë ruhet gjithashtu, që kthimi i orës mbrapa të mos zgjasë asgjë.
 */

const CODES_KEY = 'astcad.license.v1';
const SEEN_KEY = 'astcad.license.seen';
const TRIAL_KEY = 'astcad.trial.v1';
const TRIAL_SEEN_KEY = 'astcad.trial.seen';

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
.lic-choice { display: flex; flex-direction: column; gap: 8px; margin: 0 0 12px; }
.lic-choice button { min-height: 44px; border-radius: 8px; border: 1px solid var(--line-2, #3E4651); background: var(--panel-2, #262C34); font-weight: 600; }
.lic-choice .lic-try { background: var(--brand, #F59E42); border-color: var(--brand, #F59E42); color: #16191E; }
.trial-bar { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; padding: 4px 12px;
  background: var(--warn-bg, #3A2A12); color: var(--warn, #FDE7C2); font-size: 12px; border-bottom: 1px solid var(--line, #343B46); }
.trial-bar button { min-height: 26px; padding: 0 12px; border-radius: 6px; border: 1px solid var(--brand, #F59E42);
  background: var(--brand, #F59E42); color: #16191E; font-weight: 600; font-size: 12px; }
`;

export interface Gate {
  /** Rishkruan tekstet pas ndryshimit të gjuhës. */
  refresh(): void;
}

type Message = { lic: LicenseKey; date?: number; error: boolean } | { trial: TrialKey; error: boolean };

/**
 * Hap dritaren e aktivizimit menjëherë dhe e mbyll vetëm kur gjendet një kod i vlefshëm ose prova falas është në fuqi.
 * `badgeHost` merr butonin e licencës (ditët që mbeten, ndryshimi i kodit); `trialHost` shiritin e provës falas.
 */
export function startLicenseGate(program: string, productName: string, badgeHost: HTMLElement | null, trialHost: HTMLElement | null = null): Gate {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const platform = trialPlatform(program);

  const overlay = document.createElement('div');
  overlay.className = 'lic-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `<form class="lic-box">
    <h2 id="licTitle"></h2><div class="lic-prod"></div><p class="lic-intro"></p>
    <div class="lic-choice"><button type="button" class="lic-try"></button><button type="button" class="lic-code"></button></div>
    <div class="lic-entry"><textarea spellcheck="false" autocomplete="off" aria-labelledby="licTitle"></textarea></div>
    <div class="lic-msg" role="status"></div>
    <div class="lic-actions"><button type="button" class="lic-close"></button><button type="submit" class="lic-go"></button></div>
  </form>`;
  document.body.appendChild(overlay);
  const form = overlay.querySelector('form')!;
  const input = overlay.querySelector('textarea')!;
  const msg = overlay.querySelector<HTMLElement>('.lic-msg')!;
  const closeBtn = overlay.querySelector<HTMLButtonElement>('.lic-close')!;
  const goBtn = overlay.querySelector<HTMLButtonElement>('.lic-go')!;
  const choice = overlay.querySelector<HTMLElement>('.lic-choice')!;
  const tryBtn = overlay.querySelector<HTMLButtonElement>('.lic-try')!;
  const codeBtn = overlay.querySelector<HTMLButtonElement>('.lic-code')!;
  const entry = overlay.querySelector<HTMLElement>('.lic-entry')!;
  overlay.querySelector('.lic-prod')!.textContent = productName;

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'lic-badge';
  badge.hidden = true;
  badgeHost?.prepend(badge);

  // shiriti lart gjatë provës: ditët që mbeten dhe butoni "Aktivizo"
  const bar = document.createElement('div');
  bar.className = 'trial-bar';
  bar.id = 'trialBar';
  bar.hidden = true;
  bar.innerHTML = '<span></span><button type="button"></button>';
  trialHost?.prepend(bar);

  let current: Check | null = null;
  let trial: TrialState | null = null;
  /** Gjatë provës ose pa provë: dritarja tregon fushën e kodit; përndryshe dy butonat. */
  let showEntry = !platform;
  let busy = false;
  let message: Message | null = null;
  let key: CryptoKey | null = null;

  const trialOn = () => !current?.ok && !!trial?.ok;
  const locked = () => !current?.ok && !trial?.ok;
  const trialOver = () => !!trial && !trial.ok && trial.reason === 'expired';
  const canTry = () => !!platform && !trialOver() && !trial?.ok;

  // pa kod të vlefshëm, tastiera nuk arrin te programi
  const block = (e: Event) => {
    if (!overlay.hidden && !overlay.contains(e.target as Node)) {
      e.stopPropagation();
      if (e.type !== 'keyup') e.preventDefault();
    }
  };
  for (const type of ['keydown', 'keyup', 'paste', 'wheel']) window.addEventListener(type, block, { capture: true, passive: false });

  function render(): void {
    const isLocked = locked();
    const choosing = isLocked && canTry();
    overlay.querySelector('#licTitle')!.textContent = lic('title');
    overlay.querySelector('.lic-intro')!.textContent = isLocked && trialOver() ? tr('over') : choosing ? tr('choose') : lic('intro');
    input.placeholder = lic('placeholder');
    goBtn.textContent = lic('activate');
    tryBtn.textContent = tr('try');
    codeBtn.textContent = tr('enterCode');
    closeBtn.textContent = lic('close');
    closeBtn.hidden = isLocked;
    choice.hidden = !choosing;
    codeBtn.hidden = showEntry;
    tryBtn.disabled = busy;
    entry.hidden = goBtn.hidden = choosing && !showEntry;
    overlay.querySelector<HTMLElement>('.lic-actions')!.hidden = goBtn.hidden && closeBtn.hidden;
    msg.textContent = !message ? '' : 'trial' in message ? tr(message.trial) : lic(message.lic, { date: message.date !== undefined ? formatDate(message.date) : '' });
    msg.className = `lic-msg ${message?.error ? 'err' : 'ok'}`;
    if (current?.ok) {
      const left = daysLeft(current.license, licenseToday());
      badge.textContent = `${lic('badge')}: ${left === Infinity ? lic('life') : lic('days', { n: left + 1, date: formatDate(current.license.expiry) })}`;
      badge.title = lic('change');
      badge.classList.toggle('warn', left < 7);
      badge.hidden = false;
    } else badge.hidden = true;
    bar.hidden = !trialOn();
    if (trial?.ok) {
      bar.querySelector('span')!.textContent = trial.daysLeft > 1 ? tr('bar', { n: trial.daysLeft }) : tr('barLast');
      bar.querySelector('button')!.textContent = tr('activate');
    }
  }

  function show(): void {
    overlay.hidden = false;
    render();
    if (!entry.hidden) input.focus();
  }

  function openCodeEntry(): void {
    input.value = '';
    message = null;
    showEntry = true;
    show();
  }

  closeBtn.addEventListener('click', () => {
    if (locked()) return;
    overlay.hidden = true;
    message = null;
  });
  badge.addEventListener('click', openCodeEntry);
  bar.querySelector('button')!.addEventListener('click', openCodeEntry);
  codeBtn.addEventListener('click', () => {
    showEntry = true;
    message = null;
    render();
    input.focus();
  });
  tryBtn.addEventListener('click', () => void startTrial());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!key || entry.hidden) return;
    const code = input.value.trim();
    if (!code) return;
    const c = await checkCode(code, program, key, licenseToday());
    if (!c.ok) {
      message = { lic: c.reason, date: c.reason === 'expired' ? c.license!.expiry : undefined, error: true };
      return render();
    }
    const codes = readJson<string[]>(CODES_KEY, []).filter((x) => x !== c.code);
    writeJson(CODES_KEY, [c.code, ...codes].slice(0, 10));
    current = c;
    message = { lic: 'activated', error: false };
    render();
    window.setTimeout(() => {
      if (current?.ok) overlay.hidden = true;
      message = null;
    }, 900);
  });

  /** Kontrolli i një prove: ruan kohën më të madhe të parë, që ora mbrapa të mos e zgjasë. */
  async function evaluate(signed: SignedTrial): Promise<TrialState | null> {
    if (!key || !platform) return null;
    let device: string;
    try {
      device = await platform.device();
    } catch {
      return null;
    }
    const state = await checkTrial(signed, key, device, program, Date.now() / 1000, readJson<number>(TRIAL_SEEN_KEY, 0));
    if (state.now) writeJson(TRIAL_SEEN_KEY, Math.max(state.now, readJson<number>(TRIAL_SEEN_KEY, 0)));
    return state;
  }

  /** Kërkesa te serveri; kthen provën e nënshkruar ose gabimin. */
  async function ask(): Promise<SignedTrial | 'bad' | 'busy' | 'offline'> {
    try {
      const res = await platform!.request();
      return parseTrialResponse(res.status, res.text);
    } catch {
      return 'offline';
    }
  }

  async function startTrial(): Promise<void> {
    if (!platform || busy) return;
    busy = true;
    message = { trial: 'starting', error: false };
    render();
    const res = await ask();
    busy = false;
    if (typeof res === 'string') {
      message = { trial: res === 'bad' ? 'failed' : res, error: true };
      return render();
    }
    const state = await evaluate(res);
    if (state?.ok || (state && state.reason === 'expired')) {
      writeJson(TRIAL_KEY, res);
      trial = state;
    }
    if (state?.ok) {
      message = { trial: 'started', error: false };
      render();
      window.setTimeout(() => {
        if (!locked()) overlay.hidden = true;
        message = null;
        render();
      }, 900);
      return;
    }
    message = trialOver() ? null : { trial: 'failed', error: true };
    showEntry = true;
    render();
  }

  let refreshed = false;
  async function recheck(): Promise<void> {
    if (!key) return;
    const best = await bestStored(program, key, licenseToday());
    const wasLocked = locked();
    current = best?.ok ? best : null;
    const stored = platform ? readJson<SignedTrial | null>(TRIAL_KEY, null) : null;
    trial = stored ? await evaluate(stored) : null;
    // prova e një pajisjeje ose programi tjetër (p.sh. skedarë të kopjuar) nuk vlen: kërkohet sërish
    if (trial && !trial.ok && trial.reason !== 'expired') trial = null;
    if (locked()) {
      if (best && !best.ok && !trial) message = { lic: 'renew', error: true };
      show();
    } else if (wasLocked) overlay.hidden = true;
    render();
    // me internet, prova kontrollohet edhe me serverin (koha e serverit e mban të saktë)
    if (stored && !current?.ok && !refreshed) {
      refreshed = true;
      const res = await ask();
      if (typeof res !== 'string') {
        const state = await evaluate(res);
        if (state && (state.ok || state.reason === 'expired')) {
          writeJson(TRIAL_KEY, res);
          trial = state;
          if (locked()) show();
          render();
        }
      }
    }
  }

  render();
  importPublicKey(PUBLIC_KEY)
    .then((k) => {
      key = k;
      return recheck();
    })
    .catch(() => {
      message = { lic: 'noCrypto', error: true };
      render();
    });
  // licenca ose prova mund të skadojë ndërsa programi është i hapur
  window.setInterval(() => void recheck(), 30 * 60_000);

  return { refresh: render };
}
