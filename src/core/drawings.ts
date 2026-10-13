import type { Drawing, Vec } from './types';

/**
 * Vizatimet e lira në plan (vija, katror, drejtkëndësh, rreth, gjysmërreth) dhe shkallët.
 * Çdo vizatim kthehet në vija të thjeshta (shumëkëndësha), që vizatohen, zgjidhen dhe eksportohen njësoj.
 */
export type DrawShape = 'line' | 'rect' | 'square' | 'circle' | 'semicircle' | 'stair';
export const DRAW_SHAPES: DrawShape[] = ['line', 'rect', 'square', 'circle', 'semicircle', 'stair'];

/** Modelet e shkallëve: drejt, L me pushim, U me pushim, L me kënd të rrumbullakët (shkallë rrotulluese), spirale. */
export type StairType = 'straight' | 'L' | 'U' | 'winder' | 'spiral';
export const STAIR_TYPES: StairType[] = ['straight', 'L', 'U', 'winder', 'spiral'];

export interface StairParams {
  type: StairType;
  /** Gjerësia e shkallës, mm. */
  width: number;
  /** Numri i shkallëve (ngritjeve). */
  steps: number;
  /** Nga kthehet krahu i dytë: 1 = majtas, -1 = djathtas (te spiralja: kundër ose sipas akrepave). */
  turn: 1 | -1;
  /** Gjatësia e krahut të dytë (L, rrotulluese), mm; pa të = sa i pari. */
  run2?: number;
  /** Lartësia e një shkalle (ngritja), mm; pa të: DEFAULT_RISER. */
  riser?: number;
  /** Thellësia e një shkalle (shkelja), mm; pa të del nga gjatësia e krahut. */
  tread?: number;
  /** Ngjitja nga fundi drejt fillimit (shigjeta "lart" kthehet mbrapsht). */
  reverse?: boolean;
}

export const DEFAULT_RISER = 175;
export const DEFAULT_TREAD = 280;
export const DEFAULT_STAIR: StairParams = { type: 'straight', width: 1000, steps: 16, turn: 1, riser: DEFAULT_RISER, tread: DEFAULT_TREAD };
export const STAIR_LIMITS = { width: [500, 4000], steps: [3, 60], riser: [100, 250], tread: [150, 450] } as const;
/** Shkallët rrotulluese në qoshen e shkallës L me kënd të rrumbullakët. */
export const WINDERS = 3;

/** Format e gatshme për vizatim: vija të thyera (të hapura ose të mbyllura) dhe shigjeta e ngjitjes. */
export interface DrawGeometry {
  paths: { pts: Vec[]; closed: boolean; fill?: boolean }[];
  /** Shigjeta e shkallës: vija e ecjes, me majë te fundi (lart). */
  arrow?: Vec[];
  /** Numrat e shkallëve, nga fillimi i ngjitjes. */
  labels?: { p: Vec; text: string }[];
  /** Shkallët: masat për shënimin pranë shigjetës, p.sh. "16 × 17.5/28". */
  info?: string;
}

const clampSteps = (n: number) => Math.max(STAIR_LIMITS.steps[0], Math.min(STAIR_LIMITS.steps[1], Math.round(n)));

/** Sa shkallë ka çdo krah: [krahu 1, krahu 2] (pa shkallët rrotulluese të qoshes). */
export function stairFlights(s: Pick<StairParams, 'type' | 'steps'>): [number, number] {
  const steps = clampSteps(s.steps);
  if (s.type === 'straight' || s.type === 'spiral') return [steps, 0];
  const nf = s.type === 'winder' ? Math.max(2, steps - WINDERS) : steps;
  const n1 = Math.ceil(nf / 2);
  return [n1, nf - n1];
}

/** Thellësia e shkallës: e ruajtura, ose ajo që del nga gjatësia e krahut të parë. */
export function stairTread(a: Vec, b: Vec, s: StairParams): number {
  if (s.tread) return s.tread;
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  if (s.type === 'spiral') return Math.round(((Math.PI * 3) / 2) * L * 0.6 / clampSteps(s.steps));
  return Math.round(L / stairFlights(s)[0]);
}

