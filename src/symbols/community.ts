import { parseCustomSymbols, type CustomSymbol } from './custom';

/**
 * Simbolet e komunitetit: përdoruesit dërgojnë simbolet e tyre, administratori i shikon,
 * miraton ato që i pëlqejnë dhe i nënshkruan me çelësin e tij (i njëjti me kodet e aktivizimit).
 * Lista e miratuar publikohet në faqen tonë, te https://allsolutiontech.de/soft/cad/symbols.json; programi e merr
 * prej andej dhe e pranon vetëm nëse nënshkrimi është i vlefshëm, që askush tjetër të mos shtojë simbole.
 */
export const COMMUNITY_URL = 'https://allsolutiontech.de/soft/cad/symbols.json';
export const SUBMIT_EMAIL = 'info@allsolutiontech.de';

export interface ApprovedFile {
  format: 'astlib-approved';
  version: 1;
  /** {approved, symbols} si tekst JSON: nënshkrimi është mbi këto bajtë saktësisht. */
  payload: string;
  /** Nënshkrimi ECDSA P-256 / SHA-256, base64. */
  sig: string;
}

const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;
const enc = (s: string) => new TextEncoder().encode(s);
const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Krijon skedarin e miratuar dhe të nënshkruar (faqja e administratorit). */
export async function signApproved(symbols: CustomSymbol[], privateKey: CryptoKey, approved = new Date().toISOString().slice(0, 10)): Promise<string> {
  const payload = JSON.stringify({ approved, symbols });
  const sig = new Uint8Array(await crypto.subtle.sign(SIGN, privateKey, enc(payload)));
  const f: ApprovedFile = { format: 'astlib-approved', version: 1, payload, sig: toB64(sig) };
  return JSON.stringify(f, null, 2);
}

/** Lexon skedarin e miratuar: simbolet nëse nënshkrimi i administratorit është i vlefshëm, përndryshe null. */
export async function readApproved(text: string, publicKey: CryptoKey): Promise<{ approved: string; symbols: CustomSymbol[] } | null> {
  try {
    const f = JSON.parse(text) as Partial<ApprovedFile>;
    if (f.format !== 'astlib-approved' || typeof f.payload !== 'string' || typeof f.sig !== 'string') return null;
    const ok = await crypto.subtle.verify(SIGN, publicKey, fromB64(f.sig), enc(f.payload));
    if (!ok) return null;
    const p = JSON.parse(f.payload) as { approved?: unknown; symbols?: unknown };
    return { approved: typeof p.approved === 'string' ? p.approved : '', symbols: parseCustomSymbols(p.symbols) };
  } catch {
    return null;
  }
}

/** Merr simbolet e miratuara nga interneti. null = nuk u verifikuan; [] = ende s'ka. */
export async function fetchApproved(publicKey: CryptoKey): Promise<CustomSymbol[] | null> {
  const res = await fetch(COMMUNITY_URL, { cache: 'no-store' });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await readApproved(await res.text(), publicKey))?.symbols ?? null;
}

/** Simbolet e komunitetit marrin id dhe kod të tyre, që të mos përplasen me simbolet e përdoruesit. */
export const communityId = (id: string) => (id.startsWith('c-') ? id : `c-${id}`);
