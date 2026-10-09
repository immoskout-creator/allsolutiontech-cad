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

/** Teknologjia e kamerës, nga më e vjetra te më e reja. */
export type CameraTech = 'CVBS' | 'AHD' | 'TVI' | 'CVI' | 'IP' | 'IP AI';
export const CAMERA_TECHS: CameraTech[] = ['CVBS', 'AHD', 'TVI', 'CVI', 'IP', 'IP AI'];

/** Modelet e kamerave: teknologjia, megapikselët, objektivi, këndi horizontal i shikimit dhe distanca (IR) që japin prodhuesit. */
export interface CameraModel {
  id: string;
  /** Emri pa gjuhë, del edhe në listën e materialeve. */
  name: string;
  /** Simboli që e përdor modelin. */
  symbol: string;
  fov: number;
  range: number;
  tech: CameraTech;
  /** Rezolucioni, megapiksel (CVBS ≈ 0.4). */
  mp: number;
}

/** Objektivat e zakonshëm dhe këndi horizontal që japin (sensor 1/2.7"–1/2.8"). */
const LENS_FOV: Record<string, number> = { '2.8': 105, '3.6': 88, '4': 85, '6': 55, '8': 42, '12': 28, '2.8–12': 100, '2.7–13.5': 100, '5–50': 55 };

/** Kamera e zakonshme: emri ndërtohet nga lloji, teknologjia, MP dhe objektivi. */
function cam(id: string, symbol: string, kind: string, tech: CameraTech, mp: number, lens: string, range: number, fov = LENS_FOV[lens]): CameraModel {
  const res = tech === 'CVBS' ? '960H' : `${mp}MP`;
  return { id, name: `${kind} ${tech} ${res} · ${lens} mm`, symbol, fov, range, tech, mp };
}

