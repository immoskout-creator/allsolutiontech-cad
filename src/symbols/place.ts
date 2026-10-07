import type { SymbolEntity, Vec, Wall } from '../core/types';
import { distToSegment } from '../core/geometry';
import { HIT_RADIUS_UNITS, localCenter, symbolDef, UNIT_MM } from './library';

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Këndi i rrotullimit në ekran (Y poshtë) që vendos +y lokale drejt dhomës. */
export function screenRotation(angleDeg: number): number {
  const a = rad(angleDeg);
  return Math.atan2(-Math.cos(a), -Math.sin(a));
}

/** Kthen një pikë në njësi lokale të simbolit në koordinata bote (mm). */
export function localToWorld(pos: Vec, angleDeg: number, local: Vec): Vec {
  const a = rad(angleDeg);
  const n = { x: Math.cos(a), y: Math.sin(a) };
  const phi = screenRotation(angleDeg);
  const xAxis = { x: Math.cos(phi), y: -Math.sin(phi) };
  return {
    x: pos.x + (xAxis.x * local.x + n.x * local.y) * UNIT_MM,
    y: pos.y + (xAxis.y * local.x + n.y * local.y) * UNIT_MM,
  };
}

export function symbolCenter(e: SymbolEntity): Vec {
  const def = symbolDef(e.symbol);
  return def ? localToWorld(e.pos, e.angle, localCenter(def)) : e.pos;
}

export const SYMBOL_HIT_MM = HIT_RADIUS_UNITS * UNIT_MM;

/** Normalizon këndin në [0, 360). */
export function normAngle(deg: number): number {
  return ((Math.round(deg) % 360) + 360) % 360;
}

/**
 * Ngjit një simbol muri te faqja më e afërt e murit.
 * Kthen pozicionin në faqen e murit dhe këndin drejt anës ku është kursori.
 */
export function attachToWall(raw: Vec, walls: Wall[], maxGapMm: number): { pos: Vec; angle: number; wallId: string } | null {
  let best: { pos: Vec; angle: number; wallId: string; d: number } | null = null;
  for (const w of walls) {
    const dx = w.b.x - w.a.x;
    const dy = w.b.y - w.a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) continue;
    const t = ((raw.x - w.a.x) * dx + (raw.y - w.a.y) * dy) / l2;
    if (t < 0 || t > 1) continue;
    const d = distToSegment(raw, w.a, w.b);
    if (d > w.thickness / 2 + maxGapMm) continue;
    if (best && d >= best.d) continue;
    const l = Math.sqrt(l2);
    let n = { x: -dy / l, y: dx / l };
    const side = (raw.x - w.a.x) * n.x + (raw.y - w.a.y) * n.y;
    if (side < 0) n = { x: -n.x, y: -n.y };
    const proj = { x: w.a.x + dx * t, y: w.a.y + dy * t };
    const pos = { x: proj.x + (n.x * w.thickness) / 2, y: proj.y + (n.y * w.thickness) / 2 };
    const angle = normAngle((Math.atan2(n.y, n.x) * 180) / Math.PI);
    best = { pos, angle, wallId: w.id, d };
  }
  return best ? { pos: best.pos, angle: best.angle, wallId: best.wallId } : null;
}
