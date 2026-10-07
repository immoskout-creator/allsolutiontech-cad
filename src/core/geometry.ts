import type { Vec } from './types';

export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const same = (a: Vec, b: Vec, eps = 1e-6): boolean => dist(a, b) <= eps;

/** Distanca nga pika p te segmenti a-b. */
export function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y;
  if (l2 === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2));
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}

export function snapToGrid(p: Vec, step: number): Vec {
  return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step };
}

/** Kufizon pikën p në drejtim horizontal ose vertikal nga origjina o. */
export function ortho(o: Vec, p: Vec): Vec {
  return Math.abs(p.x - o.x) >= Math.abs(p.y - o.y) ? { x: p.x, y: o.y } : { x: o.x, y: p.y };
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function rectFrom(a: Vec, b: Vec): Rect {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

export const inRect = (p: Vec, r: Rect): boolean =>
  p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY;

function segmentsIntersect(p1: Vec, p2: Vec, p3: Vec, p4: Vec): boolean {
  const d = (a: Vec, b: Vec, c: Vec) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** True kur segmenti a-b prek drejtkëndëshin r (brenda ose duke e kryqëzuar). */
export function segmentTouchesRect(a: Vec, b: Vec, r: Rect): boolean {
  if (inRect(a, r) || inRect(b, r)) return true;
  const c1 = { x: r.minX, y: r.minY };
  const c2 = { x: r.maxX, y: r.minY };
  const c3 = { x: r.maxX, y: r.maxY };
  const c4 = { x: r.minX, y: r.maxY };
  return (
    segmentsIntersect(a, b, c1, c2) ||
    segmentsIntersect(a, b, c2, c3) ||
    segmentsIntersect(a, b, c3, c4) ||
    segmentsIntersect(a, b, c4, c1)
  );
}

/** Formaton mm si metra, p.sh. 4300 -> "4.30 m". */
export function formatMeters(mm: number): string {
  return `${(mm / 1000).toFixed(2)} m`;
}
