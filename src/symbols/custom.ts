import type { CoreLang } from '../i18n/strings';
import { strokeText, STROKE_CHARS, type SymbolDef, type SymbolPart } from './library';

/**
 * Simbolet që i vizaton vetë përdoruesi. Ruhen në projekt si forma të thjeshta
 * (që të mund të ndryshohen më vonë) dhe kthehen në rrugë SVG si simbolet e librarisë.
 * Të gjitha koordinatat janë në njësi lokale të simbolit (1 njësi = 0.3 mm në letër), y poshtë.
 */
export type Shape =
  | { kind: 'line'; a: Pt; b: Pt }
  | { kind: 'rect'; a: Pt; b: Pt; fill?: boolean }
  | { kind: 'circle'; c: Pt; r: number; fill?: boolean }
  /** Hark nga pika a te pika b rreth qendrës c, në drejtimin e akrepave të orës në ekran (sweep = 1) ose kundër. */
  | { kind: 'arc'; c: Pt; a: Pt; b: Pt; sweep: 0 | 1 }
  | { kind: 'text'; p: Pt; text: string; size: number }
  /** Shumëkëndësh i hapur ose i mbyllur (trekëndësh, shigjetë, formë e lirë). */
  | { kind: 'poly'; pts: Pt[]; closed: boolean; fill?: boolean }
  /** Pjesë e marrë gati nga një simbol i librarisë (rrugë SVG me komanda absolute). */
  | { kind: 'path'; d: string; fill?: boolean };

export interface Pt {
  x: number;
  y: number;
}

export interface CustomSymbol {
  id: string;
  code: string;
  /** Emrat; gjuha që mungon merr emrin e parë që ekziston. */
  names: Partial<Record<CoreLang, string>>;
  layer: string;
  mount: 'wall' | 'center';
  shapes: Shape[];
  height?: number;
  power?: number;
}

/** Kufijtë e zonës së vizatimit në njësi lokale, sipas mënyrës së montimit. */
export const CANVAS_BOUNDS = {
  wall: { minX: -20, maxX: 20, minY: -4, maxY: 26 },
  center: { minX: -20, maxX: 20, minY: -15, maxY: 15 },
} as const;

const n = (v: number) => +v.toFixed(2);

/** Teksti vetëm me shkronjat që dimë t'i vizatojmë me vija. */
export function cleanText(text: string): string {
  return [...text.toUpperCase()].filter((c) => STROKE_CHARS.has(c)).join('').trim();
}

export function shapeToPart(s: Shape): SymbolPart | null {
  switch (s.kind) {
    case 'line':
      return { d: `M${n(s.a.x)} ${n(s.a.y)} L${n(s.b.x)} ${n(s.b.y)}` };
    case 'rect': {
      const x1 = Math.min(s.a.x, s.b.x);
      const x2 = Math.max(s.a.x, s.b.x);
      const y1 = Math.min(s.a.y, s.b.y);
      const y2 = Math.max(s.a.y, s.b.y);
      if (x1 === x2 || y1 === y2) return null;
      return { d: `M${n(x1)} ${n(y1)} H${n(x2)} V${n(y2)} H${n(x1)} Z`, fill: s.fill };
    }
    case 'circle': {
      if (!(s.r > 0)) return null;
      const { x, y } = s.c;
      return {
        d: `M${n(x + s.r)} ${n(y)} A${n(s.r)} ${n(s.r)} 0 1 1 ${n(x - s.r)} ${n(y)} A${n(s.r)} ${n(s.r)} 0 1 1 ${n(x + s.r)} ${n(y)} Z`,
        fill: s.fill,
      };
    }
    case 'arc': {
      const r = Math.hypot(s.a.x - s.c.x, s.a.y - s.c.y);
      if (!(r > 0)) return null;
      // pika e fundit vendoset mbi rreth, në drejtimin e b
      const ang = Math.atan2(s.b.y - s.c.y, s.b.x - s.c.x);
      const bx = s.c.x + r * Math.cos(ang);
      const by = s.c.y + r * Math.sin(ang);
      const a0 = Math.atan2(s.a.y - s.c.y, s.a.x - s.c.x);
      let span = ang - a0;
      if (s.sweep === 1) while (span < 0) span += Math.PI * 2;
      else while (span > 0) span -= Math.PI * 2;
      const large = Math.abs(span) > Math.PI ? 1 : 0;
      return { d: `M${n(s.a.x)} ${n(s.a.y)} A${n(r)} ${n(r)} 0 ${large} ${s.sweep} ${n(bx)} ${n(by)}` };
    }
    case 'text': {
      const text = cleanText(s.text);
      if (!text) return null;
      return { d: strokeText(text, s.p.x, s.p.y, s.size) };
    }
    case 'poly': {
      if (s.pts.length < 2) return null;
      const d = s.pts.map((q, i) => `${i ? 'L' : 'M'}${n(q.x)} ${n(q.y)}`).join(' ') + (s.closed ? ' Z' : '');
      return { d, fill: s.closed && s.fill };
    }
    case 'path':
      return { d: s.d, fill: s.fill };
  }
}

