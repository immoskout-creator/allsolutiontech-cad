import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LUX_OPEN, checkEmergency, luminaireCalc, luxAt, radiusFor, signCalc } from '../src/core/emergency';
import { sampleDoc } from '../src/core/sample';
import { isSymbol, type SymbolEntity } from '../src/core/types';
import { EDITIONS } from '../src/edition';

const lamp = (extra: Partial<SymbolEntity> = {}): SymbolEntity => ({ id: 'l', kind: 'symbol', layer: 'emergjenca', symbol: 'em-tavan', pos: { x: 0, y: 0 }, angle: 270, ...extra });

test('ndriçimi bie me largësinë dhe rrezja jep pikërisht 0.5 lux', () => {
  const c = luminaireCalc(lamp())!;
  assert.equal(c.lumens, 200);
  assert.equal(c.height, 2.7);
  assert.ok(Math.abs(c.below - 200 / Math.PI / 2.7 ** 2) < 1e-9);
  assert.ok(Math.abs(luxAt(c, c.rOpen) - LUX_OPEN) < 1e-9);
  assert.ok(c.rRoute < c.rOpen && c.rOpen > 4 && c.rOpen < 6);
  // fluks i vogël shumë lart: as poshtë nuk arrihen 1 lux
  assert.equal(radiusFor({ height: 20, intensity: 10 }, 1), 0);
});

test('modeli dhe fluksi i shkruar ndryshojnë llogaritjen', () => {
  assert.equal(luminaireCalc(lamp({ model: 'em-tavan-450' }))!.lumens, 450);
  assert.equal(luminaireCalc(lamp({ model: 'em-tavan-450', lumens: 120 }))!.lumens, 120);
  assert.ok(luminaireCalc(lamp({ height: 400 }))!.rOpen > luminaireCalc(lamp())!.rOpen);
});

test('tabela EXIT shihet deri në 200 × lartësinë e piktogramit', () => {
  const s = signCalc({ ...lamp(), symbol: 'em-exit-mur' })!;
  assert.deepEqual(s, { size: 150, distance: 30 });
  assert.equal(signCalc({ ...lamp(), symbol: 'em-exit-tavan', model: 'em-exit-tavan-250' })!.distance, 50);
});

test('plani shembull i emergjencës ndriçon dhomat me ndriçues', () => {
  const doc = sampleDoc('emergency');
  assert.ok(doc.layers.some((l) => l.id === 'emergjenca'));
  const check = checkEmergency(doc);
  const lit = check.rooms.filter((r) => r.required);
  assert.ok(lit.length >= 2);
  for (const r of lit) assert.ok(r.min >= LUX_OPEN && !r.uneven, `${r.name} ${r.min}`);
  // dhomat e vogla pa ndriçues nuk kontrollohen
  assert.ok(check.rooms.some((r) => !r.required && r.gaps.length === 0));
  for (const s of check.signs.values()) assert.equal(s.tooFar, false);
});

test('me një ndriçues më pak, salloni ka pjesë nën 0.5 lux', () => {
  const doc = sampleDoc('emergency');
  const one = doc.entities.filter(isSymbol).find((e) => e.symbol === 'em-tavan' && e.pos.x === 7200)!;
  doc.entities = doc.entities.filter((e) => e.id !== one.id);
  const r = checkEmergency(doc).rooms.find((x) => x.name.startsWith('Sallon'))!;
  assert.ok(r.required && r.min < LUX_OPEN && r.gaps.length > 0);
  assert.equal(EDITIONS.emergency.kinds[0], 'emergency');
});

test('ndriçuesi i murit ndriçon dhomën ku shikon', () => {
  const doc = sampleDoc('emergency');
  doc.entities = doc.entities.filter((e) => !(isSymbol(e) && e.symbol === 'em-tavan' && e.pos.x > 9600));
  // te muri jugor i hyrjes (y = 4060), i kthyer nga hyrja
  doc.entities.push({ id: 'wm', kind: 'symbol', layer: 'emergjenca', symbol: 'em-mur', pos: { x: 12100, y: 4060 }, angle: 90, model: 'em-mur-300', lumens: 300 });
  const r = checkEmergency(doc).rooms.find((x) => x.name === 'Hyrje')!;
  assert.ok(r.required && r.max > 1, `${r.max}`);
});
