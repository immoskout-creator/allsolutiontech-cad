import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaText, findRoom } from '../src/core/rooms';
import { clampT, openingFrame, placeOnWall, wallPieces } from '../src/core/openings';
import { moveEntity, wallMap } from '../src/core/move';
import { parse, serialize } from '../src/io/files';
import { emptyDoc, isRoom, isWall, WALL_LAYER, type Opening, type Wall } from '../src/core/types';
import { sampleDoc } from '../src/core/sample';

const wall = (id: string, ax: number, ay: number, bx: number, by: number, th = 200): Wall => ({
  id, kind: 'wall', layer: WALL_LAYER, a: { x: ax, y: ay }, b: { x: bx, y: by }, thickness: th,
});

const box = [wall('s', 0, 0, 5000, 0), wall('e', 5000, 0, 5000, 4000), wall('n', 5000, 4000, 0, 4000), wall('w', 0, 4000, 0, 0)];

test('dhoma e thjeshtë: m² neto pa trashësinë e mureve', () => {
  const r = findRoom(box, { x: 2500, y: 2000 });
  assert.ok(r);
  assert.equal(areaText(r.area), (4.8 * 3.8).toFixed(2)); // 18.24
  assert.ok(Math.abs(r.perimeter - 2 * (4800 + 3800)) < 1e-6);
  assert.equal(findRoom(box, { x: 6000, y: 2000 }), null);
});

test('muri i ndarjes (T) krijon dy dhoma; muri pa dalje nuk ndikon', () => {
  const walls = [...box, wall('m', 2000, 0, 2000, 4000, 100), wall('x', 4000, 1000, 4000, 2500, 100)];
  const left = findRoom(walls, { x: 1000, y: 2000 })!;
  const right = findRoom(walls, { x: 3500, y: 2000 })!;
  assert.equal(areaText(left.area), (1.85 * 3.8).toFixed(2));
  assert.equal(areaText(right.area), (2.85 * 3.8).toFixed(2));
});

test('dhoma e hapur nuk ka sipërfaqe', () => {
  assert.equal(findRoom(box.slice(0, 3), { x: 2500, y: 2000 }), null);
});

test('dera pret murin dhe mbetet brenda tij', () => {
  const w = box[0];
  const o = { t: 1000, width: 900 };
  const f = openingFrame(o, w)!;
  assert.deepEqual([f.s1, f.s2], [550, 1450]);
  assert.deepEqual(wallPieces(w, [{ ...o } as Opening]), [[0, 550], [1450, 5000]]);
  assert.equal(clampT(100, 900, 5000), 450);
  const pl = placeOnWall({ x: 2030, y: -300 }, box, 900, 50)!;
  assert.deepEqual(pl, { wall: 's', t: 2050, side: -1 });
  assert.equal(placeOnWall({ x: 2500, y: 2000 }, box, 900, 50), null);
});

test('dera rrëshqet përgjatë murit kur zhvendoset; ndjek murin kur lëviz muri', () => {
  const o: Opening = { id: 'o', kind: 'opening', layer: 'hapjet', type: 'door', wall: 's', t: 1000, width: 900, side: 1, hinge: 'a' };
  const walls = wallMap(box);
  assert.equal((moveEntity(o, { x: 300, y: 999 }, new Set(['o']), walls) as Opening).t, 1300);
  assert.equal((moveEntity(o, { x: 300, y: 0 }, new Set(['o', 's']), walls) as Opening).t, 1000);
});

test('dyert dhe dhomat ruhen; dera pa mur hidhet', () => {
  const d = emptyDoc();
  d.entities.push(box[0]);
  d.entities.push({ id: 'o', kind: 'opening', layer: 'hapjet', type: 'window', wall: 's', t: 1000, width: 1200, side: 1, hinge: 'a' });
  d.entities.push({ id: 'o2', kind: 'opening', layer: 'hapjet', type: 'door', wall: 'nuk-ka', t: 1000, width: 900, side: 1, hinge: 'a' });
  d.entities.push({ id: 'r', kind: 'room', layer: 'dhomat', name: 'Sallon', pos: { x: 1, y: 2 } });
  assert.deepEqual(parse(serialize(d)).entities.map((e) => e.id), ['s', 'o', 'r']);
});

test('çdo dhomë e planit shembull është e mbyllur', () => {
  const doc = sampleDoc();
  const walls = doc.entities.filter(isWall);
  for (const r of doc.entities.filter(isRoom)) assert.ok(findRoom(walls, r.pos), r.name);
});