export const CAMERA_MODELS: CameraModel[] = [
  // modelet e para (id-të ruhen, që projektet e vjetra të njohin modelin)
  cam('b2-28', 'cc-bullet', 'Bullet', 'IP', 2, '2.8', 20),
  cam('b4-4', 'cc-bullet', 'Bullet', 'IP', 4, '4', 30),
  cam('b4-6', 'cc-bullet', 'Bullet', 'IP', 4, '6', 40),
  cam('b4-v', 'cc-bullet', 'Bullet', 'IP', 4, '2.8–12', 50, 60),
  cam('b8-4', 'cc-bullet', 'Bullet', 'IP', 8, '4', 40, 100),
  cam('d2-28', 'cc-dome', 'Dome', 'IP', 2, '2.8', 15),
  cam('d4-28', 'cc-dome', 'Dome', 'IP', 4, '2.8', 30),
  cam('d4-4', 'cc-dome', 'Dome', 'IP', 4, '4', 30),
  cam('d4-v', 'cc-dome', 'Dome', 'IP', 4, '2.8–12', 40, 60),
  { id: 'p4-25x', name: 'PTZ IP 4MP · 25×', symbol: 'cc-ptz', fov: 60, range: 100, tech: 'IP', mp: 4 },
  { id: 'p4-45x', name: 'PTZ IP 4MP · 45×', symbol: 'cc-ptz', fov: 55, range: 200, tech: 'IP', mp: 4 },
  { id: 'f12', name: 'Fisheye IP 12MP · 360°', symbol: 'cc-fisheye', fov: 360, range: 10, tech: 'IP', mp: 12 },
  // bullet IP: 2–12 MP dhe kamerat e reja me AI / ngjyra natën
  cam('b5-28', 'cc-bullet', 'Bullet', 'IP', 5, '2.8', 30),
  cam('b6-28', 'cc-bullet', 'Bullet', 'IP', 6, '2.8', 30),
  cam('b8-28', 'cc-bullet', 'Bullet', 'IP', 8, '2.8', 40, 110),
  cam('b8-v', 'cc-bullet', 'Bullet', 'IP', 8, '2.7–13.5', 60, 105),
  cam('b12-4', 'cc-bullet', 'Bullet', 'IP', 12, '4', 50, 95),
  cam('bai4-28', 'cc-bullet', 'Bullet ColorVu/Full Color', 'IP AI', 4, '2.8', 30),
  cam('bai8-4', 'cc-bullet', 'Bullet AcuSense', 'IP AI', 8, '4', 40, 100),
  // dome IP
  cam('d5-28', 'cc-dome', 'Dome', 'IP', 5, '2.8', 30),
  cam('d6-28', 'cc-dome', 'Dome', 'IP', 6, '2.8', 30),
  cam('d8-28', 'cc-dome', 'Dome', 'IP', 8, '2.8', 30, 110),
  cam('d8-v', 'cc-dome', 'Dome', 'IP', 8, '2.7–13.5', 40, 105),
  cam('dai4-28', 'cc-dome', 'Dome AcuSense', 'IP AI', 4, '2.8', 30),
  // PTZ dhe fisheye
  { id: 'p2-25x', name: 'PTZ IP 2MP · 25×', symbol: 'cc-ptz', fov: 60, range: 100, tech: 'IP', mp: 2 },
  { id: 'p8-32x', name: 'PTZ IP 8MP · 32×', symbol: 'cc-ptz', fov: 58, range: 200, tech: 'IP', mp: 8 },
  { id: 'pai4-45x', name: 'PTZ IP AI 4MP · 45× · laser 500 m', symbol: 'cc-ptz', fov: 55, range: 300, tech: 'IP AI', mp: 4 },
  { id: 'pa2-18x', name: 'PTZ AHD 2MP · 18×', symbol: 'cc-ptz', fov: 60, range: 100, tech: 'AHD', mp: 2 },
  { id: 'f5', name: 'Fisheye IP 5MP · 360°', symbol: 'cc-fisheye', fov: 360, range: 8, tech: 'IP', mp: 5 },
  { id: 'f6', name: 'Fisheye IP 6MP · 360°', symbol: 'cc-fisheye', fov: 360, range: 10, tech: 'IP', mp: 6 },
  // turret / eyeball
  cam('t2-28', 'cc-turret', 'Turret', 'IP', 2, '2.8', 30),
  cam('t4-28', 'cc-turret', 'Turret', 'IP', 4, '2.8', 30),
  cam('t5-28', 'cc-turret', 'Turret', 'IP', 5, '2.8', 30),
  cam('t8-28', 'cc-turret', 'Turret', 'IP', 8, '2.8', 30, 110),
  cam('tai4-28', 'cc-turret', 'Turret ColorVu/Full Color', 'IP AI', 4, '2.8', 30),
  cam('ta2-28', 'cc-turret', 'Turret', 'AHD', 2, '2.8', 20),
  cam('ta5-28', 'cc-turret', 'Turret', 'TVI', 5, '2.8', 25),
  // box, panoramike, videocitofon
  cam('x4-v', 'cc-box', 'Box', 'IP', 4, '5–50', 120),
  cam('x8-v', 'cc-box', 'Box', 'IP', 8, '5–50', 120),
  { id: 'pn4', name: 'Panoramike IP 2×4MP · 180°', symbol: 'cc-pano', fov: 180, range: 30, tech: 'IP', mp: 8 },
  { id: 'pn8', name: 'Panoramike IP 2×8MP · 180°', symbol: 'cc-pano', fov: 180, range: 40, tech: 'IP AI', mp: 16 },
  { id: 'vi2', name: 'Videocitofon IP 2MP', symbol: 'cc-intercom', fov: 110, range: 5, tech: 'IP', mp: 2 },
  { id: 'vi-ahd', name: 'Videocitofon AHD 2MP', symbol: 'cc-intercom', fov: 100, range: 4, tech: 'AHD', mp: 2 },
  // analoge: nga CVBS (960H) te AHD / TVI / CVI 1–8 MP
  cam('ab-cvbs', 'cc-bullet-ahd', 'Bullet', 'CVBS', 0.4, '3.6', 15),
  cam('ab1-36', 'cc-bullet-ahd', 'Bullet', 'AHD', 1, '3.6', 20),
  cam('ab2-36', 'cc-bullet-ahd', 'Bullet', 'AHD', 2, '3.6', 20),
  cam('ab2-28', 'cc-bullet-ahd', 'Bullet', 'AHD', 2, '2.8', 20),
  cam('ab4-28', 'cc-bullet-ahd', 'Bullet', 'AHD', 4, '2.8', 25),
  cam('ab5-28', 'cc-bullet-ahd', 'Bullet', 'AHD', 5, '2.8', 25),
  cam('tb2-36', 'cc-bullet-ahd', 'Bullet', 'TVI', 2, '3.6', 20),
  cam('tb5-28', 'cc-bullet-ahd', 'Bullet', 'TVI', 5, '2.8', 30),
  cam('tb8-28', 'cc-bullet-ahd', 'Bullet', 'TVI', 8, '2.8', 40, 110),
  cam('cb2-36', 'cc-bullet-ahd', 'Bullet', 'CVI', 2, '3.6', 30),
  cam('cb5-28', 'cc-bullet-ahd', 'Bullet', 'CVI', 5, '2.8', 30),
  cam('cb8-v', 'cc-bullet-ahd', 'Bullet', 'CVI', 8, '2.7–13.5', 60, 105),
  cam('ad-cvbs', 'cc-dome-ahd', 'Dome', 'CVBS', 0.4, '3.6', 10),
  cam('ad1-36', 'cc-dome-ahd', 'Dome', 'AHD', 1, '3.6', 15),
  cam('ad2-28', 'cc-dome-ahd', 'Dome', 'AHD', 2, '2.8', 20),
  cam('ad5-28', 'cc-dome-ahd', 'Dome', 'AHD', 5, '2.8', 20),
  cam('td2-28', 'cc-dome-ahd', 'Dome', 'TVI', 2, '2.8', 20),
  cam('td5-28', 'cc-dome-ahd', 'Dome', 'TVI', 5, '2.8', 20),
  cam('td8-28', 'cc-dome-ahd', 'Dome', 'TVI', 8, '2.8', 30, 110),
  cam('cd2-28', 'cc-dome-ahd', 'Dome', 'CVI', 2, '2.8', 20),
  cam('cd5-28', 'cc-dome-ahd', 'Dome', 'CVI', 5, '2.8', 20),
];

