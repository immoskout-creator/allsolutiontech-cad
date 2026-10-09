import type { Vec, Wall } from './types';

/** Dhoma e gjetur nga muret: kontura e brendshme (pa trashësinë e mureve) dhe masat. */
export interface RoomShape {
  /** Kontura e brendshme, kundër akrepave të orës (Y lart). */
  poly: Vec[];
  /** Sipërfaqja neto, mm². */
  area: number;
  /** Perimetri i brendshëm, mm. */
  perimeter: number;
}

const EPS = 1; // mm: pikat më afër se kaq quhen e njëjta pikë

interface Edge {
  a: number;
  b: number;
  /** Gjysma e trashësisë së murit. */
  half: number;
}

/** Sipërfaqja me shenjë (pozitive kur pikat shkojnë kundër akrepave të orës). */
export function signedArea(poly: Vec[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

export function pointInPolygon(p: Vec, poly: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Parametri t (0..1) ku segmenti p-q pret segmentin r-s, ose null. */
function crossParams(p: Vec, q: Vec, r: Vec, s: Vec): [number, number] | null {
  const dx1 = q.x - p.x;
  const dy1 = q.y - p.y;
  const dx2 = s.x - r.x;
  const dy2 = s.y - r.y;
  const den = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((r.x - p.x) * dy2 - (r.y - p.y) * dx2) / den;
  const u = ((r.x - p.x) * dy1 - (r.y - p.y) * dx1) / den;
  const tolT = EPS / Math.hypot(dx1, dy1);
  const tolU = EPS / Math.hypot(dx2, dy2);
  if (t < -tolT || t > 1 + tolT || u < -tolU || u > 1 + tolU) return null;
  return [Math.min(1, Math.max(0, t)), Math.min(1, Math.max(0, u))];
}

/**
 * Ndërton grafin e mureve: çdo mur ndahet aty ku takon një mur tjetër,
 * dhe muret pa dalje (fundet e lira) hiqen, sepse nuk mbyllin dhoma.
 */
function buildGraph(walls: Wall[]): { nodes: Vec[]; edges: Edge[] } {
  const nodes: Vec[] = [];
  const nodeAt = (p: Vec): number => {
    for (let i = 0; i < nodes.length; i++) if (Math.abs(nodes[i].x - p.x) <= EPS && Math.abs(nodes[i].y - p.y) <= EPS) return i;
    nodes.push(p);
    return nodes.length - 1;
  };
  const cuts: number[][] = walls.map(() => [0, 1]);
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const c = crossParams(walls[i].a, walls[i].b, walls[j].a, walls[j].b);
      if (!c) continue;
      cuts[i].push(c[0]);
      cuts[j].push(c[1]);
    }
  }
  const edges: Edge[] = [];
  const seen = new Set<string>();
  walls.forEach((w, i) => {
    const ts = [...new Set(cuts[i])].sort((x, y) => x - y);
    for (let k = 0; k + 1 < ts.length; k++) {
      const p = { x: w.a.x + (w.b.x - w.a.x) * ts[k], y: w.a.y + (w.b.y - w.a.y) * ts[k] };
      const q = { x: w.a.x + (w.b.x - w.a.x) * ts[k + 1], y: w.a.y + (w.b.y - w.a.y) * ts[k + 1] };
      const a = nodeAt(p);
      const b = nodeAt(q);
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (a === b || seen.has(key)) continue;
      seen.add(key);
      edges.push({ a, b, half: w.thickness / 2 });
    }
  });

  // hiq fundet e lira derisa të mbeten vetëm cikle
  let alive = edges;
  for (;;) {
    const deg = new Map<number, number>();
    for (const e of alive) {
      deg.set(e.a, (deg.get(e.a) ?? 0) + 1);
      deg.set(e.b, (deg.get(e.b) ?? 0) + 1);
    }
    const next = alive.filter((e) => deg.get(e.a)! > 1 && deg.get(e.b)! > 1);
    if (next.length === alive.length) break;
    alive = next;
  }
  return { nodes, edges: alive };
}

/** Gjen të gjitha faqet e mbyllura të grafit (kundër akrepave), me trashësinë e çdo brinje. */
function faces(walls: Wall[]): { pts: Vec[]; halves: number[] }[] {
  const { nodes, edges } = buildGraph(walls);
  const out = new Map<number, { to: number; ang: number; half: number }[]>();
  for (const e of edges) {
    for (const [u, v] of [
      [e.a, e.b],
      [e.b, e.a],
    ]) {
      const ang = Math.atan2(nodes[v].y - nodes[u].y, nodes[v].x - nodes[u].x);
      if (!out.has(u)) out.set(u, []);
      out.get(u)!.push({ to: v, ang, half: e.half });
    }
  }
  for (const list of out.values()) list.sort((x, y) => x.ang - y.ang);

  const used = new Set<string>();
  const result: { pts: Vec[]; halves: number[] }[] = [];
  for (const [u0, list] of out) {
    for (const first of list) {
      if (used.has(`${u0}>${first.to}`)) continue;
      const pts: Vec[] = [];
      const halves: number[] = [];
      let u = u0;
      let e = first;
      for (let guard = 0; guard < 10000; guard++) {
        used.add(`${u}>${e.to}`);
        pts.push(nodes[u]);
        halves.push(e.half);
        const v = e.to;
        // te nyja v: merr brinjën e parë në drejtim të akrepave nga brinja e kthimit v->u
        const around = out.get(v)!;
        const back = around.findIndex((x) => x.to === u);
        const nxt = around[(back - 1 + around.length) % around.length];
        u = v;
        e = nxt;
        if (u === u0 && e.to === first.to) break;
      }
      if (pts.length >= 3 && signedArea(pts) > 0) result.push({ pts, halves });
    }
  }
  return result;
}

/** Zhvendos konturën nga qendrat e mureve te faqet e brendshme të tyre. */
function insetPolygon(pts: Vec[], halves: number[]): Vec[] {
  const n = pts.length;
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    const l = Math.hypot(q.x - p.x, q.y - p.y);
    const d = { x: (q.x - p.x) / l, y: (q.y - p.y) / l };
    const nrm = { x: -d.y, y: d.x }; // majtas = brenda, sepse kontura shkon kundër akrepave
    return { p: { x: p.x + nrm.x * halves[i], y: p.y + nrm.y * halves[i] }, d };
  });
  const res: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const L1 = lines[(i - 1 + n) % n];
    const L2 = lines[i];
    const den = L1.d.x * L2.d.y - L1.d.y * L2.d.x;
    if (Math.abs(den) < 1e-9) {
      // brinjë në vijë të drejtë (mur i ndarë në dy): mbaj të dyja pikat nëse trashësia ndryshon
      const h1 = { x: pts[i].x - L1.d.y * halves[(i - 1 + n) % n], y: pts[i].y + L1.d.x * halves[(i - 1 + n) % n] };
      const h2 = { x: pts[i].x - L2.d.y * halves[i], y: pts[i].y + L2.d.x * halves[i] };
      res.push(h1);
      if (Math.abs(halves[i] - halves[(i - 1 + n) % n]) > 1e-6) res.push(h2);
      continue;
    }
    const t = ((L2.p.x - L1.p.x) * L2.d.y - (L2.p.y - L1.p.y) * L2.d.x) / den;
    res.push({ x: L1.p.x + L1.d.x * t, y: L1.p.y + L1.d.y * t });
  }
  return res;
}

