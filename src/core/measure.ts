import { findRoomCached, pointInPolygon } from './rooms';
import { isOpening, isSymbol, isWall, WALL_HEIGHT, type Doc, type Opening, type SymbolEntity, type Vec, type Wall } from './types';
import { symbolDef } from '../symbols/library';

/**
 * Masat e vendosjes së elementeve në cm: lartësia nga toka dhe nga tavani, largësia nga muri majtas dhe djathtas,
 * dhe kuotat zinxhir jashtë murit (nga cepi në cep, me vizë te çdo element dhe te skajet e dyerve/dritareve).
 */

/** Muri ku ndodhet simboli: pozicioni përgjatë boshtit (mm nga a), ana e faqes dhe drejtimi drejt dhomës. */
export interface Host {
  wall: Wall;
  /** Largësia përgjatë murit nga fillimi a, mm. */
  t: number;
  /** Ana e faqes ku është simboli: +1 = majtas nga a te b. */
  side: 1 | -1;
  /** Drejtimi i murit (njësi) dhe pingulja nga muri drejt dhomës. */
  u: Vec;
  n: Vec;
  L: number;
}

const TOL = 3; // mm

/** Muri mbi faqen e të cilit është vendosur simboli, ose null (simbol i lirë). */
export function hostWall(pos: Vec, walls: Wall[]): Host | null {
  let best: (Host & { err: number }) | null = null;
  for (const w of walls) {
    const L = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
    if (L < 1) continue;
    const u = { x: (w.b.x - w.a.x) / L, y: (w.b.y - w.a.y) / L };
    const left = { x: -u.y, y: u.x };
    const rx = pos.x - w.a.x, ry = pos.y - w.a.y;
    const t = rx * u.x + ry * u.y;
    const off = rx * left.x + ry * left.y;
    const h = w.thickness / 2;
    if (t < -h - TOL || t > L + h + TOL) continue;
    const err = Math.abs(Math.abs(off) - h);
    if (err > TOL || (best && err >= best.err)) continue;
    const side: 1 | -1 = off >= 0 ? 1 : -1;
    best = { wall: w, t, side, u, n: { x: left.x * side, y: left.y * side }, L, err };
  }
  if (!best) return null;
  const { err: _err, ...host } = best;
  void _err;
  return host;
}

/** Dhoma (kontura e brendshme) në të cilën bie pika, ose null. */
function roomAt(walls: Wall[], p: Vec): Vec[] | null {
  const r = findRoomCached(walls, { x: Math.round(p.x), y: Math.round(p.y) });
  return r && pointInPolygon(p, r.poly) ? r.poly : null;
}

/**
 * Cepat e faqes së murit në anën `side`: pozicionet përgjatë boshtit (mm) ku mbaron dhoma në atë faqe,
 * nga konturat e dhomave që prekin pikat `seeds`. Pa dhomë të mbyllur: skajet e murit.
 */
export function faceCorners(host: Pick<Host, 'wall' | 'u' | 'L'>, side: 1 | -1, seeds: number[], walls: Wall[]): number[] {
  const w = host.wall;
  const h = w.thickness / 2;
  const left = { x: -host.u.y, y: host.u.x };
  const face = { x: w.a.x + left.x * h * side, y: w.a.y + left.y * h * side };
  const out: number[] = [];
  const seen = new Set<string>();
  for (const t of seeds) {
    const p = { x: face.x + host.u.x * t + left.x * side * 25, y: face.y + host.u.y * t + left.y * side * 25 };
    const poly = roomAt(walls, p);
    if (!poly) continue;
    const key = poly.map((q) => `${Math.round(q.x)},${Math.round(q.y)}`).join(';');
    if (seen.has(key)) continue;
    seen.add(key);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = (a.x - face.x) * left.x + (a.y - face.y) * left.y;
      const db = (b.x - face.x) * left.x + (b.y - face.y) * left.y;
      if (Math.abs(da) > TOL || Math.abs(db) > TOL) continue;
      for (const q of [a, b]) {
        const tq = (q.x - face.x) * host.u.x + (q.y - face.y) * host.u.y;
        if (tq >= -h - TOL && tq <= host.L + h + TOL) out.push(tq);
      }
    }
  }
  return out;
}

