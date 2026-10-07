import { emptyDoc, newId, WALL_LAYER, type Doc, type SymbolEntity, type Vec } from './types';
import { symbolDef } from '../symbols/library';

function wall(a: Vec, b: Vec, thickness: number) {
  return { id: newId('w'), kind: 'wall' as const, layer: WALL_LAYER, a, b, thickness };
}

function sym(symbol: string, x: number, y: number, angle: number): SymbolEntity {
  const def = symbolDef(symbol)!;
  const e: SymbolEntity = { id: newId('s'), kind: 'symbol', layer: def.layer, symbol, pos: { x, y }, angle };
  if (def.height !== undefined) e.height = def.height;
  if (def.power !== undefined) e.power = def.power;
  return e;
}

/** Plan shembull që programi të mos hapet bosh herën e parë. */
export function sampleDoc(): Doc {
  const doc = emptyDoc('Shembull: shtëpi 1 kat');
  const W = 14600;
  const H = 8600;
  const outer: Vec[] = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H },
    { x: 0, y: H },
  ];
  for (let i = 0; i < 4; i++) doc.entities.push(wall(outer[i], outer[(i + 1) % 4], 250));
  doc.entities.push(
    wall({ x: 0, y: 4000 }, { x: W, y: 4000 }, 120),
    wall({ x: 9600, y: 4000 }, { x: 9600, y: H }, 120),
    wall({ x: 5000, y: 0 }, { x: 5000, y: 4000 }, 120),
    wall({ x: 8600, y: 0 }, { x: 8600, y: 4000 }, 120),
    wall({ x: 11600, y: 0 }, { x: 11600, y: 4000 }, 120),
  );
  doc.entities.push(
    sym('nd-tavan', 2500, 2000, 270),
    sym('nd-tavan', 6800, 2000, 270),
    sym('nd-tavan', 10100, 2000, 270),
    sym('nd-tavan', 13100, 2000, 270),
    sym('nd-panel', 4800, 6300, 270),
    sym('nd-tavan', 12100, 6300, 270),
    sym('pr-schuko', 1500, 125, 90),
    sym('pr-schuko', 3500, 125, 90),
    sym('pr-ip44', 6800, 125, 90),
    sym('pr-schuko', 3000, 8475, 270),
    sym('pr-dyfishe', 6000, 8475, 270),
    sym('pr-tv', 7500, 8475, 270),
    sym('pr-schuko', 12000, 8475, 270),
    sym('pr-schuko', 125, 6300, 0),
    sym('cl-thjeshte', 4600, 3940, 270),
    sym('cl-thjeshte', 8200, 3940, 270),
    sym('cl-devijator', 9000, 4060, 90),
    sym('kp-kuadri', 125, 4800, 0),
    sym('pj-boiler', 8540, 2000, 180),
  );
  return doc;
}
