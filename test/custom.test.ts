import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanText,
  fullNames,
  mergeSymbols,
  nextCode,
  parseLibrary,
  serializeLibrary,
  shapeToPart,
  toSymbolDef,
  type CustomSymbol,
} from '../src/symbols/custom';
import { allSymbols, setCustomSymbols, symbolDef, SYMBOLS } from '../src/symbols/library';
import { parse, serialize } from '../src/io/files';
import { emptyDoc } from '../src/core/types';

const sym = (id: string, code: string): CustomSymbol => ({
  id,
  code,
  names: { sq: 'Prizë speciale' },
  layer: 'prizat',
  mount: 'wall',
  shapes: [
    { kind: 'line', a: { x: -5, y: 0 }, b: { x: 5, y: 0 } },
    { kind: 'circle', c: { x: 0, y: 8 }, r: 4, fill: true },
  ],
});

test('format e thjeshta kthehen në rrugë SVG', () => {
  assert.equal(shapeToPart({ kind: 'line', a: { x: 0, y: 0 }, b: { x: 3, y: 4 } })?.d, 'M0 0 L3 4');
  assert.equal(shapeToPart({ kind: 'rect', a: { x: 2, y: 2 }, b: { x: -2, y: -1 } })?.d, 'M-2 -1 H2 V2 H-2 Z');
  assert.equal(shapeToPart({ kind: 'rect', a: { x: 1, y: 1 }, b: { x: 1, y: 5 } }), null);
  assert.equal(shapeToPart({ kind: 'circle', c: { x: 0, y: 0 }, r: 0 }), null);
  const arc = shapeToPart({ kind: 'arc', c: { x: 0, y: 0 }, a: { x: 5, y: 0 }, b: { x: 0, y: 10 }, sweep: 1 });
  // fundi bie mbi rreth (rrezja 5), jo te pika e klikuar
  assert.equal(arc?.d, 'M5 0 A5 5 0 0 1 0 5');
  assert.equal(shapeToPart({ kind: 'text', p: { x: 0, y: 0 }, text: 'ëë', size: 4 }), null);
  assert.ok(shapeToPart({ kind: 'text', p: { x: 0, y: 0 }, text: 'ups 2', size: 4 })!.d.startsWith('M'));
});

test('teksti mban vetëm shkronjat që vizatohen', () => {
  assert.equal(cleanText('ups-3ë'), 'UPS-3');
});

test('emrat që mungojnë marrin emrin e parë', () => {
  assert.deepEqual(fullNames({ en: 'Socket' }, 'X'), { sq: 'Socket', en: 'Socket', it: 'Socket', de: 'Socket' });
  assert.equal(fullNames({}, 'AST-U-01').de, 'AST-U-01');
  assert.equal(toSymbolDef(sym('u1', 'AST-U-01')).category, 'custom');
});

test('kodi i radhës kapërcen kodet e zëna', () => {
  assert.equal(nextCode([]), 'AST-U-01');
  assert.equal(nextCode(['AST-U-01', 'AST-U-02']), 'AST-U-03');
});

test('libraria ruhet dhe lexohet pa humbje', () => {
  const list = [sym('u1', 'AST-U-01'), sym('u2', 'AST-U-02')];
  assert.deepEqual(parseLibrary(serializeLibrary(list)), list);
  assert.throws(() => parseLibrary('{"format":"tjetër"}'));
  assert.throws(() => parseLibrary('jo json'));
  // format të pavlefshme hidhen, simboli mbetet
  const bad = JSON.stringify({ format: 'astlib', version: 1, symbols: [{ ...sym('u3', 'X'), shapes: [{ kind: 'circle', c: { x: 0, y: 0 }, r: -1 }] }] });
  assert.equal(parseLibrary(bad)[0].shapes.length, 0);
});

test('importi zëvendëson të njëjtën id dhe riemërton kodin e zënë', () => {
  const merged = mergeSymbols([sym('u1', 'AST-U-01')], [{ ...sym('u1', 'AST-U-01'), layer: 'pajisje' }, sym('u9', 'AST-U-01')]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((s) => s.id === 'u1')!.layer, 'pajisje');
  assert.equal(merged.find((s) => s.id === 'u9')!.code, 'AST-U-02');
});

test('simbolet e mia ruhen në projekt dhe regjistrohen', () => {
  const doc = emptyDoc();
  doc.symbols = [sym('u1', 'AST-U-01')];
  doc.entities.push({ id: 'e1', kind: 'symbol', symbol: 'u1', layer: 'prizat', pos: { x: 0, y: 0 }, angle: 90 });
  setCustomSymbols([]);
  const back = parse(serialize(doc));
  assert.deepEqual(back.symbols, doc.symbols);
  assert.equal(symbolDef('u1')?.code, 'AST-U-01');
  assert.equal(allSymbols().length, SYMBOLS.length + 1);
  setCustomSymbols([]);
});