/** Fillimi dhe fundi i faqes së dhomës ku ndodhet pika t (mm përgjatë murit). */
export function faceSpan(host: Host, walls: Wall[]): [number, number] {
  const cs = faceCorners(host, host.side, [host.t], walls).sort((a, b) => a - b);
  const before = cs.filter((c) => c <= host.t + 0.5);
  const after = cs.filter((c) => c >= host.t - 0.5);
  const h = host.wall.thickness / 2;
  return [before.length ? before[before.length - 1] : -h, after.length ? after[0] : host.L + h];
}

/** Masat e elementit në cm (null = nuk ka kuptim për këtë element). */
export interface Placement {
  /** Lartësia nga toka (null = në tavan). */
  height: number | null;
  /** Nga tavani, sipas lartësisë së dhomës. */
  ceiling: number | null;
  /** Lartësia e dhomës (muri ku ndodhet ose muri më i afërt). */
  room: number;
  left: number | null;
  right: number | null;
  /** Elementet e lira në tavan/dysheme: largësia nga muri lart dhe poshtë në plan. */
  top: number | null;
  bottom: number | null;
  /** Elementi është në mur (majtas/djathtas sipas murit) apo i lirë (majtas/djathtas në plan). */
  onWall: boolean;
}

const cm = (mm: number) => Math.round(mm / 10);

/** Lartësia e montimit e simbolit në cm (e ruajtur ose ajo standarde), null kur është në tavan. */
export function mountHeight(s: SymbolEntity): number | null {
  const def = symbolDef(s.symbol);
  if (s.height !== undefined) return s.height;
  if (def?.mount === 'wall' && def.height !== undefined) return def.height;
  return null;
}

/** Rrezja përgjatë drejtimit d nga p deri te kontura e dhomës, mm. */
function rayToPoly(p: Vec, d: Vec, poly: Vec[]): number | null {
  let best: number | null = null;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ex = b.x - a.x, ey = b.y - a.y;
    const den = d.x * ey - d.y * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((a.x - p.x) * ey - (a.y - p.y) * ex) / den;
    const s = ((a.x - p.x) * d.y - (a.y - p.y) * d.x) / den;
    if (t >= 0 && s >= -1e-9 && s <= 1 + 1e-9 && (best === null || t < best)) best = t;
  }
  return best;
}

export function placementOf(s: SymbolEntity, doc: Doc): Placement {
  const walls = doc.entities.filter(isWall);
  const host = hostWall(s.pos, walls);
  const height = mountHeight(s);
  if (host) {
    const roomH = cm(host.wall.height ?? WALL_HEIGHT);
    const [t0, t1] = faceSpan(host, walls);
    // parë nga dhoma drejt murit: majtas është ana kundër (n.y, -n.x)
    const leftDir = { x: host.n.y, y: -host.n.x };
    const toLeftEnd = leftDir.x * host.u.x + leftDir.y * host.u.y > 0 ? t1 - host.t : host.t - t0;
    const toRightEnd = t1 - t0 - toLeftEnd;
    return { height, ceiling: height === null ? null : roomH - height, room: roomH, left: cm(toLeftEnd), right: cm(toRightEnd), top: null, bottom: null, onWall: true };
  }
  const poly = roomAt(walls, s.pos);
  let near = WALL_HEIGHT;
  let best = Infinity;
  for (const w of walls) {
    const d = Math.hypot((w.a.x + w.b.x) / 2 - s.pos.x, (w.a.y + w.b.y) / 2 - s.pos.y);
    if (d < best) (best = d), (near = w.height ?? WALL_HEIGHT);
  }
  const roomH = cm(near);
  const ray = (d: Vec) => (poly ? rayToPoly(s.pos, d, poly) : null);
  const r = (v: number | null) => (v === null ? null : cm(v));
  return {
    height,
    ceiling: height === null ? null : roomH - height,
    room: roomH,
    left: r(ray({ x: -1, y: 0 })),
    right: r(ray({ x: 1, y: 0 })),
    top: r(ray({ x: 0, y: 1 })),
    bottom: r(ray({ x: 0, y: -1 })),
    onWall: false,
  };
}

/**
 * Pozicioni i ri kur shkruhet një masë (cm): `left`/`right` lëvizin elementin përgjatë murit (ose horizontalisht),
 * `top`/`bottom` vertikalisht në plan. Kthen null kur masa s'ka kuptim.
 */
