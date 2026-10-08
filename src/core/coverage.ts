import type { SymbolEntity, Vec } from './types';
import { symbolDef } from '../symbols/library';
import { symbolCenter } from '../symbols/place';

/** Zona që sheh kamera: kulmi te objektivi, drejtimi, këndi i shikimit dhe distanca. */
export interface Coverage {
  apex: Vec;
  /** Drejtimi i mesit të zonës, gradë (0 = djathtas, 90 = lart). */
  dir: number;
  /** Këndi i shikimit, gradë (360 = fisheye). */
  fov: number;
  /** Distanca, mm. */
  range: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export const FOV_LIMITS = [5, 360] as const;
export const RANGE_LIMITS = [1, 300] as const;

/** Këndi dhe distanca e kamerës: të vendosurat në plan, ose ato standarde të simbolit. */
export function cameraSettings(e: SymbolEntity): { fov: number; range: number; pan: number } | null {
  const cover = symbolDef(e.symbol)?.cover;
  if (!cover) return null;
  return {
    fov: clamp(num(e.fov, cover.fov), ...FOV_LIMITS),
    range: clamp(num(e.range, cover.range), ...RANGE_LIMITS),
    pan: clamp(num(e.pan, 0), -180, 180),
  };
}

export function cameraCoverage(e: SymbolEntity, unit: number): Coverage | null {
  const s = cameraSettings(e);
  if (!s) return null;
  return { apex: symbolCenter(e, unit), dir: e.angle + s.pan, fov: s.fov, range: s.range * 1000 };
}

/** Kontura e zonës si shumëkëndësh: sektor rrethi, ose rreth i plotë për 360°. */
export function coveragePolygon(c: Coverage, steps = 48): Vec[] {
  const full = c.fov >= 360;
  const start = c.dir - c.fov / 2;
  const n = Math.max(8, Math.ceil((steps * c.fov) / 360));
  const arc: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((start + (c.fov * i) / n) * Math.PI) / 180;
    arc.push({ x: c.apex.x + Math.cos(a) * c.range, y: c.apex.y + Math.sin(a) * c.range });
  }
  return full ? arc.slice(0, -1) : [c.apex, ...arc];
}
