import { beamCalc, beamPolygon, detectorCalc } from './coverage';
import { distToSegment, dist } from './geometry';
import { findRoomCached, pointInPolygon } from './rooms';
import { isRoom, isSymbol, isWall, type Doc, type SymbolEntity, type Vec } from './types';

/**
 * Kontrolli i vendosjes së detektorëve sipas rregullave të projektimit (EN 54-14 / BS 5839-1):
 * - çdo pikë e tavanit të dhomës duhet të jetë brenda rrezes së një detektori të asaj dhome;
 * - detektori jo më afër se 0.5 m nga muri;
 * - largësia mes dy detektorëve fqinjë në të njëjtën dhomë jo më shumë se rrezja × √2
 *   (rrjetë katrore: 10.6 m për tymin, 7.5 m për nxehtësinë).
 */
export const WALL_MIN_M = 0.5;
/** Hapi i rrjetës me të cilën kontrollohet mbulimi i dhomës, mm. */
export const GRID_MM = 250;

export interface DetectorCheck {
  /** Largësia nga faqja e murit më të afërt, m. */
  wall: number | null;
  /** Largësia nga detektori më i afërt në të njëjtën dhomë, m. */
  neighbour: number | null;
  /** Largësia maksimale e lejuar mes detektorëve, m. */
  maxSpacing: number;
  issues: ('wall' | 'spacing')[];
}

export interface RoomCoverage {
  id: string;
  name: string;
  /** Pjesa e mbuluar e dyshemesë, 0–1. */
  covered: number;
  /** Qendrat e katrorëve pa mbulim (për t'i treguar në plan). */
  gaps: Vec[];
}

export interface FireCheck {
  detectors: Map<string, DetectorCheck>;
  rooms: RoomCoverage[];
}

/** Largësia e pikës nga faqja e murit (vija e mesit minus gjysma e trashësisë), mm. */
function wallFaceDist(p: Vec, a: Vec, b: Vec, thickness: number): number {
  return Math.max(0, distToSegment(p, a, b) - thickness / 2);
}

let last: { key: string; result: FireCheck } | null = null;

/** I njëjti kontroll kur muret, dhomat dhe detektorët nuk kanë ndryshuar (vizatimi e kërkon në çdo kornizë). */
export function checkFireCached(doc: Doc): FireCheck {
  const key = JSON.stringify(doc.entities.filter((e) => isWall(e) || isRoom(e) || (isSymbol(e) && (detectorCalc(e) || beamCalc(e)))));
  if (last?.key !== key) last = { key, result: checkFire(doc) };
  return last.result;
}

export function checkFire(doc: Doc): FireCheck {
  const walls = doc.entities.filter(isWall);
  const dets = doc.entities.filter(isSymbol).flatMap((e) => {
    const c = detectorCalc(e);
    return c ? [{ e, c }] : [];
  });
  const shapes = doc.entities.filter(isRoom).flatMap((r) => {
    const shape = findRoomCached(walls, r.pos);
    return shape ? [{ r, shape }] : [];
  });
  const roomOf = (e: SymbolEntity) => shapes.find((s) => pointInPolygon(e.pos, s.shape.poly))?.r.id;
  // detektori linear është te muri: dhoma e tij gjendet pak më brenda, në drejtimin e rrezes
  const beams = doc.entities.filter(isSymbol).flatMap((e) => {
    const b = beamCalc(e);
    if (!b) return [];
    const a = (e.angle * Math.PI) / 180;
    const probe = { x: e.pos.x + Math.cos(a) * 150, y: e.pos.y + Math.sin(a) * 150 };
    const room = shapes.find((s) => pointInPolygon(probe, s.shape.poly))?.r.id;
    return [{ room, poly: beamPolygon(e.pos, e.angle, b) }];
  });

  const detectors = new Map<string, DetectorCheck>();
  for (const { e, c } of dets) {
    const wall = walls.length ? Math.min(...walls.map((w) => wallFaceDist(e.pos, w.a, w.b, w.thickness))) / 1000 : null;
    const room = roomOf(e);
    const others = dets.filter((o) => o.e.id !== e.id && room !== undefined && roomOf(o.e) === room);
    const neighbour = others.length ? Math.min(...others.map((o) => dist(o.e.pos, e.pos))) / 1000 : null;
    const maxSpacing = c.radius * Math.SQRT2;
    const issues: DetectorCheck['issues'] = [];
    if (wall !== null && wall < WALL_MIN_M) issues.push('wall');
    if (neighbour !== null && neighbour > maxSpacing + 1e-9) issues.push('spacing');
    detectors.set(e.id, { wall, neighbour, maxSpacing, issues });
  }

  // muret e plota ndajnë tymin: një dhomë mbulohet vetëm nga detektorët brenda saj
  const rooms: RoomCoverage[] = shapes.map(({ r, shape }) => {
    const inside = dets.filter(({ e }) => roomOf(e) === r.id);
    const strips = beams.filter((b) => b.room === r.id);
    const xs = shape.poly.map((p) => p.x);
    const ys = shape.poly.map((p) => p.y);
    const gaps: Vec[] = [];
    let total = 0;
    for (let x = Math.min(...xs) + GRID_MM / 2; x < Math.max(...xs); x += GRID_MM) {
      for (let y = Math.min(...ys) + GRID_MM / 2; y < Math.max(...ys); y += GRID_MM) {
        const p = { x, y };
        if (!pointInPolygon(p, shape.poly)) continue;
        total++;
        if (!inside.some(({ e, c }) => dist(e.pos, p) <= c.radius * 1000) && !strips.some((b) => pointInPolygon(p, b.poly))) gaps.push(p);
      }
    }
    return { id: r.id, name: r.name, covered: total ? 1 - gaps.length / total : 1, gaps };
  });
  return { detectors, rooms };
}
