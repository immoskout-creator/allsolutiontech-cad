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
}

export const DEFAULT_STAIR: StairParams = { type: 'straight', width: 1000, steps: 16, turn: 1 };
export const STAIR_LIMITS = { width: [500, 4000], steps: [3, 60] } as const;

/** Format e gatshme për vizatim: vija të thyera (të hapura ose të mbyllura) dhe shigjeta e ngjitjes. */
export interface DrawGeometry {
  paths: { pts: Vec[]; closed: boolean; fill?: boolean }[];
  /** Shigjeta e shkallës: vija e ecjes, me majë te fundi. */
  arrow?: Vec[];
}

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
 * Shkallët në plan. a = fillimi i ngjitjes (mesi i shkallës së parë), b = drejtimi dhe fundi i krahut të parë;
 * te spiralja a = qendra dhe |ab| = rrezja.
 */
export function stairGeometry(a: Vec, b: Vec, s: StairParams): DrawGeometry {
  const w = s.width;
  const steps = Math.max(STAIR_LIMITS.steps[0], Math.min(STAIR_LIMITS.steps[1], Math.round(s.steps)));
  const paths: DrawGeometry['paths'] = [];
  const line = (...pts: Vec[]) => paths.push({ pts, closed: false });
  const box = (...pts: Vec[]) => paths.push({ pts, closed: true });

  if (s.type === 'spiral') {
    const R = Math.max(w / 2, Math.hypot(b.x - a.x, b.y - a.y));
    const r0 = Math.min(R * 0.15, 150);
    const start = Math.atan2(b.y - a.y, b.x - a.x);
    const sweep = (Math.PI * 3) / 2 * s.turn; // 270°
    paths.push({ pts: arcPts(a, R, 0, Math.PI * 2, 72).slice(0, -1), closed: true });
    paths.push({ pts: arcPts(a, r0, 0, Math.PI * 2, 24).slice(0, -1), closed: true });
    for (let i = 0; i <= steps; i++) {
      const ang = start + (sweep * i) / steps;
      line(P(a.x + Math.cos(ang) * r0, a.y + Math.sin(ang) * r0), P(a.x + Math.cos(ang) * R, a.y + Math.sin(ang) * R));
    }
    const rm = (R + r0) / 2;
    return { paths, arrow: arcPts(a, rm, start + sweep / (2 * steps), start + sweep - sweep / (2 * steps), 32) };
  }

  const { L, at } = frame(a, b, s.turn);
  const h = w / 2;
  if (s.type === 'straight') {
    box(at(0, -h), at(L, -h), at(L, h), at(0, h));
    for (let i = 1; i < steps; i++) line(at((L * i) / steps, -h), at((L * i) / steps, h));
    return { paths, arrow: [at(L / (2 * steps), 0), at(L - L / (2 * steps), 0)] };
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
    return { paths, arrow: [at(L / (2 * n1), 0), at(L + h, 0), at(L + h, off), at(L / (2 * n2), off)] };
  }

  // L dhe rrotulluese: krahu i parë a→b, qoshja w × w, krahu i dytë kthehet 90° majtas (turn)
  const L2 = Math.max(w, s.run2 ?? L);
  const winders = s.type === 'winder' ? 3 : 0;
  const nFlights = steps - winders;
  const n1 = Math.max(1, Math.ceil((nFlights * L) / (L + L2)));
  const n2 = Math.max(1, nFlights - n1);
  // krahu 1
  box(at(0, -h), at(L, -h), at(L, h), at(0, h));
  for (let i = 1; i < n1; i++) line(at((L * i) / n1, -h), at((L * i) / n1, h));
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
  }
  return { paths, arrow: [at(L / (2 * n1), 0), at(L + h, 0), at(L + h, c0 + L2 - L2 / (2 * n2))] };
}

/** Gjeometria e çdo vizatimi. */
export function drawingGeometry(e: Pick<Drawing, 'shape' | 'a' | 'b' | 'fill' | 'stair'>): DrawGeometry {
  if (e.shape === 'stair') return stairGeometry(e.a, e.b, e.stair ?? DEFAULT_STAIR);
  return shapeGeometry(e.shape, e.a, e.b, e.fill);
}

/** Të gjitha pikat e vizatimit (për zgjedhjen me kuti dhe "Gjithë planin"). */
export const drawingPoints = (e: Pick<Drawing, 'shape' | 'a' | 'b' | 'fill' | 'stair'>): Vec[] => drawingGeometry(e).paths.flatMap((p) => p.pts);
