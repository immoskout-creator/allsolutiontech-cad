import type { Coverage } from './coverage';
import { dist } from './geometry';
import { findRoomCached, pointInPolygon } from './rooms';
import { isRoom, isSymbol, isWall, type Doc, type SymbolEntity, type Vec } from './types';
import { symbolDef } from '../symbols/library';
import { symbolCenter } from '../symbols/place';

/**
 * Ndriçimi i emergjencës sipas EN 1838:
 * - zona e hapur (anti-panik): të paktën 0.5 lux në dysheme, njëtrajtshmëria max/min jo më shumë se 40:1;
 * - rruga e evakuimit: të paktën 1 lux në vijën e mesit;
 * - tabela EXIT me dritë të brendshme shihet deri në 200 × lartësinë e piktogramit.
 * Ndriçimi llogaritet si burim pikësor Lambertian: I₀ = Φ / π, E = I₀ · h² / (h² + d²)².
 * Është vlerësim për projektin; vlerat e sakta janë te fotometria e prodhuesit.
 */
export const LUX_OPEN = 0.5;
export const LUX_ROUTE = 1;
export const UNIFORMITY_MAX = 40;
/** Zona e hapur mbi këtë sipërfaqe ka gjithmonë nevojë për ndriçim anti-panik, m². */
export const OPEN_AREA_M2 = 60;
/** Faktori i distancës së shikimit për tabelat me dritë të brendshme. */
export const SIGN_FACTOR = 200;
export const EM_HEIGHT_CM = 270;
export const LUMEN_LIMITS = [10, 20000] as const;
/** Hapi i rrjetës me të cilën kontrollohet ndriçimi i dhomës, mm. */
export const EM_GRID_MM = 250;

/** Modelet e ndriçuesve dhe tabelave: fluksi në emergjencë ose madhësia e piktogramit. */
export interface EmergencyModel {
  id: string;
  name: string;
  symbol: string;
  lumens?: number;
  /** Lartësia e piktogramit, mm. */
  sign?: number;
}

const lamps = (symbol: string, list: [number, string][]): EmergencyModel[] =>
  list.map(([lm, h]) => ({ id: `${symbol}-${lm}`, name: `LED ${lm} lm · ${h}`, symbol, lumens: lm }));
const signs = (symbol: string, sizes: number[]): EmergencyModel[] =>
  sizes.map((mm) => ({ id: `${symbol}-${mm}`, name: `EXIT ${mm} mm · ${(mm * SIGN_FACTOR) / 1000} m`, symbol, sign: mm }));

export const EM_MODELS: EmergencyModel[] = [
  ...lamps('em-tavan', [[100, '1 h'], [200, '1 h'], [300, '3 h'], [450, '3 h'], [800, '3 h'], [1500, '3 h']]),
  ...lamps('em-mur', [[100, '1 h'], [200, '1 h'], [300, '3 h']]),
  ...lamps('em-ip65', [[200, '1 h'], [300, '3 h'], [600, '3 h'], [1200, '3 h']]),
  { id: 'em-spot-1000', name: 'Twin spot 2×500 lm · 3 h', symbol: 'em-spot', lumens: 1000 },
  { id: 'em-spot-2000', name: 'Twin spot 2×1000 lm · 3 h', symbol: 'em-spot', lumens: 2000 },
  ...signs('em-exit-mur', [100, 150, 200]),
  ...signs('em-exit-tavan', [150, 200, 250]),
];

export const emModelsFor = (symbol: string) => EM_MODELS.filter((m) => m.symbol === symbol);
export const emModel = (e: SymbolEntity) => EM_MODELS.find((m) => m.id === e.model && m.symbol === e.symbol);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export interface LuminaireCalc {
  /** Lartësia e montimit, m. */
  height: number;
  lumens: number;
  /** Intensiteti poshtë, cd. */
  intensity: number;
  /** Ndriçimi drejt poshtë ndriçuesit, lux. */
  below: number;
  /** Rrezja deri ku dyshemeja merr 0.5 lux dhe 1 lux, m. */
  rOpen: number;
  rRoute: number;
}

/** Ndriçimi në dysheme në largësinë horizontale d (m) nga ndriçuesi. */
export const luxAt = (c: Pick<LuminaireCalc, 'height' | 'intensity'>, d: number) => (c.intensity * c.height ** 2) / (c.height ** 2 + d * d) ** 2;

/** Largësia ku ndriçimi bie te `lux`; 0 kur as poshtë ndriçuesit nuk arrihet. */
export function radiusFor(c: Pick<LuminaireCalc, 'height' | 'intensity'>, lux: number): number {
  const r2 = Math.sqrt((c.intensity * c.height ** 2) / lux) - c.height ** 2;
  return r2 > 0 ? Math.sqrt(r2) : 0;
}

export function luminaireCalc(e: SymbolEntity): LuminaireCalc | null {
  const def = symbolDef(e.symbol);
  if (!def?.emergency) return null;
  const height = clamp(num(e.height, def.height ?? EM_HEIGHT_CM), 100, 2000) / 100;
  const lumens = clamp(num(e.lumens, emModel(e)?.lumens ?? def.emergency.lumens), ...LUMEN_LIMITS);
  const intensity = lumens / Math.PI;
  const c = { height, intensity };
  return { height, lumens, intensity, below: luxAt(c, 0), rOpen: radiusFor(c, LUX_OPEN), rRoute: radiusFor(c, LUX_ROUTE) };
}

