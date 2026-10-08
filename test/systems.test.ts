import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcAll, newCircuit } from '../src/core/circuits';
import { breakerSpec, cableSpec, materialList, usedSymbols } from '../src/core/materials';
import { ZONE_MAX_DEVICES, syncCableLayers } from '../src/core/systems';
import { CAMERA_MODELS, cameraCoverage, cameraSettings, coveragePolygon, detectorCalc, modelsFor, symbolCoverage } from '../src/core/coverage';
import { parse, serialize } from '../src/io/files';
import { CATEGORIES, SYMBOLS, categoryLibrary, symbolDef } from '../src/symbols/library';
import { EDITION, EDITIONS, productName } from '../src/edition';
import { sampleDoc } from '../src/core/sample';
import { symbolCenters } from '../src/ui/circuits';
import { defaultLayers, emptyDoc, type Cable, type SymbolEntity } from '../src/core/types';

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

test('katër programe: secili me librarinë, linjën dhe planin shembull të vet', () => {
  assert.deepEqual(Object.keys(EDITIONS), ['civil', 'cctv', 'network', 'fire']);
  assert.equal(EDITION.id, 'civil');
  assert.equal(new Set(Object.values(EDITIONS).map((e) => e.storage)).size, 4);
  for (const ed of Object.values(EDITIONS)) {
    const doc = sampleDoc(ed.id);
    const symbols = doc.entities.filter((e) => e.kind === 'symbol') as SymbolEntity[];
    assert.ok(symbols.length > 0, ed.id);
    // vetëm simbolet e librarisë së programit
    for (const s of symbols) assert.equal(categoryLibrary(symbolDef(s.symbol)!.category), ed.lib, `${ed.id} ${s.symbol}`);
    for (const c of doc.circuits ?? []) assert.ok(ed.kinds.includes(c.kind), `${ed.id} ${c.kind}`);
    const res = calcAll(doc, symbolCenters(doc));
    for (const r of res) assert.deepEqual(r.warnings, [], `${ed.id} ${r.circuit.name}`);
    // projekti i ri ka shtresat e programit, jo të të tjerëve
    const layers = defaultLayers(ed.layers).map((l) => l.id);
    for (const other of Object.values(EDITIONS)) if (other !== ed) for (const l of other.layers) assert.ok(!layers.includes(l), `${ed.id} ${l}`);
  }
  assert.equal(productName(EDITIONS.cctv), 'AllSolutionTech CAD 2D CCTV');
});

test('një projekt i kamerave hapet edhe te programi elektrik me shtresën e vet', () => {
  const back = parse(serialize(sampleDoc('cctv')));
  assert.ok(back.layers.some((l) => l.id === 'kamerat'));
  assert.ok(back.layers.some((l) => l.id === 'prizat'));
});

test('kamera ka kënd shikimi, distancë dhe drejtim; zona vizatohet në shkallë', () => {
  const cam: SymbolEntity = { id: 'c', kind: 'symbol', layer: 'kamerat', symbol: 'cc-bullet', pos: { x: 0, y: 0 }, angle: 90 };
  assert.deepEqual(cameraSettings(cam), { fov: 85, range: 20, pan: 0 });
  assert.equal(cameraSettings({ ...cam, symbol: 'cc-nvr' }), null);
  const cov = cameraCoverage({ ...cam, fov: 90, range: 10, pan: -30 }, 1)!;
  assert.equal(cov.dir, 60);
  assert.equal(cov.range, 10000);
  const poly = coveragePolygon(cov);
  assert.deepEqual(poly[0], cov.apex);
  // skajet e harkut janë 10 m larg, në 15° dhe 105°
  for (const p of poly.slice(1)) assert.ok(Math.abs(Math.hypot(p.x - cov.apex.x, p.y - cov.apex.y) - 10000) < 1e-6);
  const first = poly[1];
  assert.ok(Math.abs(Math.atan2(first.y - cov.apex.y, first.x - cov.apex.x) * (180 / Math.PI) - 15) < 1e-6);
  // vlerat jashtë kufijve kufizohen; fisheye jep rreth të plotë
  assert.deepEqual(cameraSettings({ ...cam, fov: 999, range: -4 }), { fov: 360, range: 1, pan: 0 });
  const fc = cameraCoverage({ ...cam, symbol: 'cc-fisheye' }, 1)!;
  const fish = coveragePolygon(fc);
  assert.equal(fish.length, 48);
  for (const p of fish) assert.ok(Math.abs(Math.hypot(p.x - fc.apex.x, p.y - fc.apex.y) - 8000) < 1e-6);
});

test('detektori i zjarrit: rrezja del nga lartësia dhe këndi, me kufirin e detektorit', () => {
  const det: SymbolEntity = { id: 'd', kind: 'symbol', layer: 'zjarri', symbol: 'zj-tym', pos: { x: 0, y: 0 }, angle: 270 };
  // në 2.7 m: 2.7 · tan(70°) = 7.4 m
  const d = detectorCalc(det)!;
  assert.equal(d.height, 2.7);
  assert.ok(Math.abs(d.radius - 7.418) < 0.01);
  assert.equal(d.tooHigh, false);
  // më lart rrezja nuk kalon 7.5 m; mbi 10.5 m del paralajmërimi
  assert.equal(detectorCalc({ ...det, height: 600 })!.radius, 7.5);
  assert.equal(detectorCalc({ ...det, height: 1100 })!.tooHigh, true);
  // këndi më i ngushtë zvogëlon rrezen
  assert.ok(Math.abs(detectorCalc({ ...det, fov: 90 })!.radius - 2.7) < 1e-9);
  const heat = detectorCalc({ ...det, symbol: 'zj-nxehtesi' })!;
  assert.ok(Math.abs(heat.radius - 5.3) < 0.01);
  assert.equal(detectorCalc({ ...det, symbol: 'zj-buton' }), null);
  const cov = symbolCoverage(det, 1)!;
  assert.equal(cov.fov, 360);
  assert.equal(cov.label, '140° · R 7.4 m');
});

test('modeli i kamerës del në listën e materialeve, i ndarë sipas modelit', () => {
  for (const m of CAMERA_MODELS) assert.ok(symbolDef(m.symbol)?.cover, m.id);
  assert.ok(modelsFor('cc-bullet').length >= 4);
  const used = usedSymbols(sampleDoc('cctv'));
  const bullets = used.filter((u) => u.def.id === 'cc-bullet').map((u) => [u.model, u.qty]);
  assert.deepEqual(bullets, [['Bullet 2MP · 2.8 mm', 1], ['Bullet 4MP · 4 mm', 2]]);
});
