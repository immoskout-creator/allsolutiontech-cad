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
  /** Teksti mbi zonë, p.sh. "85° · 8 m" ose "140° · R 7.4 m". */
  label: string;
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
  return { apex: symbolCenter(e, unit), dir: e.angle + s.pan, fov: s.fov, range: s.range * 1000, label: `${Math.round(s.fov)}° · ${+s.range.toFixed(1)} m` };
}

/** Lartësia standarde e tavanit për detektorët, cm. */
export const DETECTOR_HEIGHT_CM = 270;
export const DETECTOR_ANGLE_LIMITS = [30, 170] as const;

export interface DetectorCalc {
  /** Lartësia e montimit, m. */
  height: number;
  /** Këndi i sensorit, gradë. */
  angle: number;
  /** Rrezja e mbulimit në dysheme, m: h · tan(këndi / 2), jo më shumë se kufiri i detektorit. */
  radius: number;
  /** Sipërfaqja e mbuluar, m². */
  area: number;
  /** Lartësia kalon maksimumin e detektorit. */
  tooHigh: boolean;
  maxHeight: number;
}

/**
 * Detektori i tymit ose i nxehtësisë: rrezja në dysheme del nga lartësia e montimit dhe këndi i sensorit.
 * Këndet standarde japin në 2.7 m rrezet e zakonshme të projektimit (7.5 m tym, 5.3 m nxehtësi),
 * dhe rrezja nuk kalon kurrë atë kufi.
 */
export function detectorCalc(e: SymbolEntity): DetectorCalc | null {
  const d = symbolDef(e.symbol)?.detector;
  if (!d) return null;
  const height = clamp(num(e.height, DETECTOR_HEIGHT_CM), 100, 2000) / 100;
  const angle = clamp(num(e.fov, d.angle), ...DETECTOR_ANGLE_LIMITS);
  const radius = Math.min(d.maxRadius, height * Math.tan((angle * Math.PI) / 360));
  return { height, angle, radius, area: Math.PI * radius * radius, tooHigh: height > d.maxHeight, maxHeight: d.maxHeight };
}

/** Zona e çdo simboli që ka mbulim: sektori i kamerës ose rrethi i detektorit. */
export function symbolCoverage(e: SymbolEntity, unit: number): Coverage | null {
  const cam = cameraCoverage(e, unit);
  if (cam) return cam;
  const det = detectorCalc(e);
  if (!det) return null;
  return {
    apex: symbolCenter(e, unit),
    dir: 270,
    fov: 360,
    range: det.radius * 1000,
    label: `${Math.round(det.angle)}° · R ${+det.radius.toFixed(1)} m`,
  };
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
