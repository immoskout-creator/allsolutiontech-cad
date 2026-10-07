import { emptyDoc, newId, WALL_LAYER, type Doc, type Vec } from './types';

function wall(a: Vec, b: Vec, thickness: number) {
  return { id: newId('w'), kind: 'wall' as const, layer: WALL_LAYER, a, b, thickness };
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
  return doc;
}
