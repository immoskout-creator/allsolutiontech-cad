import { add } from './geometry';
import { clampT, wallLength } from './openings';
import { isWall, type Entity, type Vec, type Wall } from './types';

/**
 * Zhvendos një objekt me `delta`. Dyert/dritaret rrëshqasin përgjatë murit të tyre;
 * nëse lëviz edhe muri, ato e ndjekin vetë, ndaj nuk preken.
 */
export function moveEntity(e: Entity, delta: Vec, moving: Set<string>, walls: Map<string, Wall>): Entity {
  switch (e.kind) {
    case 'wall':
      return { ...e, a: add(e.a, delta), b: add(e.b, delta) };
    case 'symbol':
    case 'room':
      return { ...e, pos: add(e.pos, delta) };
    case 'opening': {
      const w = walls.get(e.wall);
      if (!w || moving.has(w.id)) return e;
      const L = wallLength(w);
      if (L < 1) return e;
      const along = (delta.x * (w.b.x - w.a.x) + delta.y * (w.b.y - w.a.y)) / L;
      return { ...e, t: Math.round(clampT(e.t + along, e.width, L)) };
    }
  }
}

export function wallMap(entities: Entity[]): Map<string, Wall> {
  return new Map(entities.filter(isWall).map((w) => [w.id, w]));
}
