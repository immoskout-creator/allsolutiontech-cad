import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SWINGS, applySwing, doorKeepouts, swingOf, widthForLeaf } from '../src/core/openings';
import { labelSpot, inKeepout } from '../src/core/rooms';
import type { Opening, Wall } from '../src/core/types';

test('hapja e derës: brenda/jashtë × majtas/djathtas kthehet saktë', () => {
  for (const inside of [1, -1] as const) for (const s of SWINGS) assert.equal(swingOf(applySwing(s, inside), inside), s);
  // mur nga e majta në të djathtë, dera hapet lart (side 1): parë nga lart, menteshat te b (+x) janë majtas
  assert.equal(swingOf({ side: 1, hinge: 'b' }, 1), 'inLeft');
  assert.equal(swingOf({ side: 1, hinge: 'a' }, 1), 'inRight');
});

test('dera me dy kanate nuk mbetet më e ngushtë se 120 cm', () => {
  assert.equal(widthForLeaf(900, 'double'), 1400);
  assert.equal(widthForLeaf(1600, 'single'), 1000);
  assert.equal(widthForLeaf(1800, 'sliding2'), 1800);
});

test('emri i dhomës shmang harkun e derës', () => {
  const w: Wall = { id: 'w', kind: 'wall', layer: 'muret', a: { x: 0, y: 0 }, b: { x: 4000, y: 0 }, thickness: 200 };
  const o: Opening = { id: 'o', kind: 'opening', layer: 'hapjet', type: 'door', wall: 'w', t: 600, width: 900, side: 1, hinge: 'a' };
  const zones = doorKeepouts([o], [w]);
  const poly = [{ x: 0, y: 100 }, { x: 4000, y: 100 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }];
  assert.ok(!inKeepout(labelSpot(poly, zones), zones));
});
