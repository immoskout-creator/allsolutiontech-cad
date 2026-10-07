import type { Vec, Wall } from '../core/types';
import { dist } from '../core/geometry';

/** Kuotat e mureve dhe madhësitë e tyre në letër (mm), sipas standardit të vizatimit teknik. */
export const DIM_PAPER = {
  /** Largësia e vijës së kuotës nga faqja e murit. */
  offset: 6,
  /** Lartësia e tekstit. */
  text: 2.5,
  /** Gjatësia e vijës së pjerrët në skajet e kuotës. */
  tick: 1.5,
  /** Sa del vija ndihmëse përtej vijës së kuotës. */
  overshoot: 1.5,
};

export interface Dimension {
  /** Fundet e murit (pikat që maten). */
  a: Vec;
  b: Vec;
  /** Fundet e vijës së kuotës. */
  da: Vec;
  db: Vec;
  /** Drejtimi pingul nga muri drejt kuotës (njësi). */
  n: Vec;
  /** Gjatësia në mm. */
  length: number;
}

/** Teksti i kuotës në metra, si në planet e ndërtimit: 4300 -> "4.30". */
export function dimText(mm: number): string {
  return (mm / 1000).toFixed(2);
}

/**
 * Një kuotë për çdo mur, nga ana e jashtme e planit (larg qendrës së tij),
 * në largësi `offset` mm letre nga faqja e murit.
 */
export function wallDimensions(walls: Wall[], scale: number): Dimension[] {
  if (walls.length === 0) return [];
  let cx = 0;
  let cy = 0;
  for (const w of walls) {
    cx += w.a.x + w.b.x;
    cy += w.a.y + w.b.y;
  }
  cx /= walls.length * 2;
  cy /= walls.length * 2;

  const out: Dimension[] = [];
  for (const w of walls) {
    const length = dist(w.a, w.b);
    if (length < 1) continue;
    const dx = (w.b.x - w.a.x) / length;
    const dy = (w.b.y - w.a.y) / length;
    let n = { x: -dy, y: dx };
    const mx = (w.a.x + w.b.x) / 2 - cx;
    const my = (w.a.y + w.b.y) / 2 - cy;
    if (mx * n.x + my * n.y < 0) n = { x: -n.x, y: -n.y };
    const off = w.thickness / 2 + DIM_PAPER.offset * scale;
    out.push({
      a: w.a,
      b: w.b,
      da: { x: w.a.x + n.x * off, y: w.a.y + n.y * off },
      db: { x: w.b.x + n.x * off, y: w.b.y + n.y * off },
      n,
      length,
    });
  }
  return out;
}

/** Një gjatësi "e rrumbullakët" për vizoren e shkallës, që të zërë rreth `targetPx` piksela. */
export function scaleBarLength(pxPerMm: number, targetPx = 120): number {
  const steps = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
  let best = steps[0];
  for (const s of steps) if (s * pxPerMm <= targetPx) best = s;
  return best;
}
