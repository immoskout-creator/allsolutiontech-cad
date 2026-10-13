/**
 * Prova falas 7 ditë: serveri i AllSolutionTech nënshkruan (ECDSA P-256, i njëjti çelës si kodet) datën e kërkesës së parë
 * të kësaj pajisjeje për këtë program. Programi e ruan provën e nënshkruar dhe e kontrollon edhe pa internet.
 *
 *   POST TRIAL_URL  {"pajisja": "<sha256 hex>", "programi": "<kodi>", "platforma": "windows" | "android"}
 *   200             {"ok": true, "prova": "<tekst JSON>", "nenshkrimi": "<base64, 64 bajt r||s>"}
 *   prova           {"d": pajisja, "f": fillimi, "g": programi, "l": koha e serverit, "p": "ast-cad-prova", "v": 1}
 */

export const TRIAL_URL = 'https://admin.allsolutiontech.de/api/cad/prova';
export const TRIAL_DAYS = 7;
const SPAN = TRIAL_DAYS * 86_400;

export interface Trial {
  /** Pajisja: SHA-256 hex e "ast-cad|" + identifikuesi i pajisjes. */
  d: string;
  /** Fillimi i provës, sekonda unix. */
  f: number;
  /** Programi: civil, cctv, network, fire, emergency, all. */
  g: string;
  /** Koha e serverit kur u dha përgjigjja, sekonda unix. */
  l: number;
  p: string;
  v: number;
}

/** Prova siç vjen nga serveri: teksti saktësisht siç erdhi dhe nënshkrimi i tij. */
export interface SignedTrial {
  prova: string;
  nenshkrimi: string;
}

export type TrialState =
  | { ok: true; trial: Trial; end: number; daysLeft: number; now: number }
  | { ok: false; reason: 'invalid' | 'device' | 'program' | 'expired'; trial?: Trial; now?: number };

const subtle = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('crypto.subtle');
  return s;
};

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

/** Pajisja për serverin: SHA-256 (hex, shkronja të vogla) e "ast-cad|" + identifikuesi i qëndrueshëm i pajisjes. */
export async function deviceHash(rawId: string): Promise<string> {
  return hex(await subtle().digest('SHA-256', new TextEncoder().encode(`ast-cad|${rawId}`)));
}

function fromBase64(s: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(s.replace(/\s+/g, ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** Prova nëse nënshkrimi i serverit është i vlefshëm mbi tekstin e saktë, përndryshe null. */
export async function verifyTrial(s: SignedTrial, key: CryptoKey): Promise<Trial | null> {
  if (typeof s?.prova !== 'string' || typeof s.nenshkrimi !== 'string') return null;
  const sig = fromBase64(s.nenshkrimi);
  if (!sig || sig.length !== 64) return null;
  try {
    const ok = await subtle().verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, new TextEncoder().encode(s.prova));
    if (!ok) return null;
    const t = JSON.parse(s.prova) as Partial<Trial>;
    if (typeof t.d !== 'string' || typeof t.g !== 'string' || typeof t.p !== 'string' || !isInt(t.f) || !isInt(t.l) || !isInt(t.v)) return null;
    return t as Trial;
  } catch {
    return null;
  }
}

/**
 * Gjendja e provës për këtë pajisje dhe program. Koha që vlen është më e madhja nga ora e pajisjes, koha e serverit
 * te prova dhe koha më e madhe e parë ndonjëherë (`seen`), që kthimi i orës mbrapa të mos e zgjasë provën.
 */
export async function checkTrial(s: SignedTrial, key: CryptoKey, device: string, program: string, nowSec: number, seenSec = 0): Promise<TrialState> {
  const trial = await verifyTrial(s, key);
  if (!trial || trial.p !== 'ast-cad-prova' || trial.v !== 1) return { ok: false, reason: 'invalid' };
  if (trial.d !== device) return { ok: false, reason: 'device', trial };
  if (trial.g !== program) return { ok: false, reason: 'program', trial };
  const now = Math.max(Math.floor(nowSec), trial.l, seenSec);
  const end = trial.f + SPAN;
  if (now >= end) return { ok: false, reason: 'expired', trial, now };
  return { ok: true, trial, end, daysLeft: Math.ceil((end - now) / 86_400), now };
}

/** Përgjigjja e serverit si provë e nënshkruar, ose gabimi: 'bad' (400), 'busy' (429), 'offline' (rrjeti/serveri). */
export function parseTrialResponse(status: number, text: string): SignedTrial | 'bad' | 'busy' | 'offline' {
  if (status === 429) return 'busy';
  if (status === 400) return 'bad';
  if (status !== 200) return 'offline';
  try {
    const r = JSON.parse(text) as { ok?: boolean; prova?: unknown; nenshkrimi?: unknown };
    if (r.ok && typeof r.prova === 'string' && typeof r.nenshkrimi === 'string') return { prova: r.prova, nenshkrimi: r.nenshkrimi };
  } catch {
    // përgjigje e pakuptueshme
  }
  return 'offline';
}

/** Lidhja me serverin sipas platformës: Windows (procesi kryesor i Electron) ose Android (Capacitor). */
export interface TrialPlatform {
  device(): Promise<string>;
  request(): Promise<{ status: number; text: string }>;
}

/**
 * Platforma e provës: në Windows kërkesa bëhet nga procesi kryesor (pa Origin), në Android nga ana native
 * (CapacitorHttp). Në shfletues nuk ka provë, vetëm kodet e aktivizimit.
 */
export function trialPlatform(program: string): TrialPlatform | null {
  const desk = window.astDesktop;
  if (desk?.deviceId && desk.requestTrial) {
    const requestTrial = desk.requestTrial;
    return { device: () => desk.deviceId!(), request: () => requestTrial() };
  }
  const cap = window.Capacitor;
  if (cap?.isNativePlatform?.() && cap.nativePromise) {
    let id: Promise<string> | null = null;
    const device = () =>
      (id ??= (cap.nativePromise!('AstFiles', 'deviceId', {}) as Promise<{ id?: string }>).then((r) => {
        if (!r?.id) throw new Error('device');
        return deviceHash(r.id);
      }).catch((e: unknown) => {
        id = null;
        throw e;
      }));
    return {
      device,
      request: async () => {
        const res = await fetch(TRIAL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pajisja: await device(), programi: program, platforma: 'android' }),
        });
        return { status: res.status, text: await res.text() };
      },
    };
  }
  return null;
}
