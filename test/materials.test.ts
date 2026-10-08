import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breakerSpec, cableSpec, materialList, usedSymbols } from '../src/core/materials';
import { cableRunLength } from '../src/core/circuits';
import { sampleDoc } from '../src/core/sample';
import { emptyDoc, isCable, isSymbol } from '../src/core/types';
import { symbolCenters } from '../src/ui/circuits';

test('simbolet e përdorura numërohen sipas renditjes së librarisë', () => {
  const doc = sampleDoc();
  const used = usedSymbols(doc);
  assert.equal(used.reduce((s, u) => s + u.qty, 0), doc.entities.filter(isSymbol).length);
  assert.equal(used.find((u) => u.def.id === 'nd-tavan')?.qty, 5);
  // prizat vijnë para ndriçimit, si në librari
  assert.ok(used.findIndex((u) => u.def.category === 'priza') < used.findIndex((u) => u.def.category === 'ndricim'));
});

test('kabllot grupohen sipas llojit dhe marrin 10% rezervë', () => {
  const doc = sampleDoc();
  const centers = symbolCenters(doc);
  const m = materialList(doc, centers);
  const specs = m.cables.map(cableSpec);
  assert.deepEqual(specs, ['3×1.5 mm²', '3×2.5 mm²']);
  const symbols = doc.entities.filter(isSymbol);
  const total = doc.entities.filter(isCable).reduce((s, k) => s + cableRunLength(k, symbols, centers), 0) / 1000;
  const measured = m.cables.reduce((s, c) => s + c.length, 0);
  assert.ok(Math.abs(measured - total) < 1e-6);
  for (const c of m.cables) assert.equal(c.qty, Math.ceil(c.length * 1.1));
});

test('siguresat numërohen sipas lakores, rrymës dhe fazave', () => {
  const m = materialList(sampleDoc(), symbolCenters(sampleDoc()));
  assert.deepEqual(
    m.breakers.map((b) => [breakerSpec(b), b.qty]),
    [
      ['B10 1P+N', 1],
      ['C10 1P+N', 1],
      ['B16 1P+N', 2],
    ],
  );
});

test('kabllot pa qark dalin veç, plani bosh nuk ka materiale', () => {
  const doc = emptyDoc();
  assert.deepEqual(materialList(doc, new Map()), { symbols: [], cables: [], breakers: [], extras: [] });
  doc.entities.push({ id: 'k', kind: 'cable', layer: 'kabllot', points: [{ x: 0, y: 0 }, { x: 4000, y: 0 }] });
  const m = materialList(doc, new Map());
  assert.equal(m.cables.length, 1);
  assert.equal(m.cables[0].section, null);
  assert.equal(m.cables[0].qty, 5);
});