/**
 * Shkalla me thellësinë e saj: fundi i krahut të parë b (në drejtimin a→b, ose a→drejt nëse jepet) dhe krahu i dytë
 * dalin nga numri i shkallëve × thellësia. Spiralja nuk ndryshon (rrezja jepet me dorë).
 */
export function fitStair(a: Vec, b: Vec, s: StairParams, toward: Vec = b): { b: Vec; stair: StairParams } {
  if (s.type === 'spiral' || !s.tread) return { b, stair: s };
  const dx = toward.x - a.x;
  const dy = toward.y - a.y;
  const l = Math.hypot(dx, dy);
  const u = l > 1e-9 ? { x: dx / l, y: dy / l } : { x: 1, y: 0 };
  const [n1, n2] = stairFlights(s);
  const L = s.tread * n1;
  const stair = { ...s };
  if (s.type === 'L' || s.type === 'winder') stair.run2 = s.tread * Math.max(1, n2);
  else delete stair.run2;
  return { b: { x: a.x + u.x * L, y: a.y + u.y * L }, stair };
}

/** Rrotullimi i shkallës (drejtimi a→b), gradë 0–359. */
export function stairAngle(a: Vec, b: Vec): number {
  const d = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return Math.round(((d % 360) + 360) % 360);
}

/** Pika b e rrotulluar rreth a te këndi i ri, gradë. */
export function rotateTo(a: Vec, b: Vec, deg: number): Vec {
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const r = (deg * Math.PI) / 180;
  return { x: a.x + Math.cos(r) * L, y: a.y + Math.sin(r) * L };
}

/** Vija e prerjes (si në planet arkitektonike): vijë e pjerrët nga p0 te p1 me thyerjen "Z" në mes. */
function breakLine(p0: Vec, p1: Vec): Vec[] {
  const L = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
  const nx = -(p1.y - p0.y) / L;
  const ny = (p1.x - p0.x) / L;
  const z = L * 0.1;
  const at = (k: number, off: number) => P(p0.x + (p1.x - p0.x) * k + nx * off, p0.y + (p1.y - p0.y) * k + ny * off);
  return [at(0, 0), at(0.42, 0), at(0.47, z), at(0.53, -z), at(0.58, 0), at(1, 0)];
}

const fmt = (mm: number) => String(Math.round(mm) / 10);

const P = (x: number, y: number): Vec => ({ x, y });
const lerp = (a: Vec, b: Vec, k: number): Vec => P(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);

/** Hark rrethi si vijë e thyer, nga këndi a0 te a1 (radian). */
function arcPts(c: Vec, r: number, a0: number, a1: number, n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 24)))): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push(P(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r));
  }
  return out;
}

/** Gjeometria e një vizatimi të lirë nga dy pikat e tij (a = fillimi / qendra, b = fundi / pika në rreth). */
export function shapeGeometry(shape: Exclude<DrawShape, 'stair'>, a: Vec, b: Vec, fill = false): DrawGeometry {
  switch (shape) {
    case 'line':
      return { paths: [{ pts: [a, b], closed: false }] };
    case 'rect':
    case 'square': {
      let w = b.x - a.x;
      let h = b.y - a.y;
      if (shape === 'square') {
        const s = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w || 1) * s;
        h = Math.sign(h || 1) * s;
      }
      return { paths: [{ pts: [a, P(a.x + w, a.y), P(a.x + w, a.y + h), P(a.x, a.y + h)], closed: true, fill }] };
    }
    case 'circle': {
      const r = Math.hypot(b.x - a.x, b.y - a.y);
      return { paths: [{ pts: arcPts(a, r, 0, Math.PI * 2, 72).slice(0, -1), closed: true, fill }] };
    }
    case 'semicircle': {
      // a–b është diametri; harku del majtas nga a te b
      const c = lerp(a, b, 0.5);
      const r = Math.hypot(b.x - a.x, b.y - a.y) / 2;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      return { paths: [{ pts: arcPts(c, r, ang, ang + Math.PI, 36), closed: true, fill }] };
    }
  }
}

/** Kornizë lokale: origjina a, boshti u drejt b, boshti v majtas (ose djathtas kur turn = -1). */
function frame(a: Vec, b: Vec, turn: 1 | -1) {
  const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const u = P((b.x - a.x) / L, (b.y - a.y) / L);
  const v = P(-u.y * turn, u.x * turn);
  const at = (x: number, y: number) => P(a.x + u.x * x + v.x * y, a.y + u.y * x + v.y * y);
  return { L, at };
}

