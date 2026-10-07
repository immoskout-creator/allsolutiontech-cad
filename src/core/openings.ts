import type { Opening, Vec, Wall } from './types';

/** Gjerësitë standarde, mm. */
export const DOOR_WIDTHS = [700, 800, 900, 1000, 1200, 1400];
export const WINDOW_WIDTHS = [600, 800, 1000, 1200, 1500, 1800, 2400];
export const DEFAULT_WIDTH = { door: 900, window: 1200 } as const;
export const DOOR_HEIGHTS = [2000, 2100, 2200, 2400];
export const WINDOW_HEIGHTS = [600, 1000, 1200, 1400, 1500, 2200];
export const DEFAULT_HEIGHT = { door: 2100, window: 1400 } as const;
export const DEFAULT_SILL = 900;
/** Kufijtë e masave që pranohen, mm. */
export const SIZE_LIMITS = { min: 300, max: 6000 };

export function openingHeight(o: Pick<Opening, 'type' | 'height'>): number {
  return o.height ?? DEFAULT_HEIGHT[o.type];
}

/** Teksti i masave në cm, si në planet arkitekturore: "90/210" (gjerësi/lartësi). */
export function sizeText(o: Pick<Opening, 'type' | 'width' | 'height'>): string {
  const cm = (mm: number) => String(Math.round(mm / 10));
  return `${cm(o.width)}/${cm(openingHeight(o))}`;
}

/** Sa larg nga muri (mm) kapet ende muri gjatë vendosjes së derës/dritares. */
const ATTACH_MM = 600;

export interface OpeningFrame {
  /** Skajet e hapjes në vijën e mesit të murit (p1 nga ana e a, p2 nga ana e b). */
  p1: Vec;
  p2: Vec;
  /** Drejtimi i murit (njësi, nga a te b) dhe pingulja majtas. */
  u: Vec;
  n: Vec;
  /** Gjysma e trashësisë së murit. */
  half: number;
  /** Largësia e skajeve nga fillimi i murit. */
  s1: number;
  s2: number;
}

export function wallLength(w: Wall): number {
  return Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
}

/** Pozicioni i qendrës i kufizuar që hapja të mos dalë nga muri. */
export function clampT(t: number, width: number, wallLen: number): number {
  if (wallLen <= width) return wallLen / 2;
  return Math.min(wallLen - width / 2, Math.max(width / 2, t));
}

export function openingFrame(o: Pick<Opening, 't' | 'width'>, w: Wall): OpeningFrame | null {
  const L = wallLength(w);
  if (L < 1) return null;
  const u = { x: (w.b.x - w.a.x) / L, y: (w.b.y - w.a.y) / L };
  const width = Math.min(o.width, L);
  const c = clampT(o.t, width, L);
  const s1 = c - width / 2;
  const s2 = c + width / 2;
  return {
    p1: { x: w.a.x + u.x * s1, y: w.a.y + u.y * s1 },
    p2: { x: w.a.x + u.x * s2, y: w.a.y + u.y * s2 },
    u,
    n: { x: -u.y, y: u.x },
    half: w.thickness / 2,
    s1,
    s2,
  };
}

/** Pjesët e murit që mbeten pasi priten hapjet: intervale [s0, s1] në mm nga a. */
export function wallPieces(w: Wall, openings: Opening[]): [number, number][] {
  const L = wallLength(w);
  const cuts = openings
    .map((o) => openingFrame(o, w))
    .filter((f): f is OpeningFrame => !!f)
    .map((f) => [f.s1, f.s2] as [number, number])
    .sort((x, y) => x[0] - y[0]);
  const out: [number, number][] = [];
  let at = 0;
  for (const [s1, s2] of cuts) {
    if (s1 > at) out.push([at, s1]);
    at = Math.max(at, s2);
  }
  if (at < L) out.push([at, L]);
  return out;
}

/**
 * Ku do binte një derë/dritare për kursorin `raw`: muri më i afërt,
 * qendra e hapjes (e kapur në hapin `step`, nëse > 0) dhe ana e kursorit.
 */
export function placeOnWall(
  raw: Vec,
  walls: Wall[],
  width: number,
  step: number,
): { wall: string; t: number; side: 1 | -1 } | null {
  let best: { wall: string; t: number; side: 1 | -1; d: number } | null = null;
  for (const w of walls) {
    const L = wallLength(w);
    if (L < width) continue;
    const u = { x: (w.b.x - w.a.x) / L, y: (w.b.y - w.a.y) / L };
    const along = (raw.x - w.a.x) * u.x + (raw.y - w.a.y) * u.y;
    if (along < 0 || along > L) continue;
    const across = -(raw.x - w.a.x) * u.y + (raw.y - w.a.y) * u.x;
    const d = Math.abs(across);
    if (d > w.thickness / 2 + ATTACH_MM) continue;
    if (best && d >= best.d) continue;
    let t = step > 0 ? Math.round(along / step) * step : along;
    t = clampT(t, width, L);
    best = { wall: w.id, t: Math.round(t), side: across >= 0 ? 1 : -1, d };
  }
  return best ? { wall: best.wall, t: best.t, side: best.side } : null;
}
