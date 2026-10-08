import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE_LIMIT, calcCircuit, phaseBalance, type CircuitCalc } from '../src/core/circuits';
import { beamCalc, beamPolygon, symbolCoverage } from '../src/core/coverage';
import { checkFire } from '../src/core/firecheck';
import { sampleDoc } from '../src/core/sample';
import { isSymbol, type Circuit, type SymbolEntity } from '../src/core/types';

const circuit = (id: string, phases: 1 | 3, extra: Partial<Circuit> = {}): Circuit => ({ id, name: id, label: '', kind: 'appliance', phases, color: '#000000', ...extra });
const sym = (symbol: string, extra: Partial<SymbolEntity> = {}): SymbolEntity => ({ id: symbol, kind: 'symbol', layer: 'pajisje', symbol, pos: { x: 0, y: 0 }, angle: 90, ...extra });
const calc = (c: Circuit, power: number): CircuitCalc => calcCircuit(c, [sym('pj-boiler', { power })], 0);

test('qarqet njëfazore ndahen vetë në fazën më të lehtë', () => {
  const b = phaseBalance([calc(circuit('a', 1), 3000), calc(circuit('b', 1), 2000), calc(circuit('c', 1), 2000), calc(circuit('d', 1), 1000), calc(circuit('e', 1), 1000)]);
  assert.deepEqual(b.loads, [3000, 3000, 3000]);
  assert.deepEqual([...b.lines.entries()].sort(), [['a', 1], ['b', 2], ['c', 3], ['d', 2], ['e', 3]]);
  assert.equal(b.imbalance, 0);
});

test('trefazori ngarkon njësoj tri fazat; faza e zgjedhur me dorë respektohet', () => {
  const b = phaseBalance([calc(circuit('m', 3), 9000), calc(circuit('x', 1, { line: 2 }), 4000)]);
  assert.deepEqual(b.loads, [3000, 7000, 3000]);
  assert.equal(b.lines.get('x'), 2);
  assert.ok(b.imbalance > BALANCE_LIMIT);
});

test('pajisje trefazore në qark njëfazor paralajmërohet; 63 A merr seksion të madh', () => {
  assert.ok(calcCircuit(circuit('a', 1), [sym('in-cee16')], 0).warnings.includes('phase'));
  assert.ok(!calcCircuit(circuit('a', 3), [sym('in-cee16')], 0).warnings.includes('phase'));
  const big = calcCircuit(circuit('b', 3, { kind: 'sockets' }), [sym('in-cee63', { power: 40000 })], 30000);
  assert.ok(big.breaker >= 63 && big.section >= 16, `${big.breaker} ${big.section}`);
  assert.deepEqual(big.warnings, []);
});

test('detektori linear mbulon një shirit 15 m të gjerë përgjatë rrezes', () => {
  const beam = sym('zj-beam', { layer: 'zjarri', range: 20 });
  const b = beamCalc(beam)!;
  assert.deepEqual([b.length, b.half, b.height], [20, 7.5, 6]);
  const poly = beamPolygon({ x: 0, y: 0 }, 0, b);
  assert.deepEqual(poly.map((p) => [Math.round(p.x), Math.round(p.y)]), [[0, 7500], [20000, 7500], [20000, -7500], [0, -7500]]);
  assert.ok(symbolCoverage(beam, 1)?.poly);
  assert.ok(beamCalc({ ...beam, height: 3000 })!.tooHigh);
});

test('salloni pa detektorë mbulohet nga një detektor linear', () => {
  const doc = sampleDoc('fire');
  const salonDet = doc.entities.filter(isSymbol).filter((e) => e.symbol.startsWith('zj-') && e.pos.x < 9600 && e.pos.y > 4000 && e.symbol !== 'zj-beam').map((e) => e.id);
  doc.entities = doc.entities.filter((e) => !salonDet.includes(e.id));
  const before = checkFire(doc).rooms.find((r) => r.name.startsWith('Sallon'))!;
  // te muri perëndimor i sallonit, rrezja drejt lindjes
  doc.entities.push(sym('zj-beam', { id: 'b', layer: 'zjarri', pos: { x: 125, y: 6300 }, angle: 0, range: 10 }));
  const after = checkFire(doc).rooms.find((r) => r.name.startsWith('Sallon'))!;
  assert.ok(after.covered > before.covered && after.covered > 0.99, `${before.covered} ${after.covered}`);
});
