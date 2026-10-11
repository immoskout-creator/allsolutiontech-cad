import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readApproved, signApproved } from '../src/symbols/community';
import { parseCustomSymbols, semicircle, shapeToPart, shapesFromDef, translatePath, translateShape, type CustomSymbol } from '../src/symbols/custom';
import { symbolDef } from '../src/symbols/library';

const sym: CustomSymbol = { id: 'u1', code: 'AST-U-01', names: { sq: 'Provë' }, layer: 'priza', mount: 'wall', shapes: [{ kind: 'poly', pts: [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: -5, y: 5 }], closed: true, fill: true }] };

test('simbolet e miratuara: pranohen vetëm me nënshkrimin e administratorit', async () => {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const other = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const text = await signApproved([sym], pair.privateKey, '2026-10-11');
  const ok = await readApproved(text, pair.publicKey);
  assert.equal(ok?.approved, '2026-10-11');
  assert.deepEqual(ok?.symbols, [sym]);
  assert.equal(await readApproved(text, other.publicKey), null);
  // dikush ndryshon listën pa çelësin: nënshkrimi nuk vlen më
  const f = JSON.parse(text);
  f.payload = f.payload.replace('Provë', 'Tjetër');
  assert.equal(await readApproved(JSON.stringify(f), pair.publicKey), null);
  assert.equal(await readApproved('jo json', pair.publicKey), null);
});

test('redaktori i simboleve: rrugët zhvendosen, gjysmërrethi është i mbyllur, format e reja lexohen', () => {
  assert.equal(translatePath('M0 0 L10 0 H20 V5 Q1 2 3 4 A5 5 0 0 1 10 10 Z', 1, 2), 'M1 2 L11 2 H21 V7 Q2 4 4 6 A5 5 0 0 1 11 12 Z');
  const half = semicircle({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 });
  const part = shapeToPart(half)!;
  assert.match(part.d, /^M0 0 A5 5 0 0 0 10 0 Z$/);
  const moved = translateShape(half, 0, 3);
  assert.match(shapeToPart(moved)!.d, /^M0 3 A5 5 0 0 0 10 3 Z$/);
  const poly = translateShape(sym.shapes[0], 1, 1);
  assert.deepEqual(poly.kind === 'poly' && poly.pts[0], { x: 1, y: 1 });
  // një simbol i librarisë kthehet në forma dhe ruhet/lexohet pa humbje
  const def = symbolDef('cc-dome')!;
  const shapes = shapesFromDef(def);
  assert.equal(shapes.length, def.parts.length);
  const back = parseCustomSymbols([{ ...sym, shapes }])[0];
  assert.equal(back.shapes.length, shapes.length);
  // rrugë me karaktere të panjohura nuk pranohet
  assert.equal(parseCustomSymbols([{ ...sym, shapes: [{ kind: 'path', d: 'M0 0 <script>' }] }])[0].shapes.length, 0);
});