/** Sa parametra merr secila komandë absolute e rrugës SVG. */
const PATH_ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6, A: 7, Z: 0 };
const PATH_RE = /^[MLHVQCAZ0-9eE.,\s+-]*$/;

/** Zhvendos një rrugë SVG me komanda absolute (M L H V Q C A Z). */
export function translatePath(d: string, dx: number, dy: number): string {
  const tokens = d.match(/[MLHVQCAZ]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi) ?? [];
  const out: string[] = [];
  let cmd = '';
  let args: number[] = [];
  const flush = () => {
    const k = PATH_ARGS[cmd];
    if (!cmd || k === undefined) return;
    if (k === 0) return void out.push(cmd);
    for (let i = 0; i + k <= args.length; i += k) {
      const a = args.slice(i, i + k);
      if (cmd === 'H') a[0] += dx;
      else if (cmd === 'V') a[0] += dy;
      else if (cmd === 'A') {
        a[5] += dx;
        a[6] += dy;
      } else for (let j = 0; j < k; j += 2) {
        a[j] += dx;
        a[j + 1] += dy;
      }
      out.push(cmd + a.map(n).join(' '));
    }
  };
  for (const tk of tokens) {
    if (/^[A-Za-z]$/.test(tk)) {
      flush();
      cmd = tk.toUpperCase();
      args = [];
    } else args.push(Number(tk));
  }
  flush();
  return out.join(' ');
}

/** Forma e zhvendosur me (dx, dy). */
export function translateShape(s: Shape, dx: number, dy: number): Shape {
  const m = (q: Pt): Pt => ({ x: n(q.x + dx), y: n(q.y + dy) });
  switch (s.kind) {
    case 'line':
    case 'rect':
      return { ...s, a: m(s.a), b: m(s.b) };
    case 'circle':
      return { ...s, c: m(s.c) };
    case 'arc':
      return { ...s, c: m(s.c), a: m(s.a), b: m(s.b) };
    case 'text':
      return { ...s, p: m(s.p) };
    case 'poly':
      return { ...s, pts: s.pts.map(m) };
    case 'path':
      return { ...s, d: translatePath(s.d, dx, dy) };
  }
}

/** Gjysmërreth i mbyllur me diametrin a–b; harku del nga ana e pikës "side". */
export function semicircle(a: Pt, b: Pt, side: Pt, fill = false): Shape {
  const r = Math.hypot(b.x - a.x, b.y - a.y) / 2;
  const cross = (b.x - a.x) * (side.y - a.y) - (b.y - a.y) * (side.x - a.x);
  const d = `M${n(a.x)} ${n(a.y)} A${n(r)} ${n(r)} 0 0 ${cross >= 0 ? 0 : 1} ${n(b.x)} ${n(b.y)} Z`;
  return fill ? { kind: 'path', d, fill: true } : { kind: 'path', d };
}

/** Pjesët e një simboli të librarisë si forma, që të nisë prej tij një simbol i ri. */
export function shapesFromDef(def: SymbolDef): Shape[] {
  return def.parts.map((p) => (p.fill ? { kind: 'path', d: p.d, fill: true } : { kind: 'path', d: p.d }));
}

/** Emrat për të katër gjuhët bazë; ato që mungojnë marrin emrin e parë të plotësuar. */
export function fullNames(names: Partial<Record<CoreLang, string>>, fallback: string): Record<CoreLang, string> {
  const first = (['sq', 'en', 'it', 'de'] as const).map((l) => names[l]?.trim()).find(Boolean) ?? fallback;
  const pick = (l: CoreLang) => names[l]?.trim() || first;
  return { sq: pick('sq'), en: pick('en'), it: pick('it'), de: pick('de') };
}

