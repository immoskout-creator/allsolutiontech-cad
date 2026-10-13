import type { DoorLeaf, Opening, Vec, Wall } from './types';
import { findRoom, type Keepout } from './rooms';

/** Gjerësitë standarde, mm. */
export const DOOR_WIDTHS = [700, 800, 900, 1000, 1100, 1200, 1400];
/** Dyert me dy kanate dhe ato rrëshqitëse me dy kanate. */
export const DOUBLE_DOOR_WIDTHS = [1200, 1400, 1600, 1800, 2000, 2400];
/** Sugjerimet e gjerësisë sipas llojit të derës. */
export const doorWidths = (leaf: DoorLeaf = 'single'): number[] => (leaf === 'double' || leaf === 'sliding2' ? DOUBLE_DOOR_WIDTHS : DOOR_WIDTHS);
/** Gjerësia që i përshtatet llojit të ri: dy kanate jo më ngushtë se 120 cm, një kanat jo më gjerë se 140 cm. */
export function widthForLeaf(width: number, leaf: DoorLeaf): number {
  // (palosëse dhe brenda murit: si dera me një kanat)
  const two = leaf === 'double' || leaf === 'sliding2';
  if (two && width < 1200) return 1400;
  if (!two && width > 1400) return 1000;
  return width;
}
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

/**
 * Xhepi i derës rrëshqitëse brenda murit: nga skaji i hapjes në anën e menteshave (`hinge`), sa gjerësia e derës,
 * por jo jashtë murit. Kthen fillimin dhe fundin në mm nga a.
 */
export function pocketRange(o: Pick<Opening, 'type' | 'leaf' | 'hinge'>, f: OpeningFrame, wallLen: number): [number, number] | null {
  if (o.type !== 'door' || o.leaf !== 'pocket') return null;
  const width = f.s2 - f.s1;
  return o.hinge === 'a' ? [Math.max(0, f.s1 - width), f.s1] : [f.s2, Math.min(wallLen, f.s2 + width)];
}

