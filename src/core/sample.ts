import { CABLE_LAYER, emptyDoc, newId, OPENING_LAYER, ROOM_LAYER, WALL_LAYER, type Cable, type Circuit, type Doc, type Opening, type Room, type SymbolEntity, type Vec, type Wall } from './types';
import { symbolDef, unitMm } from '../symbols/library';
import { symbolCenter } from '../symbols/place';

function wall(a: Vec, b: Vec, thickness: number) {
  return { id: newId('w'), kind: 'wall' as const, layer: WALL_LAYER, a, b, thickness };
}

function opening(w: Wall, type: Opening['type'], t: number, width: number, side: 1 | -1, hinge: 'a' | 'b'): Opening {
  return { id: newId('o'), kind: 'opening', layer: OPENING_LAYER, type, wall: w.id, t, width, side, hinge };
}

function room(name: string, x: number, y: number): Room {
  return { id: newId('r'), kind: 'room', layer: ROOM_LAYER, name, pos: { x, y } };
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
  const [south, east, north, west] = outer.map((p, i) => wall(p, outer[(i + 1) % 4], 250));
  const middle = wall({ x: 0, y: 4000 }, { x: W, y: 4000 }, 120);
  const hall = wall({ x: 9600, y: 4000 }, { x: 9600, y: H }, 120);
  doc.entities.push(
    south,
    east,
    north,
    west,
    middle,
    hall,
    wall({ x: 5000, y: 0 }, { x: 5000, y: 4000 }, 120),
    wall({ x: 8600, y: 0 }, { x: 8600, y: 4000 }, 120),
    wall({ x: 11600, y: 0 }, { x: 11600, y: 4000 }, 120),
  );
  doc.entities.push(
    // hyrja nga veriu dhe dyert e brendshme
    opening(north, 'door', W - 13300, 1000, 1, 'b'),
    opening(middle, 'door', 4000, 800, -1, 'b'),
    opening(middle, 'door', 7400, 700, -1, 'a'),
    opening(middle, 'door', 10600, 800, -1, 'a'),
    opening(middle, 'door', 13600, 800, -1, 'a'),
    opening(hall, 'door', 3200, 900, -1, 'a'),
    // dritaret
    opening(south, 'window', 2500, 1500, 1, 'a'),
    opening(south, 'window', 7800, 600, 1, 'a'),
    opening(south, 'window', 10100, 1200, 1, 'a'),
    opening(south, 'window', 13100, 1200, 1, 'a'),
    opening(north, 'window', W - 4500, 1800, 1, 'a'),
    opening(north, 'window', W - 1500, 1500, 1, 'a'),
    opening(west, 'window', H - 2000, 1200, 1, 'a'),
    opening(east, 'window', 6300, 1200, 1, 'a'),
  );
  doc.entities.push(
    room('Dhomë gjumi', 2500, 1300),
    room('Banjo', 6800, 1300),
    room('Dhomë fëmijësh', 10100, 1300),
    room('Studio', 13100, 1300),
    room('Sallon + kuzhinë', 3200, 5300),
    room('Hyrje', 12100, 5300),
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
  addCircuits(doc);
  return doc;
}

/** Katër qarqe me kabllot e tyre, të lidhura nga kuadri pikë pas pike. */
function addCircuits(doc: Doc): void {
  const circuits: Circuit[] = [
    { id: newId('q'), name: 'Q1', label: 'Ndriçim', kind: 'lighting', phases: 1, color: '#D97706' },
    { id: newId('q'), name: 'Q2', label: 'Priza dhomat', kind: 'sockets', phases: 1, color: '#2563EB' },
    { id: newId('q'), name: 'Q3', label: 'Priza sallon', kind: 'sockets', phases: 1, color: '#16A34A' },
    { id: newId('q'), name: 'Q4', label: 'Boiler', kind: 'appliance', phases: 1, color: '#DC2626' },
  ];
  doc.circuits = circuits;
  const syms = doc.entities.filter((e): e is SymbolEntity => e.kind === 'symbol');
  const unit = unitMm(doc.scale);
  const center = (e: SymbolEntity) => {
    const c = symbolCenter(e, unit);
    return { x: Math.round(c.x), y: Math.round(c.y) };
  };
  const panel = syms.find((e) => e.symbol === 'kp-kuadri')!;
  const at = (symbol: string, x: number, y: number) => syms.find((e) => e.symbol === symbol && e.pos.x === x && e.pos.y === y)!;
  const groups: [Circuit, SymbolEntity[]][] = [
    [circuits[0], [at('cl-thjeshte', 4600, 3940), at('nd-tavan', 2500, 2000), at('nd-tavan', 6800, 2000), at('cl-thjeshte', 8200, 3940), at('nd-tavan', 10100, 2000), at('nd-tavan', 13100, 2000), at('nd-tavan', 12100, 6300), at('cl-devijator', 9000, 4060), at('nd-panel', 4800, 6300)]],
    [circuits[1], [at('pr-schuko', 1500, 125), at('pr-schuko', 3500, 125), at('pr-ip44', 6800, 125)]],
    [circuits[2], [at('pr-schuko', 125, 6300), at('pr-schuko', 3000, 8475), at('pr-dyfishe', 6000, 8475), at('pr-tv', 7500, 8475), at('pr-schuko', 12000, 8475)]],
    [circuits[3], [at('pj-boiler', 8540, 2000)]],
  ];
  for (const [c, list] of groups) {
    let from = center(panel);
    for (const e of list) {
      e.circuit = c.id;
      const to = center(e);
      // vija në kënd të drejtë: fillimisht horizontalisht, pastaj vertikalisht
      const points = from.x === to.x || from.y === to.y ? [from, to] : [from, { x: to.x, y: from.y }, to];
      const cable: Cable = { id: newId('k'), kind: 'cable', layer: CABLE_LAYER, points, circuit: c.id };
      doc.entities.push(cable);
      from = to;
    }
  }
}
