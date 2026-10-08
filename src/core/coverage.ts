import type { SymbolEntity, Vec } from './types';
import { symbolDef } from '../symbols/library';
import { symbolCenter } from '../symbols/place';
import { emergencyCoverage } from './emergency';

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
  /** Rrethi i brendshëm me vijë, mm (ndriçimi 1 lux i rrugës së evakuimit). */
  inner?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Modelet e kamerave: objektivi, këndi horizontal i shikimit dhe distanca (IR) që japin prodhuesit. */
export interface CameraModel {
  id: string;
  /** Emri pa gjuhë, del edhe në listën e materialeve. */
  name: string;
  /** Simboli që e përdor modelin. */
  symbol: string;
  fov: number;
  range: number;
}

export const CAMERA_MODELS: CameraModel[] = [
  { id: 'b2-28', name: 'Bullet 2MP · 2.8 mm', symbol: 'cc-bullet', fov: 105, range: 20 },
  { id: 'b4-4', name: 'Bullet 4MP · 4 mm', symbol: 'cc-bullet', fov: 85, range: 30 },
  { id: 'b4-6', name: 'Bullet 4MP · 6 mm', symbol: 'cc-bullet', fov: 55, range: 40 },
  { id: 'b4-v', name: 'Bullet 4MP · 2.8–12 mm', symbol: 'cc-bullet', fov: 60, range: 50 },
  { id: 'b8-4', name: 'Bullet 8MP · 4 mm', symbol: 'cc-bullet', fov: 100, range: 40 },
  { id: 'd2-28', name: 'Dome 2MP · 2.8 mm', symbol: 'cc-dome', fov: 105, range: 15 },
  { id: 'd4-28', name: 'Dome 4MP · 2.8 mm', symbol: 'cc-dome', fov: 105, range: 30 },
  { id: 'd4-4', name: 'Dome 4MP · 4 mm', symbol: 'cc-dome', fov: 85, range: 30 },
  { id: 'd4-v', name: 'Dome 4MP · 2.8–12 mm', symbol: 'cc-dome', fov: 60, range: 40 },
  { id: 'p4-25x', name: 'PTZ 4MP · 25×', symbol: 'cc-ptz', fov: 60, range: 100 },
  { id: 'p4-45x', name: 'PTZ 4MP · 45×', symbol: 'cc-ptz', fov: 55, range: 200 },
  { id: 'f12', name: 'Fisheye 12MP · 360°', symbol: 'cc-fisheye', fov: 360, range: 10 },
];

export const modelsFor = (symbol: string) => CAMERA_MODELS.filter((m) => m.symbol === symbol);
export const cameraModel = (e: SymbolEntity) => CAMERA_MODELS.find((m) => m.id === e.model && m.symbol === e.symbol);

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

/** Zona e çdo simboli që ka mbulim: sektori i kamerës, rrethi i detektorit ose i ndriçuesit të emergjencës. */
export function symbolCoverage(e: SymbolEntity, unit: number): Coverage | null {
  const cam = cameraCoverage(e, unit);
  if (cam) return cam;
  const det = detectorCalc(e);
  if (!det) return emergencyCoverage(e, unit);
  return {
    apex: symbolCenter(e, unit),
    // teksti mbi detektor, që të mos mbulojë emrin e dhomës
    dir: 90,
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