/** Pjesët e murit që mbeten pasi priten hapjet (dhe xhepat e dyerve brenda murit): intervale [s0, s1] në mm nga a. */
export function wallPieces(w: Wall, openings: Opening[]): [number, number][] {
  const L = wallLength(w);
  const cuts = openings
    .flatMap((o) => {
      const f = openingFrame(o, w);
      if (!f) return [];
      const pocket = pocketRange(o, f, L);
      return [[pocket ? Math.min(f.s1, pocket[0]) : f.s1, pocket ? Math.max(f.s2, pocket[1]) : f.s2] as [number, number]];
    })
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

/**
 * Ana e murit ku është brendësia e ndërtesës për këtë hapje (1 ose -1), nga dhomat e mbyllura me mure:
 * ana me dhomë është "brenda". Kur të dyja anët (ose asnjëra) kanë dhomë, ana 1 quhet brenda.
 */
export function insideSide(o: Pick<Opening, 't' | 'width'>, w: Wall, walls: Wall[]): 1 | -1 {
  const f = openingFrame(o, w);
  if (!f) return 1;
  const mid = { x: (f.p1.x + f.p2.x) / 2, y: (f.p1.y + f.p2.y) / 2 };
  const probe = (k: number) => ({ x: mid.x + f.n.x * k * (f.half + 150), y: mid.y + f.n.y * k * (f.half + 150) });
  const left = !!findRoom(walls, probe(1));
  const right = !!findRoom(walls, probe(-1));
  return !left && right ? -1 : 1;
}

/** Hapja e derës me fjalë: nga brenda/jashtë dhe menteshat majtas/djathtas, parë nga ana ku hapet dera. */
export type Swing = 'inRight' | 'inLeft' | 'outRight' | 'outLeft';
export const SWINGS: Swing[] = ['inRight', 'inLeft', 'outRight', 'outLeft'];

export function swingOf(o: Pick<Opening, 'side' | 'hinge'>, inside: 1 | -1): Swing {
  const into = o.side === inside ? 'in' : 'out';
  // shikuesi qëndron nga ana ku hapet dera dhe sheh murin (drejtimi -n·side); e djathta e tij është -u·side
  const hingeDir = o.hinge === 'a' ? -1 : 1;
  const right = hingeDir * o.side < 0;
  return `${into}${right ? 'Right' : 'Left'}` as Swing;
}

export function applySwing(s: Swing, inside: 1 | -1): Pick<Opening, 'side' | 'hinge'> {
  const side: 1 | -1 = s.startsWith('in') ? inside : inside === 1 ? -1 : 1;
  const right = s.endsWith('Right');
  const hingeDir = (right ? -1 : 1) * side;
  return { side, hinge: hingeDir > 0 ? 'b' : 'a' };
}

/** Zonat e dyerve (harku i kanatit ose kanati rrëshqitës) që etiketat e dhomave duhet t'i shmangin. */
export function doorKeepouts(openings: Opening[], walls: Wall[]): Keepout[] {
  const byId = new Map(walls.map((w) => [w.id, w]));
  const out: Keepout[] = [];
  for (const o of openings) {
    if (o.type !== 'door') continue;
    const w = byId.get(o.wall);
    const f = w && openingFrame(o, w);
    if (!f) continue;
    const width = f.s2 - f.s1;
    const leaf = o.leaf ?? 'single';
    const mid = { x: (f.p1.x + f.p2.x) / 2, y: (f.p1.y + f.p2.y) / 2 };
    const margin = 250;
    if (leaf === 'single') {
      const h = o.hinge === 'a' ? f.p1 : f.p2;
      out.push({ c: h, r: width + margin });
    } else if (leaf === 'double') {
      out.push({ c: f.p1, r: width / 2 + margin }, { c: f.p2, r: width / 2 + margin });
    } else {
      out.push({ c: mid, r: width / 2 + margin });
    }
  }
  return out;
}

/** Lloji i derës siç zgjidhet në listë: llojet e kanatit plus dera hyrëse (një kanat, e jashtme). */
export type DoorKind = DoorLeaf | 'entrance';
export const DOOR_KINDS: DoorKind[] = ['single', 'double', 'sliding', 'sliding2', 'folding', 'pocket', 'entrance'];

export function doorKind(o: Pick<Opening, 'leaf' | 'exterior'>): DoorKind {
  const leaf = o.leaf ?? 'single';
  return leaf === 'single' && o.exterior ? 'entrance' : leaf;
}

/** Vendos llojin e derës: kanati, dera e jashtme dhe gjerësia që i përshtatet (hyrja jo më ngushtë se 100 cm). */
export function applyDoorKind(o: Pick<Opening, 'leaf' | 'exterior' | 'width' | 'split'>, k: DoorKind): void {
  const wasEntrance = doorKind(o) === 'entrance';
  const leaf: DoorLeaf = k === 'entrance' ? 'single' : k;
  if (leaf === 'single') delete o.leaf;
  else o.leaf = leaf;
  if (k === 'entrance') {
    o.exterior = true;
    if (o.width < 1000) o.width = 1000;
  } else if (wasEntrance) delete o.exterior;
  if (leaf !== 'double') delete o.split;
  o.width = widthForLeaf(o.width, leaf);
}

/** Këndi standard i hapjes së kanatit në plan dhe kufijtë, gradë. */
export const DEFAULT_SWING_ANGLE = 90;
export const SWING_ANGLE_LIMITS = [15, 180] as const;

/**
 * Vijat e simbolit të derës/dritares në plan, në mm të botës:
 * frame = kasa dhe faqet e dritares, heavy = kasa dhe pragu i derës hyrëse, leaf = kanati,
 * arc = harku i hapjes (me ndërprerje), thin = shigjetat dhe krahët e dritares, hidden = vija të fshehura (me ndërprerje).
 */
export type StrokeKind = 'frame' | 'heavy' | 'leaf' | 'arc' | 'thin' | 'hidden';
export interface OpeningStroke {
  kind: StrokeKind;
  pts: Vec[];
  closed?: boolean;
}

/** Kanatet e derës me dy kanate: gjerësia e kanatit nga ana a dhe ajo nga ana b. */
export function doubleLeaves(o: Pick<Opening, 'split' | 'hinge'>, width: number): [number, number] {
  if (o.split !== 'third') return [width / 2, width / 2];
  const narrow = width / 3;
  return o.hinge === 'a' ? [narrow, width - narrow] : [width - narrow, narrow];
}

export function openingSymbol(o: Opening, w: Wall): OpeningStroke[] {
  const f = openingFrame(o, w);
  if (!f) return [];
  const out: OpeningStroke[] = [];
  const add = (kind: StrokeKind, pts: Vec[], closed = false) => out.push(closed ? { kind, pts, closed } : { kind, pts });
  // pikë nga baza, `along` përgjatë murit (drejt b) dhe `across` pingul (majtas)
  const P = (base: Vec, along: number, across: number): Vec => ({ x: base.x + f.u.x * along + f.n.x * across, y: base.y + f.u.y * along + f.n.y * across });
  const width = f.s2 - f.s1;
  const s = o.side;
  const face = f.half * s;
  const angle = (Math.min(SWING_ANGLE_LIMITS[1], Math.max(SWING_ANGLE_LIMITS[0], o.angle ?? DEFAULT_SWING_ANGLE)) * Math.PI) / 180;
  const arrow = (from: Vec, to: Vec) => {
    const L = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const d = { x: (to.x - from.x) / L, y: (to.y - from.y) / L };
    const head = Math.min(120, L * 0.4);
    const side = (k: number) => ({ x: to.x - (d.x * Math.cos(0.45) - d.y * Math.sin(0.45) * k) * head, y: to.y - (d.y * Math.cos(0.45) + d.x * Math.sin(0.45) * k) * head });
    add('thin', [from, to]);
    add('thin', [side(1), to, side(-1)]);
  };
  /** Kanat që rrotullohet rreth menteshës te `base` (në vijën e mesit), i mbyllur drejt `dir` (+1 = drejt b). */
  const swing = (base: Vec, dir: 1 | -1, lw: number, leafKind: StrokeKind) => {
    const H = P(base, 0, face);
    const at = (a: number) => P(H, dir * Math.cos(a) * lw, s * Math.sin(a) * lw);
    add(leafKind, [H, at(angle)]);
    const n = Math.max(6, Math.ceil(angle / (Math.PI / 36)));
    add('arc', Array.from({ length: n + 1 }, (_, i) => at((angle * i) / n)));
  };

  // skajet e hapjes nga njëra faqe e murit te tjetra
  for (const p of [f.p1, f.p2]) add('frame', [P(p, 0, -f.half), P(p, 0, f.half)]);

  if (o.type === 'window') {
    for (const k of [-f.half, -f.half * 0.2, f.half * 0.2, f.half]) add('frame', [P(f.p1, 0, k), P(f.p2, 0, k)]);
    const sash = o.sash ?? 'fixed';
    if (sash === 'single') swing(o.hinge === 'a' ? f.p1 : f.p2, o.hinge === 'a' ? 1 : -1, width, 'thin');
    else if (sash === 'double') {
      swing(f.p1, 1, width / 2, 'thin');
      swing(f.p2, -1, width / 2, 'thin');
    }
    return out;
  }

  const leaf = o.leaf ?? 'single';
  if (o.exterior) {
    // dera e jashtme: pragu nga ana e jashtme dhe kasa e trashë
    add('heavy', [P(f.p1, 0, -face), P(f.p2, 0, -face)]);
    for (const p of [f.p1, f.p2]) add('heavy', [P(p, 0, -f.half), P(p, 0, f.half)]);
  }
  const hingeBase = o.hinge === 'a' ? f.p1 : f.p2;
  const hingeDir: 1 | -1 = o.hinge === 'a' ? 1 : -1;
  if (leaf === 'single') swing(hingeBase, hingeDir, width, 'leaf');
  else if (leaf === 'double') {
    const [wa, wb] = doubleLeaves(o, width);
    swing(f.p1, 1, wa, 'leaf');
    swing(f.p2, -1, wb, 'leaf');
  } else if (leaf === 'folding') {
    // palosëse: dy pjesë që palosen drejt menteshave, në formë V, dhe udha e tyre
    const part = width / 2;
    const fold = Math.PI / 3;
    const H = P(hingeBase, 0, face);
    const M = P(H, hingeDir * Math.cos(fold) * part, s * Math.sin(fold) * part);
    const E = P(H, hingeDir * 2 * Math.cos(fold) * part, 0);
    add('leaf', [H, M, E]);
    add('hidden', [E, P(hingeBase === f.p1 ? f.p2 : f.p1, 0, face)]);
  } else if (leaf === 'pocket') {
    // brenda murit: xhepi (faqet e murit pa mbushje), kanati gati i futur në xhep dhe shigjeta drejt xhepit
    const L = wallLength(w);
    const pocket = pocketRange(o, f, L)!;
    const edge = o.hinge === 'a' ? f.s1 : f.s2;
    const far = o.hinge === 'a' ? pocket[0] : pocket[1];
    const W = (along: number, across: number) => ({ x: w.a.x + f.u.x * along + f.n.x * across, y: w.a.y + f.u.y * along + f.n.y * across });
    for (const k of [-f.half, f.half]) add('frame', [W(edge, k), W(far, k)]);
    add('frame', [W(far, -f.half), W(far, f.half)]);
    const t = Math.min(25, f.half * 0.4);
    const inPocket = Math.abs(far - edge);
    const out0 = edge + (hingeDir === 1 ? 1 : -1) * Math.min(width * 0.2, 150);
    const in0 = edge - (hingeDir === 1 ? 1 : -1) * Math.max(0, inPocket - 20);
    add('leaf', [W(in0, -t), W(out0, -t), W(out0, t), W(in0, t)], true);
    const mid = (f.s1 + f.s2) / 2;
    const ay = face + s * Math.max(60, f.half * 0.6);
    arrow(W(mid + hingeDir * width * 0.15, ay), W(mid - hingeDir * width * 0.15, ay));
  } else {
    // rrëshqitëse: kanati paralel me murin, nga ana e hapjes, me shigjetën e lëvizjes
    const panels: [number, number, number][] = leaf === 'sliding' ? [o.hinge === 'a' ? [0, 1, -1] : [0, 1, 1]] : [[0, 0.5, -1], [0.5, 1, 1]];
    const off = face + s * Math.max(20, f.half * 0.35);
    const thick = s * Math.max(30, f.half * 0.3);
    const pt = (k: number, across: number) => P(f.p1, width * k, across);
    for (const [k0, k1, dir] of panels) {
      add('leaf', [pt(k0, off), pt(k1, off), pt(k1, off + thick), pt(k0, off + thick)], true);
      const m = (k0 + k1) / 2;
      const span = (k1 - k0) * 0.35;
      arrow(pt(m - dir * span, off + thick * 3), pt(m + dir * span, off + thick * 3));
    }
  }
  return out;
}
