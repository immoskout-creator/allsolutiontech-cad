/**
 * Kodet e aktivizimit: administratori i nënshkruan me çelësin privat (faqja e administratorit),
 * programet i kontrollojnë me çelësin publik. Pa çelësin privat nuk mund të krijohet kod i vlefshëm.
 *
 * Përmbajtja (8 bajt): version, programi, kohëzgjatja, dita e skadimit (2 bajt), numri serik (3 bajt),
 * pastaj nënshkrimi ECDSA P-256 / SHA-256 (64 bajt). Shkruhet me base32 Crockford, në grupe nga 4.
 */

/** Programi që hap një kod. 'all' është programi ALL-IN-ONE; nuk hap programet e veçanta. */
export const LICENSE_PROGRAMS = ['all', 'civil', 'cctv', 'network', 'fire', 'emergency'] as const;
export type LicenseProgram = (typeof LICENSE_PROGRAMS)[number];

/** Kohëzgjatjet: 7 ditë, 1 muaj, 6 muaj, 1 vit, përjetë. */
export const DURATIONS = ['7d', '1m', '6m', '1y', 'life'] as const;
export type Duration = (typeof DURATIONS)[number];

/** Dita e skadimit për "përjetë". */
export const LIFETIME = 0xffff;
const VERSION = 1;
const PAYLOAD = 8;
const SIG = 64;
const DAY = 86_400_000;

export interface License {
  program: LicenseProgram;
  duration: Duration;
  /** Dita e fundit e vlefshme (ditë nga 1970-01-01, UTC), ose LIFETIME. */
  expiry: number;
  serial: number;
}

export const dayOf = (ms: number) => Math.floor(ms / DAY);
export const dateOfDay = (day: number) => new Date(day * DAY);

/** Data si 07.11.2026: e njëjtë në çdo gjuhë dhe shfletues. */
export function formatDate(day: number): string {
  const [y, m, d] = dateOfDay(day).toISOString().slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/** Dita e fundit e vlefshme kur kodi fillon në ditën `start`. */
export function expiryFor(duration: Duration, start: number): number {
  if (duration === 'life') return LIFETIME;
  if (duration === '7d') return start + 7 - 1;
  const d = dateOfDay(start);
  const months = duration === '1m' ? 1 : duration === '6m' ? 6 : 12;
  const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate());
  return dayOf(end) - 1;
}

export function encodePayload(l: License): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(PAYLOAD);
  b[0] = VERSION;
  b[1] = LICENSE_PROGRAMS.indexOf(l.program);
  b[2] = DURATIONS.indexOf(l.duration);
  b[3] = (l.expiry >> 8) & 0xff;
  b[4] = l.expiry & 0xff;
  b[5] = (l.serial >> 16) & 0xff;
  b[6] = (l.serial >> 8) & 0xff;
  b[7] = l.serial & 0xff;
  return b;
}

export function decodePayload(b: Uint8Array): License | null {
  if (b.length < PAYLOAD || b[0] !== VERSION) return null;
  const program = LICENSE_PROGRAMS[b[1]];
  const duration = DURATIONS[b[2]];
  if (!program || !duration) return null;
  return { program, duration, expiry: (b[3] << 8) | b[4], serial: (b[5] << 16) | (b[6] << 8) | b[7] };
}

// ---- base32 Crockford (pa I, L, O, U që të mos ngatërrohen) ----

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function toBase32(bytes: Uint8Array): string {
  let out = '';
  let buf = 0;
  let bits = 0;
  for (const byte of bytes) {
    buf = (buf << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buf >> (bits - 5)) & 31];
      bits -= 5;
    }
    buf &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(buf << (5 - bits)) & 31];
  return out;
}

export function fromBase32(text: string): Uint8Array<ArrayBuffer> | null {
  const clean = text.toUpperCase().replace(/[\s-]/g, '').replace(/[OIL]/g, (c) => (c === 'O' ? '0' : '1'));
  const out: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const c of clean) {
    const v = ALPHABET.indexOf(c);
    if (v < 0) return null;
    buf = (buf << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((buf >> (bits - 8)) & 0xff);
      bits -= 8;
    }
    buf &= (1 << bits) - 1;
  }
  return new Uint8Array(out);
}

/** Kodi në grupe nga 4 shkronja, që lexohet dhe kopjohet më lehtë. */
export const formatCode = (raw: string) => raw.match(/.{1,4}/g)!.join('-');

// ---- nënshkrimi ----

const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

const subtle = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('crypto.subtle');
  return s;
};

export const importPublicKey = (jwk: JsonWebKey) => subtle().importKey('jwk', jwk, ALG, false, ['verify']);
export const importPrivateKey = (jwk: JsonWebKey) => subtle().importKey('jwk', jwk, ALG, false, ['sign']);

export async function createCode(l: License, privateKey: CryptoKey): Promise<string> {
  const payload = encodePayload(l);
  const sig = new Uint8Array(await subtle().sign(SIGN, privateKey, payload));
  const all = new Uint8Array(PAYLOAD + SIG);
  all.set(payload);
  all.set(sig, PAYLOAD);
  return formatCode(toBase32(all));
}

/** Leximi i kodit: licenca nëse nënshkrimi është i vlefshëm, përndryshe null. */
export async function readCode(code: string, publicKey: CryptoKey): Promise<License | null> {
  const bytes = fromBase32(code);
  if (!bytes || bytes.length !== PAYLOAD + SIG) return null;
  const payload = bytes.slice(0, PAYLOAD);
  const license = decodePayload(payload);
  if (!license) return null;
  try {
    const ok = await subtle().verify(SIGN, publicKey, bytes.slice(PAYLOAD), payload);
    return ok ? license : null;
  } catch {
    return null;
  }
}

/** A e hap kodi këtë program? Çdo kod hap vetëm programin e vet. */
export const coversProgram = (l: License, program: string) => l.program === program;

/** Ditët që mbeten (0 = dita e fundit), negative kur ka skaduar; Infinity për përjetë. */
export const daysLeft = (l: License, today: number) => (l.expiry === LIFETIME ? Infinity : l.expiry - today);