/** Kthen simbolin e përdoruesit në përkufizim si ato të librarisë. */
export function toSymbolDef(c: CustomSymbol): SymbolDef {
  const def: SymbolDef = {
    id: c.id,
    code: c.code,
    category: 'custom',
    layer: c.layer,
    mount: c.mount,
    names: fullNames(c.names, c.code),
    parts: c.shapes.map(shapeToPart).filter((p): p is SymbolPart => !!p),
  };
  if (c.height !== undefined) def.height = c.height;
  if (c.power !== undefined) def.power = c.power;
  return def;
}

/** Kodi i lirë i radhës: AST-U-01, AST-U-02, ... */
export function nextCode(existing: string[]): string {
  const used = new Set(existing);
  for (let i = 1; i < 1000; i++) {
    const code = `AST-U-${String(i).padStart(2, '0')}`;
    if (!used.has(code)) return code;
  }
  return `AST-U-${Date.now().toString(36)}`;
}

// ---- kontrolli i skedarëve ----

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isPt = (v: unknown): v is Pt => typeof v === 'object' && v !== null && isNum((v as Pt).x) && isNum((v as Pt).y);

function validShape(s: unknown): s is Shape {
  const x = s as Partial<Shape> & Record<string, unknown>;
  if (!x || typeof x !== 'object') return false;
  switch (x.kind) {
    case 'line':
    case 'rect':
      return isPt(x.a) && isPt(x.b);
    case 'circle':
      return isPt(x.c) && isNum(x.r) && x.r > 0;
    case 'arc':
      return isPt(x.c) && isPt(x.a) && isPt(x.b) && (x.sweep === 0 || x.sweep === 1);
    case 'text':
      return isPt(x.p) && typeof x.text === 'string' && isNum(x.size) && x.size > 0;
    case 'poly':
      return Array.isArray(x.pts) && x.pts.length >= 2 && x.pts.length <= 500 && x.pts.every(isPt) && typeof x.closed === 'boolean';
    case 'path':
      return typeof x.d === 'string' && x.d.length > 0 && x.d.length <= 50000 && PATH_RE.test(x.d);
    default:
      return false;
  }
}

/** Mban vetëm simbolet e vlefshme nga një skedar projekti ose librarie. */
export function parseCustomSymbols(raw: unknown): CustomSymbol[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomSymbol[] = [];
  for (const item of raw) {
    const c = item as Partial<CustomSymbol>;
    if (!c || typeof c.id !== 'string' || typeof c.code !== 'string' || !c.code.trim()) continue;
    if (c.mount !== 'wall' && c.mount !== 'center') continue;
    if (typeof c.layer !== 'string' || !Array.isArray(c.shapes)) continue;
    const names: Partial<Record<CoreLang, string>> = {};
    for (const l of ['sq', 'en', 'it', 'de'] as const) {
      const v = (c.names as Record<string, unknown> | undefined)?.[l];
      if (typeof v === 'string' && v.trim()) names[l] = v;
    }
    const sym: CustomSymbol = { id: c.id, code: c.code.trim(), names, layer: c.layer, mount: c.mount, shapes: c.shapes.filter(validShape) };
    if (isNum(c.height)) sym.height = c.height;
    if (isNum(c.power)) sym.power = c.power;
    out.push(sym);
  }
  return out;
}

/** Skedari i librarisë së përdoruesit, për ta përdorur në projekte të tjera. */
export interface LibraryFile {
  format: 'astlib';
  version: 1;
  symbols: CustomSymbol[];
}

export function serializeLibrary(symbols: CustomSymbol[]): string {
  const f: LibraryFile = { format: 'astlib', version: 1, symbols };
  return JSON.stringify(f, null, 2);
}

/** Lexon një librari (ose një projekt, nga i cili merren simbolet e tij). */
export function parseLibrary(text: string): CustomSymbol[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('JSON');
  }
  const f = raw as { format?: string; symbols?: unknown };
  if (f?.format !== 'astlib' && f?.format !== 'astcad') throw new Error('format');
  return parseCustomSymbols(f.symbols);
}

/**
 * Shton simbolet e importuara te ato ekzistuese. Një simbol me të njëjtën id zëvendësohet;
 * një kod që është i zënë nga një simbol tjetër merr kodin e lirë të radhës.
 */
export function mergeSymbols(existing: CustomSymbol[], incoming: CustomSymbol[]): CustomSymbol[] {
  const out = existing.filter((e) => !incoming.some((i) => i.id === e.id));
  for (const s of incoming) {
    const codes = out.map((x) => x.code);
    out.push(codes.includes(s.code) ? { ...s, code: nextCode(codes) } : s);
  }
  return out;
}
