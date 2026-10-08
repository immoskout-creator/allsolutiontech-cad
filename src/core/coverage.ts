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
  /** Zona e verbër poshtë kamerës, mm: sektori nis nga kjo largësi. */
  blind?: number;
  /** Kontura e gatshme (rreze lineare); kur mungon, zona është sektor ose rreth. */
  poly?: Vec[];
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

/** Lartësia standarde e kamerës së tavanit, cm. */
export const CAMERA_HEIGHT_CM = 270;
export const TILT_LIMITS = [0, 90] as const;
/** Pjerrësia standarde poshtë nga horizontalja, gradë. */
export const DEFAULT_TILT = 30;

export interface CameraGround {
  /** Lartësia e montimit, m. */
  height: number;
  tilt: number;
  /** Këndi vertikal i shikimit (16:9), gradë. */
  vfov: number;
  /** Zona e verbër poshtë kamerës, m. */
  blind: number;
  /** Deri ku arrin pamja në dysheme, m (null = deri në distancën e kamerës). */
  ground: number | null;
  /** Distanca që mbulohet vërtet: distanca e kamerës ose fundi i pamjes në dysheme. */
  reach: number;
}

/**
 * Sa sheh kamera në dysheme nga lartësia dhe pjerrësia: poshtë saj mbetet një zonë e verbër,
 * dhe kur pjerrësia është e madhe pamja ndalet në dysheme para distancës së kamerës.
 * Sa më lart montohet, aq më larg arrin pamja (dhe aq më e madhe zona e verbër).
 */
export function cameraGround(e: SymbolEntity): CameraGround | null {
  const s = cameraSettings(e);
  const def = symbolDef(e.symbol);
  if (!s || !def) return null;
  const height = clamp(num(e.height, def.height ?? CAMERA_HEIGHT_CM), 50, 3000) / 100;
  // fisheye në tavan sheh drejt poshtë: pa zonë të verbër
  if (s.fov >= 360) return { height, tilt: 90, vfov: 180, blind: 0, ground: null, reach: s.range };
  const tilt = clamp(num(e.tilt, DEFAULT_TILT), ...TILT_LIMITS);
  const vfov = ((2 * Math.atan(Math.tan((s.fov * Math.PI) / 360) * (9 / 16))) * 180) / Math.PI;
  const rad = (d: number) => (d * Math.PI) / 180;
  const low = tilt + vfov / 2;
  const high = tilt - vfov / 2;
  const blind = low >= 89.9 ? 0 : height / Math.tan(rad(low));
  const ground = high > 0.1 ? height / Math.tan(rad(high)) : null;
  const reach = Math.max(blind, ground === null ? s.range : Math.min(s.range, ground));
  return { height, tilt, vfov, blind: Math.min(blind, reach), ground, reach };
}

export function cameraCoverage(e: SymbolEntity, unit: number): Coverage | null {
  const s = cameraSettings(e);
  const g = cameraGround(e);
  if (!s || !g) return null;
  return {
    apex: symbolCenter(e, unit),
    dir: e.angle + s.pan,
    fov: s.fov,
    range: g.reach * 1000,
    blind: g.blind * 1000,
    label: `${Math.round(s.fov)}° · ${+g.reach.toFixed(1)} m`,
  };
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

export const BEAM_LIMITS = [5, 100] as const;

export interface BeamCalc {
  /** Gjatësia e rrezes deri te reflektori, m. */
  length: number;
  /** Gjerësia e mbulimit në secilën anë të rrezes, m. */
  half: number;
  height: number;
  tooHigh: boolean;
  maxHeight: number;
}

/** Detektori linear me rreze (EN 54-12): mbulon një shirit 2 × 7.5 m të gjerë përgjatë rrezes. */
export function beamCalc(e: SymbolEntity): BeamCalc | null {
  const b = symbolDef(e.symbol)?.beam;
  if (!b) return null;
  const height = clamp(num(e.height, symbolDef(e.symbol)?.height ?? 600), 100, 4000) / 100;
  return { length: clamp(num(e.range, b.range), ...BEAM_LIMITS), half: b.half, height, tooHigh: height > b.maxHeight, maxHeight: b.maxHeight };
}

/** Shiriti që mbulon rrezja: nga detektori, në drejtimin e tij, me gjerësinë në të dy anët. */
export function beamPolygon(apex: Vec, dir: number, b: Pick<BeamCalc, 'length' | 'half'>): Vec[] {
  const a = (dir * Math.PI) / 180;
  const u = { x: Math.cos(a), y: Math.sin(a) };
  const n = { x: -u.y, y: u.x };
  const L = b.length * 1000;
  const H = b.half * 1000;
  return [
    { x: apex.x + n.x * H, y: apex.y + n.y * H },
    { x: apex.x + u.x * L + n.x * H, y: apex.y + u.y * L + n.y * H },
    { x: apex.x + u.x * L - n.x * H, y: apex.y + u.y * L - n.y * H },
    { x: apex.x - n.x * H, y: apex.y - n.y * H },
  ];
}

/** Zona e çdo simboli që ka mbulim: sektori i kamerës, rrethi i detektorit ose i ndriçuesit të emergjencës. */
export function symbolCoverage(e: SymbolEntity, unit: number): Coverage | null {
  const cam = cameraCoverage(e, unit);
  if (cam) return cam;
  const beam = beamCalc(e);
  if (beam) {
    const apex = symbolCenter(e, unit);
    return { apex, dir: e.angle, fov: 0, range: beam.length * 1000, poly: beamPolygon(apex, e.angle, beam), label: `${+beam.length.toFixed(0)} m · ±${beam.half} m` };
  }
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
  if (c.poly) return c.poly;
  const full = c.fov >= 360;
  const start = c.dir - c.fov / 2;
  const n = Math.max(8, Math.ceil((steps * c.fov) / 360));
  const arc: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((start + (c.fov * i) / n) * Math.PI) / 180;
    arc.push({ x: c.apex.x + Math.cos(a) * c.range, y: c.apex.y + Math.sin(a) * c.range });
  }
  if (full) return arc.slice(0, -1);
  // me zonë të verbër: unazë sektori, nga largësia e verbër deri te distanca
  if (c.blind && c.blind > 0) {
    const inner = arc.map((p) => ({ x: c.apex.x + ((p.x - c.apex.x) * c.blind!) / c.range, y: c.apex.y + ((p.y - c.apex.y) * c.blind!) / c.range }));
    return [...arc, ...inner.reverse()];
  }
  return [c.apex, ...arc];
}
