import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcAll, newCircuit } from '../src/core/circuits';
import { breakerSpec, cableSpec, materialList } from '../src/core/materials';
import { ZONE_MAX_DEVICES, syncCableLayers } from '../src/core/systems';
import { parse, serialize } from '../src/io/files';
import { CATEGORIES, SYMBOLS, categoryLibrary } from '../src/symbols/library';
import { emptyDoc, type Cable, type SymbolEntity } from '../src/core/types';

const sym = (symbol: string, circuit: string, x = 0): SymbolEntity => ({ id: `s${Math.random()}`, kind: 'symbol', layer: 'kamerat', symbol, pos: { x, y: 0 }, angle: 90, circuit });
const cable = (circuit: string, len: number): Cable => ({ id: `k${Math.random()}`, kind: 'cable', layer: 'kabllot', points: [{ x: 0, y: 5000 }, { x: len, y: 5000 }], circuit });

test('çdo sistem ka librarinë, shtresën dhe kodet e veta', () => {
  for (const [lib, cat, layer, prefix] of [
    ['cctv', 'cctv', 'kamerat', 'AST-CC-'],
    ['network', 'rrjet', 'rrjeti', 'AST-RJ-'],
    ['fire', 'zjarr', 'zjarri', 'AST-ZJ-'],
  ] as const) {
    assert.equal(categoryLibrary(cat), lib);
    const defs = SYMBOLS.filter((s) => s.category === cat);
    assert.ok(defs.length >= 7, cat);
    for (const d of defs) {
      assert.equal(d.layer, layer, d.id);
      assert.ok(d.code.startsWith(prefix), d.id);
    }
  }
  assert.equal(new Set(SYMBOLS.map((s) => s.code)).size, SYMBOLS.length);
  assert.equal(categoryLibrary('priza'), 'civil');
  assert.ok(CATEGORIES.some((c) => c.id === 'zjarr'));
});

test('linjat e sistemeve marrin emrin e vet dhe kabllon e paracaktuar, pa siguresë', () => {
  const doc = emptyDoc();
  const cam = newCircuit([], 'cctv', 'Kamerat', 'c1');
  const net = newCircuit([cam], 'network', 'AP', 'c2');
  const fire = newCircuit([cam, net], 'fire', 'Zona 1', 'c3');
  assert.deepEqual([cam.name, net.name, fire.name], ['CAM1', 'NET1', 'FA1']);
  doc.circuits = [cam, net, fire];
  doc.entities.push(sym('cc-bullet', 'c1'), sym('cc-dome', 'c1'), cable('c1', 40000), sym('rj-ap-tavan', 'c2'), cable('c2', 95000), sym('zj-tym', 'c3'), cable('c3', 20000));
  const [rc, rn, rf] = calcAll(doc, new Map());
  assert.equal(rc.cable, 'U/UTP Cat6');
  assert.equal(rc.power, 12);
  assert.equal(rc.system, true);
  assert.deepEqual(rc.warnings, []);
  // UTP lejon 90 m për çdo kabllo
  assert.deepEqual(rn.warnings, ['run']);
  assert.equal(rf.cable, 'FE180 PH30 2×1.5 mm²');

  const m = materialList(doc, new Map());
  assert.deepEqual(m.breakers, []);
  assert.deepEqual(m.cables.map((c) => [cableSpec(c), c.system, c.qty]), [
    ['U/UTP Cat6', 'cctv', 44],
    ['U/UTP Cat6', 'network', 105],
    ['FE180 PH30 2×1.5 mm²', 'fire', 22],
  ]);
  assert.deepEqual(m.extras, [
    { id: 'rj45', system: 'cctv', qty: 2 },
    { id: 'rj45', system: 'network', qty: 2 },
    { id: 'eol', system: 'fire', qty: 1 },
  ]);
});

test('zona e zjarrit me shumë pajisje jep paralajmërim; kablloja ndjek shtresën e sistemit', () => {
  const doc = emptyDoc();
  doc.circuits = [{ ...newCircuit([], 'fire', '', 'f'), cableType: 'ph120' }, newCircuit([], 'sockets', '', 'q')];
  for (let i = 0; i <= ZONE_MAX_DEVICES; i++) doc.entities.push(sym('zj-tym', 'f', i * 1000));
  doc.entities.push(cable('f', 1000), cable('q', 1000));
  const [r] = calcAll(doc, new Map());
  assert.deepEqual(r.warnings, ['devices']);
  assert.equal(r.cable, 'FE180 PH120 2×1.5 mm²');
  syncCableLayers(doc);
  assert.deepEqual(doc.entities.filter((e) => e.kind === 'cable').map((e) => e.layer), ['zjarri', 'kabllot']);
  const m = materialList(doc, new Map());
  assert.deepEqual(m.breakers.map(breakerSpec), ['B16 1P+N']);
  // ruhet dhe hapet me llojin dhe kabllon
  const back = parse(serialize(doc));
  assert.equal(back.circuits?.[0].kind, 'fire');
  assert.equal(back.circuits?.[0].cableType, 'ph120');
  assert.ok(back.layers.some((l) => l.id === 'zjarri'));
});