/**
 * Shkallët në plan, si në vizatimet arkitektonike: konturi, vijat e shkallëve, vija e prerjes, shigjeta e ngjitjes
 * dhe numrat e shkallëve. a = fillimi i ngjitjes (mesi i shkallës së parë), b = drejtimi dhe fundi i krahut të parë;
 * te spiralja a = qendra dhe |ab| = rrezja. Me `reverse` ngjitja nis nga fundi.
 */
export function stairGeometry(a: Vec, b: Vec, s: StairParams): DrawGeometry {
  const w = s.width;
  const steps = clampSteps(s.steps);
  const paths: DrawGeometry['paths'] = [];
  const line = (...pts: Vec[]) => paths.push({ pts, closed: false });
  const box = (...pts: Vec[]) => paths.push({ pts, closed: true });
  /** Qendrat e shkallëve sipas rendit të ngjitjes (ku shkruhen numrat). */
  const treads: Vec[] = [];
  const tread = stairTread(a, b, s);
  const info = `${steps} × ${fmt(s.riser ?? DEFAULT_RISER)}/${fmt(tread)}`;
  const done = (arrow: Vec[]): DrawGeometry => {
    const order = s.reverse ? [...treads].reverse() : treads;
    return {
      paths,
      arrow: s.reverse ? [...arrow].reverse() : arrow,
      labels: order.map((p, i) => ({ p, text: String(i + 1) })),
      info,
    };
  };

  if (s.type === 'spiral') {
    const R = Math.max(w / 2, Math.hypot(b.x - a.x, b.y - a.y));
    const r0 = Math.min(R * 0.15, 150);
    const start = Math.atan2(b.y - a.y, b.x - a.x);
    const sweep = (Math.PI * 3) / 2 * s.turn; // 270°
    const polar = (ang: number, r: number) => P(a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r);
    paths.push({ pts: arcPts(a, R, 0, Math.PI * 2, 72).slice(0, -1), closed: true });
    paths.push({ pts: arcPts(a, r0, 0, Math.PI * 2, 24).slice(0, -1), closed: true });
    for (let i = 0; i <= steps; i++) {
      const ang = start + (sweep * i) / steps;
      line(polar(ang, r0), polar(ang, R));
    }
    const rm = (R + r0) / 2;
    for (let i = 0; i < steps; i++) treads.push(polar(start + (sweep * (i + 0.5)) / steps, r0 + (R - r0) * 0.8));
    const cut = start + sweep * 0.6;
    line(...breakLine(polar(cut - 0.08 * s.turn, r0), polar(cut + 0.08 * s.turn, R)));
    return done(arcPts(a, rm, start + sweep / (2 * steps), start + sweep - sweep / (2 * steps), 32));
  }

  const { L, at } = frame(a, b, s.turn);
  const h = w / 2;
  /** Numri del pranë njërës faqe, që të mos e mbulojë shigjeta. */
  const num = h * 0.55;
  const cutAt = (x: number, y0: number) => line(...breakLine(at(x - h * 0.35, y0 - h), at(x + h * 0.35, y0 + h)));
  if (s.type === 'straight') {
    box(at(0, -h), at(L, -h), at(L, h), at(0, h));
    for (let i = 1; i < steps; i++) line(at((L * i) / steps, -h), at((L * i) / steps, h));
    for (let i = 0; i < steps; i++) treads.push(at((L * (i + 0.5)) / steps, -num));
    cutAt(L * 0.62, 0);
    return done([at(L / (2 * steps), 0), at(L - L / (2 * steps), 0)]);
  }

  if (s.type === 'U') {
    // krahu i parë, pushimi në fund (gjerësi 2w + boshllëk), krahu i dytë kthehet paralel
    const gap = 100;
    const n1 = Math.ceil(steps / 2);
    const n2 = steps - n1;
    const off = w + gap; // largësia mes boshteve të dy krahëve
    box(at(0, -h), at(L, -h), at(L, h), at(0, h));
    box(at(0, off - h), at(L, off - h), at(L, off + h), at(0, off + h));
    box(at(L, -h), at(L + w, -h), at(L + w, off + h), at(L, off + h));
    for (let i = 1; i < n1; i++) line(at((L * i) / n1, -h), at((L * i) / n1, h));
    for (let i = 1; i < n2; i++) line(at((L * i) / n2, off - h), at((L * i) / n2, off + h));
    for (let i = 0; i < n1; i++) treads.push(at((L * (i + 0.5)) / n1, -num));
    for (let i = 0; i < n2; i++) treads.push(at(L - (L * (i + 0.5)) / n2, off + num));
    cutAt(L * 0.7, 0);
    return done([at(L / (2 * n1), 0), at(L + h, 0), at(L + h, off), at(L / (2 * n2), off)]);
  }

  // L dhe rrotulluese: krahu i parë a→b, qoshja w × w, krahu i dytë kthehet 90° majtas (turn)
  const L2 = Math.max(w, s.run2 ?? L);
  const winders = s.type === 'winder' ? WINDERS : 0;
  const nFlights = steps - winders;
  const n1 = Math.max(1, Math.ceil((nFlights * L) / (L + L2) - 1e-9));
  const n2 = Math.max(1, nFlights - n1);
  // krahu 1
  box(at(0, -h), at(L, -h), at(L, h), at(0, h));
  for (let i = 1; i < n1; i++) line(at((L * i) / n1, -h), at((L * i) / n1, h));
  for (let i = 0; i < n1; i++) treads.push(at((L * (i + 0.5)) / n1, -num));
  // krahu 2: nga qoshja drejt +v
  const c0 = h; // fillimi i krahut 2 në boshtin v
  box(at(L, c0), at(L + w, c0), at(L + w, c0 + L2), at(L, c0 + L2));
  for (let i = 1; i < n2; i++) line(at(L, c0 + (L2 * i) / n2), at(L + w, c0 + (L2 * i) / n2));
  if (s.type === 'L') {
    // pushim katror
    box(at(L, -h), at(L + w, -h), at(L + w, h), at(L, h));
  } else {
    // qoshja me shkallë rrotulluese: faqja e jashtme e rrumbullakët, shkallët dalin nga qoshja e brendshme
    const inner = at(L, h);
    const outerPts = arcPts(P(0, 0), w, -Math.PI / 2, 0, 18).map((p) => at(L + p.x, h + p.y));
    paths.push({ pts: [at(L, -h), ...outerPts, at(L + w, h)], closed: false });
    line(at(L, -h), at(L, h));
    line(at(L + w, h), at(L, h));
    for (let i = 1; i <= winders; i++) {
      const ang = -Math.PI / 2 + ((Math.PI / 2) * i) / (winders + 1);
      line(inner, at(L + Math.cos(ang) * w, h + Math.sin(ang) * w));
    }
    for (let i = 0; i <= winders; i++) {
      const ang = -Math.PI / 2 + ((Math.PI / 2) * (i + 0.5)) / (winders + 1);
      treads.push(at(L + Math.cos(ang) * w * 0.7, h + Math.sin(ang) * w * 0.7));
    }
    treads.pop(); // qoshja ka winders + 1 pjesë; e fundit është fillimi i krahut të dytë
  }
  for (let i = 0; i < n2; i++) treads.push(at(L + h + num, c0 + (L2 * (i + 0.5)) / n2));
  cutAt(L * 0.7, 0);
  return done([at(L / (2 * n1), 0), at(L + h, 0), at(L + h, c0 + L2 - L2 / (2 * n2))]);
}

/** Gjeometria e çdo vizatimi. */
export function drawingGeometry(e: Pick<Drawing, 'shape' | 'a' | 'b' | 'fill' | 'stair'>): DrawGeometry {
  if (e.shape === 'stair') return stairGeometry(e.a, e.b, e.stair ?? DEFAULT_STAIR);
  return shapeGeometry(e.shape, e.a, e.b, e.fill);
}

/** Të gjitha pikat e vizatimit (për zgjedhjen me kuti dhe "Gjithë planin"). */
export const drawingPoints = (e: Pick<Drawing, 'shape' | 'a' | 'b' | 'fill' | 'stair'>): Vec[] => drawingGeometry(e).paths.flatMap((p) => p.pts);