export function moveToMeasure(s: SymbolEntity, doc: Doc, key: 'left' | 'right' | 'top' | 'bottom', valueCm: number): Vec | null {
  const p = placementOf(s, doc);
  const cur = p[key];
  if (cur === null || !Number.isFinite(valueCm)) return null;
  const walls = doc.entities.filter(isWall);
  const host = p.onWall ? hostWall(s.pos, walls) : null;
  if (host) {
    const [t0, t1] = faceSpan(host, walls);
    const leftDir = { x: host.n.y, y: -host.n.x };
    const leftIsEnd = leftDir.x * host.u.x + leftDir.y * host.u.y > 0; // cepi majtas është te t1
    const v = valueCm * 10;
    const fromEnd = (key === 'left') === leftIsEnd;
    const t = Math.min(t1, Math.max(t0, fromEnd ? t1 - v : t0 + v));
    const delta = t - host.t;
    return { x: s.pos.x + host.u.x * delta, y: s.pos.y + host.u.y * delta };
  }
  const d = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, top: { x: 0, y: 1 }, bottom: { x: 0, y: -1 } }[key];
  // mbaj elementin brenda dhomës
  const room = (p.left ?? 0) + (p.right ?? 0);
  const roomV = (p.top ?? 0) + (p.bottom ?? 0);
  const limit = (key === 'left' || key === 'right' ? room : roomV) * 10;
  const target = Math.min(limit, Math.max(0, valueCm * 10));
  const delta = cur * 10 - target;
  return { x: s.pos.x + d.x * delta, y: s.pos.y + d.y * delta };
}

// ---- kuotat zinxhir jashtë murit ----

export interface ChainTick {
  /** Pika e matur (në faqen e murit ose te elementi). */
  p: Vec;
  /** Pika te vija e kuotës. */
  q: Vec;
  /** Vijë me pika nga elementi (true) ose vijë ndihmëse e zakonshme (cep, derë, dritare). */
  dotted: boolean;
}

export interface ChainText {
  text: string;
  /** Mesi i tekstit (në vijë, pa zhvendosjen e rreshtit). */
  at: Vec;
  /** Mesi i segmentit që mat (ndryshon nga `at` kur teksti u zhvendos anash). */
  anchor: Vec;
  /** Rreshti: 0 = pranë vijës, 1, 2 = më larg nga muri kur s'nxë. */
  row: number;
  length: number;
}

export interface Chain {
  wall: string;
  a: Vec;
  b: Vec;
  /** Pingulja nga muri drejt kuotës (jashtë). */
  n: Vec;
  ticks: ChainTick[];
  texts: ChainText[];
  /** Sa rreshta tekstesh u përdorën (për ta shtyrë kuotën e plotë të murit më larg). */
  rows: number;
  /** Kuota e plotë e murit bie nga e njëjta anë (duhet shtyrë më jashtë). */
  sameSide: boolean;
}

/** Madhësitë në letër (mm) të kuotave zinxhir dhe të etiketës së lartësisë. */
const MAX_ROWS = 3;
export const CHAIN_PAPER = { offset: 6, text: 2.2, row: 3.2, gap: 1.2, label: 2 };

/** Gjerësia e përafërt e tekstit me shkronjë mono, mm letre. */
const textW = (s: string, size: number) => s.length * size * 0.62;

/**
 * Një kuotë zinxhir për çdo mur me elemente të instaluara ose me dyer/dritare:
 * cepat e dhomave në faqen e elementeve, çdo element dhe skajet e hapjeve, distancat në cm nga cepi në cep.
 * Vija del nga ana e jashtme e planit (si kuotat e mureve); tekstet që s'nxënë kalojnë në rreshtin tjetër.
 */
