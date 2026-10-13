import { LIFETIME, createCode, dayOf, formatDate, expiryFor, importPrivateKey, importPublicKey, readCode, type Duration, type LicenseProgram } from '../license/code';
import { PUBLIC_KEY } from '../license/publicKey';
import { CANVAS_BOUNDS, mergeSymbols, parseLibrary, toSymbolDef, type CustomSymbol } from '../symbols/custom';
import { communityId, fetchApproved, signApproved } from '../symbols/community';

/**
 * Faqja e administratorit: krijon kodet e aktivizimit me çelësin privat.
 * Kur ndërtohet me admin-key.json pranë build.mjs, çelësi është brenda faqes; përndryshe zgjidhet si skedar.
 */
declare const __ADMIN_KEY__: JsonWebKey | null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const PROGRAM_NAME: Record<LicenseProgram, string> = {
  all: 'AllSolutionTech CAD All in One',
  civil: 'AllSolutionTech CAD Electrical',
  cctv: 'AllSolutionTech CAD CCTV',
  network: 'AllSolutionTech CAD AP',
  fire: 'AllSolutionTech CAD Fire',
  emergency: 'AllSolutionTech CAD Emergency',
};
const DURATION_NAME: Record<Duration, string> = { '7d': '7 ditë', '1m': '1 muaj', '6m': '6 muaj', '1y': '1 vit', life: 'Përjetë' };

const fmt = (day: number) => (day === LIFETIME ? 'Përjetë' : formatDate(day));
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

interface Issued {
  at: number;
  customer: string;
  program: LicenseProgram;
  duration: Duration;
  expiry: number;
  code: string;
}
const HISTORY_KEY = 'astcad.admin.history.v1';
function history(): Issued[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as Issued[];
  } catch {
    return [];
  }
}
let memory: Issued[] = history();
function saveHistory(): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(memory));
  } catch {
    // pa ruajtje: lista mbetet vetëm deri sa mbyllet faqja
  }
}

let privateKey: CryptoKey | null = null;
const publicKey = importPublicKey(PUBLIC_KEY);

async function useKey(jwk: JsonWebKey): Promise<boolean> {
  try {
    if (jwk.x !== PUBLIC_KEY.x || jwk.y !== PUBLIC_KEY.y) return false;
    privateKey = await importPrivateKey(jwk);
    return true;
  } catch {
    return false;
  }
}

const programSel = $<HTMLSelectElement>('program');
const durationSel = $<HTMLSelectElement>('duration');
const startInput = $<HTMLInputElement>('start');
const startDay = () => (startInput.value ? dayOf(Date.parse(`${startInput.value}T00:00:00Z`)) : dayOf(Date.now()));
startInput.value = new Date().toISOString().slice(0, 10);

function updateHint(): void {
  const d = durationSel.value as Duration;
  const exp = expiryFor(d, startDay());
  $('expiryHint').textContent = d === 'life' ? 'Kodi vlen përgjithmonë.' : `Kodi vlen nga ${fmt(startDay())} deri më ${fmt(exp)} (përfshirë).`;
}
programSel.addEventListener('change', updateHint);
durationSel.addEventListener('change', updateHint);
startInput.addEventListener('change', updateHint);
updateHint();

$('make').addEventListener('click', async () => {
  if (!privateKey) {
    $('keyCard').hidden = false;
    return;
  }
  const program = programSel.value as LicenseProgram;
  const duration = durationSel.value as Duration;
  const expiry = expiryFor(duration, startDay());
  const serial = crypto.getRandomValues(new Uint32Array(1))[0] & 0xffffff;
  const code = await createCode({ program, duration, expiry, serial }, privateKey);
  $<HTMLTextAreaElement>('code').value = code;
  $('result').hidden = false;
  $('copyMsg').textContent = '';
  memory = [{ at: Date.now(), customer: $<HTMLInputElement>('customer').value.trim(), program, duration, expiry, code }, ...memory];
  saveHistory();
  renderHistory();
});

async function copy(text: string, msg: HTMLElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  msg.textContent = 'U kopjua.';
}
$('copy').addEventListener('click', () => copy($<HTMLTextAreaElement>('code').value, $('copyMsg')));

function renderHistory(): void {
  $('history').innerHTML =
    memory
      .map(
        (h, i) => `<tr><td>${esc(formatDate(dayOf(h.at)))}</td><td>${esc(h.customer || '-')}</td>
          <td>${esc(PROGRAM_NAME[h.program])}</td><td>${esc(DURATION_NAME[h.duration])}</td><td>${esc(fmt(h.expiry))}</td>
          <td><button type="button" data-copy="${i}">Kopjo</button></td></tr>`,
      )
      .join('') || '<tr><td colspan="6" class="hint">Asnjë kod ende.</td></tr>';
}
$('history').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]');
  if (b) void copy(memory[Number(b.dataset.copy)].code, b);
});
renderHistory();