/** Dhoma e mbyllur me mure që përmban pikën `seed`, ose null nëse pika nuk është brenda një dhome. */
export function findRoom(walls: Wall[], seed: Vec): RoomShape | null {
  let best: { pts: Vec[]; halves: number[]; area: number } | null = null;
  for (const f of faces(walls)) {
    if (!pointInPolygon(seed, f.pts)) continue;
    const area = signedArea(f.pts);
    if (!best || area < best.area) best = { ...f, area };
  }
  if (!best) return null;
  const poly = insetPolygon(best.pts, best.halves);
  const area = signedArea(poly);
  if (!(area > 0)) return null;
  let perimeter = 0;
  for (let i = 0; i < poly.length; i++) {
    const q = poly[(i + 1) % poly.length];
    perimeter += Math.hypot(q.x - poly[i].x, q.y - poly[i].y);
  }
  return { poly, area, perimeter };
}

/** m² me dy shifra, p.sh. 12450000 mm² -> "12.45". */
export function areaText(mm2: number): string {
  return (mm2 / 1e6).toFixed(2);
}

/** Memorie e vogël: muret ndryshojnë rrallë, kurse vizatimi bëhet në çdo lëvizje të miut. */
let cacheKey = '';
let cache = new Map<string, RoomShape | null>();
export function findRoomCached(walls: Wall[], seed: Vec): RoomShape | null {
  const key = walls.map((w) => `${w.a.x},${w.a.y},${w.b.x},${w.b.y},${w.thickness}`).join(';');
  if (key !== cacheKey) {
    cacheKey = key;
    cache = new Map();
  }
  const k = `${seed.x},${seed.y}`;
  if (!cache.has(k)) {
    if (cache.size > 2000) cache.clear();
    cache.set(k, findRoom(walls, seed));
  }
  return cache.get(k)!;
}

/** Largësia e pikës p nga segmenti a-b. */
function segDist(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const k = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - a.x - dx * k, p.y - a.y - dy * k);
}

/** Zona që etiketa e dhomës duhet t'i shmangë (p.sh. harku i derës): qendra dhe rrezja, mm. */
export interface Keepout {
  c: Vec;
  r: number;
}

/** A bie pika `p` brenda një zone që duhet shmangur. */
export const inKeepout = (p: Vec, zones: Keepout[]): boolean => zones.some((z) => Math.hypot(p.x - z.c.x, p.y - z.c.y) < z.r);

/**
 * Pika më e lirë brenda dhomës për emrin dhe m²: sa më larg mureve dhe harqeve të dyerve,
 * që etiketa të mos ngatërrohet me derën.
 */
export function labelSpot(poly: Vec[], zones: Keepout[]): Vec {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const N = 24;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let best: Vec = { x: cx, y: cy };
  let bestScore = -Infinity;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const p = { x: minX + ((maxX - minX) * i) / N, y: minY + ((maxY - minY) * j) / N };
      if (!pointInPolygon(p, poly)) continue;
      let d = Infinity;
      for (let k = 0; k < poly.length; k++) d = Math.min(d, segDist(p, poly[k], poly[(k + 1) % poly.length]));
      for (const z of zones) d = Math.min(d, Math.hypot(p.x - z.c.x, p.y - z.c.y) - z.r);
      // pak përparësi qendrës, që etiketa të mos shkojë në qoshe kur hapësira është e njëjtë
      const score = d - 0.05 * Math.hypot(p.x - cx, p.y - cy);
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
  }
  return { x: Math.round(best.x), y: Math.round(best.y) };
}