export function chainDimensions(doc: Doc, scale: number, opts: { symbols?: SymbolEntity[]; openings?: Opening[] } = {}): Chain[] {
  const walls = doc.entities.filter(isWall);
  if (!walls.length) return [];
  const symbols = opts.symbols ?? doc.entities.filter(isSymbol);
  const openings = opts.openings ?? doc.entities.filter(isOpening);
  let cx = 0, cy = 0;
  for (const w of walls) (cx += w.a.x + w.b.x), (cy += w.a.y + w.b.y);
  cx /= walls.length * 2;
  cy /= walls.length * 2;

  const byWall = new Map<string, { t: number; side: 1 | -1; pos: Vec }[]>();
  for (const s of symbols) {
    if (symbolDef(s.symbol)?.mount !== 'wall') continue;
    const h = hostWall(s.pos, walls);
    if (!h) continue;
    byWall.set(h.wall.id, [...(byWall.get(h.wall.id) ?? []), { t: h.t, side: h.side, pos: s.pos }]);
  }
  const holes = new Map<string, Opening[]>();
  for (const o of openings) holes.set(o.wall, [...(holes.get(o.wall) ?? []), o]);

  const out: Chain[] = [];
  for (const w of walls) {
    const els = byWall.get(w.id) ?? [];
    const ops = holes.get(w.id) ?? [];
    if (!els.length) continue;
    const L = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
    if (L < 1) continue;
    const u = { x: (w.b.x - w.a.x) / L, y: (w.b.y - w.a.y) / L };
    const left = { x: -u.y, y: u.x };
    // faqja e elementeve: ajo me më shumë elemente
    const side: 1 | -1 = els.filter((e) => e.side === 1).length >= els.filter((e) => e.side === -1).length ? 1 : -1;
    const h = w.thickness / 2;
    let corners = faceCorners({ wall: w, u, L }, side, els.filter((e) => e.side === side).map((e) => e.t), walls);
    if (!corners.length) corners = [-h, L + h];
    const lo = Math.min(...corners), hi = Math.max(...corners);
    // kuota del nga ana tjetër e murit, larg elementeve (te muret e jashtme: jashtë planit)
    const n = { x: -left.x * side, y: -left.y * side };
    // kuota e plotë e murit del larg qendrës së planit; kur bie nga e njëjta anë, shtyhet më jashtë
    const sameSide = ((w.a.x + w.b.x) / 2 - cx) * n.x + ((w.a.y + w.b.y) / 2 - cy) * n.y >= 0;
    const off = h + CHAIN_PAPER.offset * scale;
    const axis = (t: number, d: number): Vec => ({ x: w.a.x + u.x * t + n.x * d, y: w.a.y + u.y * t + n.y * d });
    const items: { t: number; tick: ChainTick }[] = [];
    for (const c of corners) items.push({ t: c, tick: { p: axis(c, h), q: axis(c, off), dotted: false } });
    for (const o of ops) {
      for (const t of [o.t - o.width / 2, o.t + o.width / 2]) {
        if (t < lo - 1 || t > hi + 1) continue;
        items.push({ t, tick: { p: axis(t, h), q: axis(t, off), dotted: false } });
      }
    }
    for (const e of els) items.push({ t: e.t, tick: { p: e.pos, q: axis(e.t, off), dotted: true } });
    items.sort((a, b) => a.t - b.t);
    const ts: typeof items = [];
    for (const it of items) {
      const last = ts[ts.length - 1];
      if (last && Math.abs(it.t - last.t) < 5) {
        if (it.tick.dotted) ts[ts.length - 1] = it; // elementi ka përparësi mbi cepin/hapjen në të njëjtin vend
        continue;
      }
      ts.push(it);
    }
    if (ts.length < 2) continue;
    // tekstet: rreshti i parë ku nuk prek tekstin fqinj
    const rowsEnd: number[] = [];
    const texts: ChainText[] = [];
    for (let i = 0; i + 1 < ts.length; i++) {
      const len = ts[i + 1].t - ts[i].t;
      const text = String(Math.round(len / 10));
      const mid = (ts[i].t + ts[i + 1].t) / 2;
      const half = (textW(text, CHAIN_PAPER.text) * scale) / 2 + CHAIN_PAPER.gap * scale * 0.5;
      const fits = len >= 2 * half;
      let row = 0;
      while (row < MAX_ROWS && ((rowsEnd[row] ?? -Infinity) > mid - half || (row === 0 && !fits))) row++;
      let at = mid;
      if (row >= MAX_ROWS) {
        // të gjithë rreshtat e zënë: teksti zhvendoset pak anash në rreshtin më të lirë, me vijë te mesi
        row = 1;
        for (let r = 2; r < MAX_ROWS; r++) if ((rowsEnd[r] ?? -Infinity) < (rowsEnd[row] ?? -Infinity)) row = r;
        at = Math.max(mid, (rowsEnd[row] ?? -Infinity) + half);
      }
      rowsEnd[row] = at + half;
      texts.push({ text, at: axis(at, off), anchor: axis(mid, off), row, length: len });
    }
    out.push({ wall: w.id, a: axis(ts[0].t, off), b: axis(ts[ts.length - 1].t, off), n, ticks: ts.map((x) => x.tick), texts, rows: Math.max(1, rowsEnd.length), sameSide });
  }
  return out;
}

/** Etiketa e lartësisë pranë elementit në mur, p.sh. "h 30" (cm nga toka). */
export function heightLabel(s: SymbolEntity): string | null {
  if (symbolDef(s.symbol)?.mount !== 'wall') return null;
  const h = mountHeight(s);
  return h === null ? null : `h ${h}`;
}