$('csv').addEventListener('click', () => {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [['Data', 'Klienti', 'Programi', 'Kohëzgjatja', 'Skadon', 'Kodi'], ...memory.map((h) => [new Date(h.at).toISOString().slice(0, 10), h.customer, PROGRAM_NAME[h.program], DURATION_NAME[h.duration], fmt(h.expiry), h.code])];
  const blob = new Blob(['﻿' + rows.map((r) => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kodet-e-aktivizimit.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('checkInput').addEventListener('input', async () => {
  const text = $<HTMLTextAreaElement>('checkInput').value.trim();
  const msg = $('checkMsg');
  if (!text) {
    msg.textContent = '';
    return;
  }
  const l = await readCode(text, await publicKey);
  msg.className = `msg ${l ? 'ok' : 'err'}`;
  if (!l) msg.textContent = 'Kodi nuk është i vlefshëm.';
  else {
    const expired = l.expiry !== LIFETIME && l.expiry < dayOf(Date.now());
    msg.textContent = `I vlefshëm: ${PROGRAM_NAME[l.program]}, ${DURATION_NAME[l.duration]}, ${l.expiry === LIFETIME ? 'përjetë' : `deri më ${fmt(l.expiry)}`}${expired ? ' (ka skaduar)' : ''}.`;
  }
});

$<HTMLInputElement>('keyFile').addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  let ok = false;
  try {
    ok = await useKey(JSON.parse(await file.text()) as JsonWebKey);
  } catch {
    ok = false;
  }
  $('keyMsg').textContent = ok ? '' : 'Ky nuk është çelësi i duhur.';
  $('keyCard').hidden = ok;
  if (ok) storeKey(JSON.parse(await file.text()) as JsonWebKey);
});

// pa çelës brenda faqes: çelësi i zgjedhur një herë mbahet në këtë shfletues
const KEY_STORE = 'astcad.admin.key.v1';
function storeKey(jwk: JsonWebKey | null): void {
  try {
    if (jwk) localStorage.setItem(KEY_STORE, JSON.stringify(jwk));
    else localStorage.removeItem(KEY_STORE);
  } catch {
    // pa ruajtje: çelësi zgjidhet sërish herën tjetër
  }
}
function storedKey(): JsonWebKey | null {
  try {
    const v = localStorage.getItem(KEY_STORE);
    return v ? (JSON.parse(v) as JsonWebKey) : null;
  } catch {
    return null;
  }
}
$('forget').addEventListener('click', () => {
  storeKey(null);
  privateKey = null;
  $('keyCard').hidden = false;
});

const startKey = (typeof __ADMIN_KEY__ !== 'undefined' && __ADMIN_KEY__) || storedKey();
if (startKey) void useKey(startKey).then((ok) => ($('keyCard').hidden = ok));
else $('keyCard').hidden = false;
$('forget').hidden = typeof __ADMIN_KEY__ !== 'undefined' && !!__ADMIN_KEY__;

// ---- simbolet e përdoruesve: miratimi ----

/** Simbolet në listë: të miratuarat e deritanishme dhe ato të dërguara; on = do të jetë në listën e re. */
let pool: { sym: CustomSymbol; on: boolean; from: string }[] = [];

function symSvg(c: CustomSymbol): string {
  const b = CANVAS_BOUNDS[c.mount];
  const parts = toSymbolDef(c).parts.map((p) => `<path d="${esc(p.d)}" fill="${p.fill ? '#1F242B' : 'none'}"/>`).join('');
  return `<svg viewBox="${b.minX} ${b.minY} ${b.maxX - b.minX} ${b.maxY - b.minY}" stroke="#1F242B" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round">${parts}</svg>`;
}

function renderPool(): void {
  $('symGrid').innerHTML = pool
    .map(({ sym, on, from }, i) => {
      const name = sym.names.sq || sym.names.en || sym.names.de || sym.names.it || sym.code;
      return `<button type="button" class="sym${on ? ' on' : ''}" data-i="${i}" aria-pressed="${on}">${symSvg(sym)}<b>${esc(sym.code)}</b><span>${esc(name)}</span><small>${esc(from)}</small><span class="tag">${on ? '✓ i miratuar' : ''}</span></button>`;
    })
    .join('');
  const n = pool.filter((p) => p.on).length;
  $('communityMsg').className = 'msg';
  $('communityMsg').textContent = pool.length ? `${n} nga ${pool.length} simbole do të jenë në listën e miratuar.` : '';
}
$('symGrid').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-i]');
  if (!b) return;
  const p = pool[Number(b.dataset.i)];
  p.on = !p.on;
  renderPool();
});

function addToPool(list: CustomSymbol[], from: string, on: boolean): void {
  for (const s of list) {
    const sym = { ...s, id: communityId(s.id) };
    const i = pool.findIndex((p) => p.sym.id === sym.id);
    if (i >= 0) pool[i] = { sym, on: pool[i].on || on, from };
    else pool.push({ sym, on, from });
  }
}

async function loadApproved(): Promise<void> {
  try {
    const list = await fetchApproved(await publicKey);
    if (list === null) throw new Error('nënshkrimi nuk është i vlefshëm');
    addToPool(list, 'i miratuar më parë', true);
    renderPool();
  } catch (err) {
    $('communityMsg').className = 'msg err';
    $('communityMsg').textContent = `Lista e miratuar nuk u mor: ${(err as Error).message}`;
  }
}
$('loadApproved').addEventListener('click', () => void loadApproved());
void loadApproved();

$<HTMLInputElement>('subFiles').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  for (const f of [...(input.files ?? [])]) {
    try {
      addToPool(parseLibrary(await f.text()), f.name, false);
    } catch {
      $('communityMsg').className = 'msg err';
      $('communityMsg').textContent = `${f.name} nuk është skedar simbolesh.`;
    }
  }
  input.value = '';
  renderPool();
});

$('signApproved').addEventListener('click', async () => {
  if (!privateKey) {
    $('keyCard').hidden = false;
    return;
  }
  // kodet e përsëritura marrin kodin e lirë të radhës, si te importi në program
  const chosen = mergeSymbols([], pool.filter((p) => p.on).map((p) => p.sym));
  const text = await signApproved(chosen, privateKey);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = 'symbols.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $('communityMsg').className = 'msg ok';
  $('communityMsg').textContent = `symbols.json u shkarkua me ${chosen.length} simbole. Ngarkoje në server te allsolutiontech.de/soft/cad/symbols.json.`;
});
