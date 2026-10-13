import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawingGeometry, drawingPoints, stairGeometry, STAIR_TYPES } from '../src/core/drawings';
import { emptyDoc, type Drawing } from '../src/core/types';
import { parse, serialize } from '../src/io/files';
import { moveEntity } from '../src/core/move';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≠ ${b}`);

test('Vizatimet: katrori merr brinjën më të gjatë, rrethi ka rrezen a–b', () => {
  const sq = drawingGeometry({ shape: 'square', a: { x: 0, y: 0 }, b: { x: 2000, y: -500 } });
  assert.deepEqual(sq.paths[0].pts[2], { x: 2000, y: -2000 });
  const c = drawingGeometry({ shape: 'circle', a: { x: 0, y: 0 }, b: { x: 3000, y: 4000 } });
  for (const p of c.paths[0].pts) near(Math.hypot(p.x, p.y), 5000);
  const half = drawingGeometry({ shape: 'semicircle', a: { x: 0, y: 0 }, b: { x: 2000, y: 0 }, fill: true });
  assert.equal(half.paths[0].closed, true);
  assert.equal(half.paths[0].fill, true);
  for (const p of half.paths[0].pts) near(Math.hypot(p.x - 1000, p.y), 1000);
});

test('Shkallët: shkalla e drejtë ka aq vija sa shkallë, të gjitha modelet kanë shigjetë', () => {
  const g = stairGeometry({ x: 0, y: 0 }, { x: 4000, y: 0 }, { type: 'straight', width: 1000, steps: 16, turn: 1 });
  assert.equal(g.paths.length, 1 + 15 + 1); // konturi, 15 vija, vija e prerjes
  assert.equal(g.arrow?.length, 2);
  for (const type of STAIR_TYPES) {
    const s = stairGeometry({ x: 0, y: 0 }, { x: 3000, y: 0 }, { type, width: 900, steps: 14, turn: 1 });
    assert.ok(s.paths.length > 3, type);
    assert.ok((s.arrow?.length ?? 0) >= 2, type);
    for (const p of s.paths.flatMap((x) => x.pts)) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), type);
  }
});

test('Shkallët: L kthehet majtas ose djathtas sipas "turn"', () => {
  const ys = (turn: 1 | -1) => drawingPoints({ shape: 'stair', a: { x: 0, y: 0 }, b: { x: 3000, y: 0 }, stair: { type: 'L', width: 1000, steps: 15, turn } }).map((p) => p.y);
  assert.ok(Math.max(...ys(1)) > 2000);
  assert.ok(Math.min(...ys(-1)) < -2000);
});

test('Vizatimet ruhen, lexohen dhe zhvendosen', () => {
  const doc = emptyDoc();
  const d: Drawing = { id: 'v1', kind: 'draw', layer: 'vizatime', shape: 'stair', a: { x: 0, y: 0 }, b: { x: 3000, y: 0 }, stair: { type: 'winder', width: 1000, steps: 16, turn: -1, run2: 2000 } };
  doc.entities.push(d, { id: 'v2', kind: 'draw', layer: 'vizatime', shape: 'rect', a: { x: 0, y: 0 }, b: { x: 1, y: 1 }, fill: true });
  doc.entities.push({ id: 'bad', kind: 'draw', layer: 'vizatime', shape: 'star' as never, a: { x: 0, y: 0 }, b: { x: 1, y: 1 } });
  const back = parse(serialize(doc));
  assert.deepEqual(back.entities.map((e) => e.id), ['v1', 'v2']);
  assert.deepEqual(back.entities[0], d);
  const moved = moveEntity(d, { x: 100, y: 50 }, new Set(['v1']), new Map()) as Drawing;
  assert.deepEqual(moved.a, { x: 100, y: 50 });
  assert.deepEqual(moved.b, { x: 3100, y: 50 });
});
