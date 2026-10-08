import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cableLength, cableRunLength, calcAll, calcCircuit, designCurrent, newCircuit, voltageDrop } from '../src/core/circuits';
import { moveEntity } from '../src/core/move';
import { parse, serialize } from '../src/io/files';
import { emptyDoc, type Cable, type Circuit, type SymbolEntity } from '../src/core/types';
import { sampleDoc } from '../src/core/sample';
import { symbolCenters } from '../src/ui/circuits';

const circuit = (kind: Circuit['kind'], extra: Partial<Circuit> = {}): Circuit => ({ id: 'q1', name: 'Q1', label: '', kind, phases: 1, color: '#DC2626', ...extra });
const sym = (symbol: string, power?: number, extra: Partial<SymbolEntity> = {}): SymbolEntity => ({
  id: Math.random().toString(36),
  kind: 'symbol',
  layer: 'prizat',
  symbol,
  pos: { x: 0, y: 0 },
  angle: 90,
  ...(power !== undefined ? { power } : {}),
  ...extra,
});

test('rryma dhe rënia e tensionit', () => {
  assert.equal(designCurrent(2300, 1), 10);
  assert.ok(Math.abs(designCurrent(11000, 3) - 15.88) < 0.01);
  // 2 × 20 m × 10 A × 0.0225 / 2.5 mm² = 3.6 V → 1.565 %
  assert.ok(Math.abs(voltageDrop(20, 10, 2.5, 1) - 1.565) < 0.001);
});

test('ndriçimi merr 10 A dhe 1.5 mm², prizat 16 A dhe 2.5 mm²', () => {
  const l = calcCircuit(circuit('lighting'), [sym('nd-tavan'), sym('nd-tavan')], 0);
  assert.equal(l.power, 40);
  assert.equal(l.breaker, 10);
  assert.equal(l.cable, '3×1.5 mm²');
  assert.equal(l.drop, null);
  const s = calcCircuit(circuit('sockets'), [sym('pr-schuko'), sym('pr-schuko'), sym('pr-schuko')], 0);
  // prizat pa fuqi llogariten 200 W
  assert.equal(s.power, 600);
  assert.equal(s.breaker, 16);
  assert.equal(s.cable, '3×2.5 mm²');
});

test('pajisja zgjedh siguresën dhe kabllon sipas ngarkesës', () => {
  const oven = calcCircuit(circuit('appliance'), [sym('pj-sobe')], 0);
  // 6000 W / 230 V = 26.1 A → 32 A → 6 mm² (Iz 38 A)
  assert.equal(oven.breaker, 32);
  assert.equal(oven.section, 6);
  const ev = calcCircuit(circuit('appliance', { phases: 3 }), [sym('pj-ev')], 0);
  // 11 kW trefazor: 15.9 A → 16 A → 5×2.5 mm² (Iz 20 A)
  assert.equal(ev.breaker, 16);
  assert.equal(ev.cable, '5×2.5 mm²');
});

test('kablloja e gjatë trashet derisa rënia të jetë brenda kufirit', () => {
  // 3000 W në 40 m me 2.5 mm²: 2×40×13.04×0.0225/2.5/230 = 4.08 % > 3 % (ndriçim)
  const r = calcCircuit(circuit('lighting', { section: 2.5 }), [sym('nd-tavan', 3000)], 40000);
  assert.ok(r.section > 2.5);
  assert.ok(r.drop! <= 3);
  assert.deepEqual(r.warnings, []);
});

test('ngarkesa mbi siguresën e zgjedhur jep paralajmërim', () => {
  const r = calcCircuit(circuit('appliance', { breaker: 16 }), [sym('pj-sobe')], 0);
  assert.equal(r.breaker, 16);
  assert.deepEqual(r.warnings, ['overload']);
});

test('gjatësia e kabllos shton zbritjet te simbolet e murit', () => {
  const socket = sym('pr-schuko', undefined, { id: 's1', pos: { x: 3000, y: 0 }, height: 30 });
  const cable: Cable = { id: 'k', kind: 'cable', layer: 'kabllot', points: [{ x: 0, y: 0 }, { x: 0, y: 1000 }, { x: 3000, y: 1000 }, { x: 3000, y: 0 }] };
  assert.equal(cableLength(cable), 5000);
  // fundi te priza: nga tavani 270 cm deri 30 cm = 2.4 m
  assert.equal(cableRunLength(cable, [socket], new Map()), 7400);
});

test('qarqet dhe kabllot ruhen në skedar; lidhjet e humbura hiqen', () => {
  const doc = emptyDoc();
  doc.circuits = [circuit('sockets')];
  doc.entities.push(
    { ...sym('pr-schuko'), circuit: 'q1' },
    { id: 'k1', kind: 'cable', layer: 'kabllot', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], circuit: 'q9' },
  );
  const back = parse(serialize(doc));
  assert.deepEqual(back.circuits, doc.circuits);
  assert.equal((back.entities[0] as SymbolEntity).circuit, 'q1');
  assert.equal((back.entities[1] as Cable).circuit, undefined);
});

test('kablloja lëviz me gjithë pikat', () => {
  const k: Cable = { id: 'k', kind: 'cable', layer: 'kabllot', points: [{ x: 0, y: 0 }, { x: 10, y: 5 }] };
  const m = moveEntity(k, { x: 100, y: -5 }, new Set(['k']), new Map()) as Cable;
  assert.deepEqual(m.points, [{ x: 100, y: -5 }, { x: 110, y: 0 }]);
});

test('emri i qarkut të ri është i lirë', () => {
  assert.equal(newCircuit([circuit('sockets')], 'lighting', 'X', 'q2').name, 'Q2');
});

test('plani shembull ka qarqe të llogaritura pa paralajmërime', () => {
  const doc = sampleDoc();
  const res = calcAll(doc, symbolCenters(doc));
  assert.ok(res.length >= 3);
  for (const r of res) {
    assert.ok(r.points > 0, r.circuit.name);
    assert.ok(r.length > 0, r.circuit.name);
    assert.deepEqual(r.warnings, [], r.circuit.name);
  }
});