export interface SignCalc {
  /** Lartësia e piktogramit, mm. */
  size: number;
  /** Distanca maksimale e shikimit, m. */
  distance: number;
}

export function signCalc(e: SymbolEntity): SignCalc | null {
  const def = symbolDef(e.symbol);
  if (!def?.sign) return null;
  const size = emModel(e)?.sign ?? def.sign.size;
  return { size, distance: (size * SIGN_FACTOR) / 1000 };
}

/** Rrethi 0.5 lux i ndriçuesit, me rrethin 1 lux brenda tij. */
export function emergencyCoverage(e: SymbolEntity, unit: number): Coverage | null {
  const c = luminaireCalc(e);
  if (!c) return null;
  return { apex: symbolCenter(e, unit), dir: 90, fov: 360, range: c.rOpen * 1000, inner: c.rRoute * 1000, label: `${Math.round(c.lumens)} lm · R ${+c.rOpen.toFixed(1)} m` };
}

export interface RoomLight {
  id: string;
  name: string;
  /** Dhoma kontrollohet: ka ndriçues ose kalon 60 m². */
  required: boolean;
  /** Pjesa e dyshemesë me të paktën 0.5 lux, 0–1. */
  covered: number;
  min: number;
  max: number;
  /** Njëtrajtshmëria max/min kalon 40:1. */
  uneven: boolean;
  /** Qendrat e katrorëve nën 0.5 lux. */
  gaps: Vec[];
}

export interface SignCheck {
  /** Pika më e largët e dhomës nga tabela, m. */
  farthest: number | null;
  tooFar: boolean;
}

export interface EmergencyCheck {
  rooms: RoomLight[];
  signs: Map<string, SignCheck>;
}

let last: { key: string; result: EmergencyCheck } | null = null;

export function checkEmergencyCached(doc: Doc): EmergencyCheck {
  const key = JSON.stringify(doc.entities.filter((e) => isWall(e) || isRoom(e) || (isSymbol(e) && (symbolDef(e.symbol)?.emergency || symbolDef(e.symbol)?.sign))));
  if (last?.key !== key) last = { key, result: checkEmergency(doc) };
  return last.result;
}

export function checkEmergency(doc: Doc): EmergencyCheck {
  const walls = doc.entities.filter(isWall);
  const symbols = doc.entities.filter(isSymbol);
  const lums = symbols.flatMap((e) => {
    const c = luminaireCalc(e);
    return c ? [{ e, c }] : [];
  });
  const shapes = doc.entities.filter(isRoom).flatMap((r) => {
    const shape = findRoomCached(walls, r.pos);
    return shape ? [{ r, shape }] : [];
  });
  const roomOf = (p: Vec) => shapes.find((s) => pointInPolygon(p, s.shape.poly));
  // simboli i murit qëndron te faqja e murit: dhoma e tij gjendet pak më brenda, në drejtimin e tij
  const roomOfSymbol = (e: SymbolEntity) => {
    if (symbolDef(e.symbol)?.mount !== 'wall') return roomOf(e.pos);
    const a = (e.angle * Math.PI) / 180;
    return roomOf({ x: e.pos.x + Math.cos(a) * 150, y: e.pos.y + Math.sin(a) * 150 });
  };

  // drita nuk kalon muret: çdo dhomë ndriçohet vetëm nga ndriçuesit e saj
  const rooms: RoomLight[] = shapes.map(({ r, shape }) => {
    const inside = lums.filter(({ e }) => roomOfSymbol(e)?.r.id === r.id);
    const required = inside.length > 0 || shape.area / 1e6 >= OPEN_AREA_M2;
    const xs = shape.poly.map((p) => p.x);
    const ys = shape.poly.map((p) => p.y);
    const gaps: Vec[] = [];
    let total = 0;
    let min = Infinity;
    let max = 0;
    for (let x = Math.min(...xs) + EM_GRID_MM / 2; x < Math.max(...xs); x += EM_GRID_MM) {
      for (let y = Math.min(...ys) + EM_GRID_MM / 2; y < Math.max(...ys); y += EM_GRID_MM) {
        const p = { x, y };
        if (!pointInPolygon(p, shape.poly)) continue;
        total++;
        const lux = inside.reduce((s, { e, c }) => s + luxAt(c, dist(e.pos, p) / 1000), 0);
        min = Math.min(min, lux);
        max = Math.max(max, lux);
        if (lux < LUX_OPEN) gaps.push(p);
      }
    }
    if (!total) min = 0;
    return {
      id: r.id,
      name: r.name,
      required,
      covered: total ? 1 - gaps.length / total : 1,
      min,
      max,
      uneven: min > 0 && max / min > UNIFORMITY_MAX,
      gaps: required ? gaps : [],
    };
  });

  const signs = new Map<string, SignCheck>();
  for (const e of symbols) {
    const s = signCalc(e);
    if (!s) continue;
    const room = roomOfSymbol(e);
    const farthest = room ? Math.max(...room.shape.poly.map((p) => dist(p, e.pos))) / 1000 : null;
    signs.set(e.id, { farthest, tooFar: farthest !== null && farthest > s.distance });
  }
  return { rooms, signs };
}
