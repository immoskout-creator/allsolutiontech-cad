import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distToSegment, ortho, segmentTouchesRect, snapToGrid, formatMeters } from '../src/core/geometry';
import { Store } from '../src/core/store';
import { emptyDoc, newId, WALL_LAYER } from '../src/core/types';
import { parse, serialize, fileName } from '../src/io/files';
import { Viewport } from '../src/view/viewport';

test('kapja në rrjetë rrumbullakos te hapi më i afërt', () => {
  assert.deepEqual(snapToGrid({ x: 149, y: -51 }, 100), { x: 100, y: -100 });
});

test('orto ndjek boshtin dominues', () => {
  assert.deepEqual(ortho({ x: 0, y: 0 }, { x: 500, y: 40 }), { x: 500, y: 0 });
  assert.deepEqual(ortho({ x: 0, y: 0 }, { x: 30, y: -400 }), { x: 0, y: -400 });
});

test('distanca te segmenti', () => {
  assert.equal(distToSegment({ x: 50, y: 30 }, { x: 0, y: 0 }, { x: 100, y: 0 }), 30);
  assert.equal(distToSegment({ x: 130, y: 40 }, { x: 0, y: 0 }, { x: 100, y: 0 }), 50);
});

test('segmenti që kryqëzon drejtkëndëshin', () => {
  const r = { minX: 10, minY: 10, maxX: 20, maxY: 20 };
  assert.equal(segmentTouchesRect({ x: 0, y: 15 }, { x: 30, y: 15 }, r), true);
  assert.equal(segmentTouchesRect({ x: 0, y: 0 }, { x: 30, y: 0 }, r), false);
});

test('metrat formatohen me dy shifra', () => {
  assert.equal(formatMeters(4300), '4.30 m');
});

test('zhbëj dhe ribëj', () => {
  const s = new Store(emptyDoc());
  s.commit((d) => d.entities.push({ id: newId(), kind: 'wall', layer: WALL_LAYER, a: { x: 0, y: 0 }, b: { x: 1000, y: 0 }, thickness: 250 }));
  assert.equal(s.doc.entities.length, 1);
  s.undo();
  assert.equal(s.doc.entities.length, 0);
  s.redo();
  assert.equal(s.doc.entities.length, 1);
});

test('commit pa ndryshim nuk shton histori', () => {
  const s = new Store(emptyDoc());
  s.commit(() => {});
  assert.equal(s.canUndo, false);
});

test('ruajtja dhe hapja e skedarit', () => {
  const d = emptyDoc('Shtëpia ime');
  d.entities.push({ id: 'w1', kind: 'wall', layer: WALL_LAYER, a: { x: 0, y: 0 }, b: { x: 0, y: 3000 }, thickness: 120 });
  const back = parse(serialize(d));
  assert.deepEqual(back, d);
  assert.equal(fileName(d), 'Shtepia-ime.astcad.json');
});

test('skedari i gabuar jep mesazh të qartë', () => {
  assert.throws(() => parse('{"hello":1}'), /nuk është projekt/);
  assert.throws(() => parse('jo json'), /JSON i pavlefshëm/);
});

test('zoom rreth kursorit e mban pikën në vend', () => {
  const vp = new Viewport();
  vp.width = 800;
  vp.height = 600;
  const before = vp.toWorld({ x: 300, y: 200 });
  vp.zoomAt({ x: 300, y: 200 }, 2);
  const after = vp.toWorld({ x: 300, y: 200 });
  assert.ok(Math.abs(before.x - after.x) < 1e-6 && Math.abs(before.y - after.y) < 1e-6);
});
