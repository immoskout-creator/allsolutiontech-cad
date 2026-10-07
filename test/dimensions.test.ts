import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIM_PAPER, dimText, scaleBarLength, wallDimensions } from '../src/view/dimensions';
import { parse, serialize } from '../src/io/files';
import { DEFAULT_SCALE, emptyDoc, WALL_LAYER, type Wall } from '../src/core/types';
import { unitMm } from '../src/symbols/library';

const wall = (ax: number, ay: number, bx: number, by: number): Wall => ({
  id: `w${ax}${ay}${bx}${by}`, kind: 'wall', layer: WALL_LAYER, a: { x: ax, y: ay }, b: { x: bx, y: by }, thickness: 200,
});

test('teksti i kuotës është në metra me dy shifra', () => {
  assert.equal(dimText(4300), '4.30');
  assert.equal(dimText(12345), '12.35');
});

test('kuota del nga jashtë planit, në largësinë e duhur sipas shkallës', () => {
  const walls = [wall(0, 0, 4000, 0), wall(4000, 0, 4000, 3000), wall(4000, 3000, 0, 3000), wall(0, 3000, 0, 0)];
  const dims = wallDimensions(walls, 50);
  assert.equal(dims.length, 4);
  const off = 100 + DIM_PAPER.offset * 50;
  assert.deepEqual(dims[0].da, { x: 0, y: -off });
  assert.equal(dims[0].length, 4000);
  assert.ok(dims[1].da.x > 4000);
  assert.ok(dims[2].da.y > 3000);
  assert.ok(dims[3].da.x < 0);
  assert.equal(wallDimensions(walls, 100)[0].da.y, -(100 + DIM_PAPER.offset * 100));
});

test('vizorja e shkallës zgjedh gjatësi të rrumbullakët', () => {
  assert.equal(scaleBarLength(0.1), 1000);
  assert.equal(scaleBarLength(0.02), 5000);
});

test('simbolet ndjekin shkallën e fletës', () => {
  assert.equal(unitMm(100), 2 * unitMm(50));
});

test('shkalla ruhet në skedar; vlera e gabuar merr 1:50', () => {
  const d = emptyDoc();
  d.scale = 100;
  assert.equal(parse(serialize(d)).scale, 100);
  const bad = JSON.parse(serialize(d));
  bad.scale = 'x';
  assert.equal(parse(JSON.stringify(bad)).scale, DEFAULT_SCALE);
});
