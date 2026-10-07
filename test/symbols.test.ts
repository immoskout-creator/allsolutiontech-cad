import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYMBOLS, symbolDef, CATEGORIES } from '../src/symbols/library';
import { attachToWall, localToWorld, normAngle, screenRotation } from '../src/symbols/place';
import { LANGS, setLang, t } from '../src/i18n/strings';
import { parse, serialize } from '../src/io/files';
import { emptyDoc, WALL_LAYER, type Wall } from '../src/core/types';
import { sampleDoc } from '../src/core/sample';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

test('çdo simbol ka kod unik, kategori dhe emër në të gjitha gjuhët', () => {
  const codes = new Set(SYMBOLS.map((s) => s.code));
  assert.equal(codes.size, SYMBOLS.length);
  const cats = new Set(CATEGORIES.map((c) => c.id));
  for (const s of SYMBOLS) {
    assert.match(s.code, /^AST-[A-Z]{2}-\d{2}$/);
    assert.ok(cats.has(s.category), s.id);
    for (const l of LANGS) assert.ok(s.names[l.id]?.trim(), `${s.id} pa emër në ${l.id}`);
  }
});

test('simboli i lirë del drejt (pa rrotullim në ekran)', () => {
  assert.ok(near(screenRotation(270), 0));
});

test('+y lokale shkon drejt dhomës', () => {
  const p = localToWorld({ x: 0, y: 0 }, 90, { x: 0, y: 10 });
  assert.ok(near(p.x, 0) && p.y > 0);
  const q = localToWorld({ x: 0, y: 0 }, 0, { x: 0, y: 10 });
  assert.ok(q.x > 0 && near(q.y, 0));
});

test('ngjitja te muri zgjedh anën e kursorit', () => {
  const w: Wall = { id: 'w', kind: 'wall', layer: WALL_LAYER, a: { x: 0, y: 0 }, b: { x: 4000, y: 0 }, thickness: 200 };
  const above = attachToWall({ x: 1000, y: 300 }, [w], 450);
  assert.deepEqual(above && { ...above.pos, angle: above.angle }, { x: 1000, y: 100, angle: 90 });
  const below = attachToWall({ x: 1000, y: -300 }, [w], 450);
  assert.deepEqual(below && { ...below.pos, angle: below.angle }, { x: 1000, y: -100, angle: 270 });
  assert.equal(attachToWall({ x: 1000, y: 2000 }, [w], 450), null);
  assert.equal(attachToWall({ x: 5000, y: 100 }, [w], 450), null);
});

test('këndi normalizohet', () => {
  assert.equal(normAngle(-90), 270);
  assert.equal(normAngle(450), 90);
});

test('përkthimet zëvendësojnë vlerat', () => {
  setLang('en');
  assert.equal(t('deleteN', { n: 3 }), 'Delete 3 objects');
  setLang('de');
  assert.equal(t('save'), 'Speichern');
  setLang('sq');
});

test('simbolet ruhen dhe hapen; simbolet e panjohura hidhen', () => {
  const d = emptyDoc('Test');
  d.entities.push({ id: 's1', kind: 'symbol', layer: 'prizat', symbol: 'pr-schuko', pos: { x: 100, y: 125 }, angle: 90, height: 30 });
  const back = parse(serialize(d));
  assert.deepEqual(back.entities, d.entities);
  const bad = JSON.parse(serialize(d));
  bad.entities.push({ id: 's2', kind: 'symbol', layer: 'x', symbol: 'nuk-ekziston', pos: { x: 0, y: 0 }, angle: 0 });
  assert.equal(parse(JSON.stringify(bad)).entities.length, 1);
});

test('skedari i vjetër merr shtresat e reja', () => {
  const d = emptyDoc();
  d.layers = d.layers.filter((l) => l.id !== 'pajisje');
  assert.ok(parse(serialize(d)).layers.some((l) => l.id === 'pajisje'));
});

test('plani shembull përdor vetëm simbole që ekzistojnë', () => {
  for (const e of sampleDoc().entities) if (e.kind === 'symbol') assert.ok(symbolDef(e.symbol), e.symbol);
});