/** Regjistruesit: NVR (IP), DVR (analog) dhe XVR (hibrid), me kanalet dhe rezolucionin. */
export interface RecorderModel {
  id: string;
  name: string;
  symbol: string;
  tech: 'IP' | 'Analog' | 'Hybrid';
  channels: number;
}

const rec = (id: string, symbol: string, name: string, tech: RecorderModel['tech'], channels: number): RecorderModel => ({ id, name, symbol, tech, channels });

export const RECORDER_MODELS: RecorderModel[] = [
  rec('nvr4p', 'cc-nvr', 'NVR 4 kanale · 4 PoE · 8MP (4K) · 1 HDD', 'IP', 4),
  rec('nvr8p', 'cc-nvr', 'NVR 8 kanale · 8 PoE · 8MP (4K) · 1 HDD', 'IP', 8),
  rec('nvr16p', 'cc-nvr', 'NVR 16 kanale · 16 PoE · 12MP · 2 HDD', 'IP', 16),
  rec('nvr32', 'cc-nvr', 'NVR 32 kanale · 12MP · 4 HDD', 'IP', 32),
  rec('nvr64', 'cc-nvr', 'NVR 64 kanale · 32MP · 8 HDD RAID', 'IP', 64),
  rec('nvr16ai', 'cc-nvr', 'NVR AI 16 kanale · njohje fytyre / targa · 4 HDD', 'IP', 16),
  rec('nvr128', 'cc-nvr', 'NVR 128 kanale · 16 HDD RAID (projekte të mëdha)', 'IP', 128),
  rec('dvr4', 'cc-dvr', 'DVR 4 kanale · 1080p (AHD/TVI/CVI/CVBS)', 'Analog', 4),
  rec('dvr8', 'cc-dvr', 'DVR 8 kanale · 1080p (AHD/TVI/CVI/CVBS)', 'Analog', 8),
  rec('dvr16', 'cc-dvr', 'DVR 16 kanale · 1080p · 2 HDD', 'Analog', 16),
  rec('dvr960', 'cc-dvr', 'DVR 960H 8 kanale (CVBS, i vjetër)', 'Analog', 8),
  rec('xvr4', 'cc-dvr', 'XVR 4 kanale · 5MP · + 2 IP', 'Hybrid', 6),
  rec('xvr8', 'cc-dvr', 'XVR 8 kanale · 5MP · + 4 IP', 'Hybrid', 12),
  rec('xvr16', 'cc-dvr', 'XVR 16 kanale · 8MP (4K) · + 8 IP · 2 HDD', 'Hybrid', 24),
  rec('xvr32', 'cc-dvr', 'XVR 32 kanale · 5MP · + 16 IP · 4 HDD', 'Hybrid', 48),
];

export const recordersFor = (symbol: string) => RECORDER_MODELS.filter((m) => m.symbol === symbol);
export const recorderModel = (e: SymbolEntity) => RECORDER_MODELS.find((m) => m.id === e.model && m.symbol === e.symbol);

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
