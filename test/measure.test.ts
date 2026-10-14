import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chainDimensions, heightLabel, hostWall, moveToMeasure, placementOf } from '../src/core/measure';
import { BUILTIN_VIEWS, applyView, docWithView, groupOn, hiddenGroups, parseViews, setGroup } from '../src/core/views';
import { emptyDoc, OPENING_LAYER, WALL_LAYER, type Doc, type Opening, type SymbolEntity, type Wall } from '../src/core/types';
import { parse, serialize } from '../src/io/files';
import { recordDrawing } from '../src/io/export';
import { docsToPdf } from '../src/io/pdf';

const wall = (id: string, ax: number, ay: number, bx: number, by: number, thickness = 200): Wall => ({
  id, kind: 'wall', layer: WALL_LAYER, a: { x: ax, y: ay }, b: { x: bx, y: by }, thickness, height: 2700,
});
const sym = (id: string, symbol: string, x: number, y: number, angle: number, height?: number): SymbolEntity => ({
  id, kind: 'symbol', layer: 'prizat', symbol, pos: { x, y }, angle, ...(height !== undefined ? { height } : {}),
});

/** Dhomë 5 × 4 m (qendrat e mureve), mure 20 cm: brenda 4.80 × 3.80 m, nga (100,100) te (4900,3900). */
function room(): Doc {
  const d = emptyDoc('Prova');
  d.entities.push(wall('s', 0, 0, 5000, 0), wall('e', 5000, 0, 5000, 4000), wall('n', 5000, 4000, 0, 4000), wall('w', 0, 4000, 0, 0));
  return d;
}

test('masat e prizës në murin jugor: lartësia, tavani, majtas dhe djathtas nga cepat e brendshëm', () => {
  const d = room();
  // priza në faqen e brendshme të murit jugor (y = 100), 2 m nga cepi perëndimor i brendshëm (x = 100)
  const s = sym('p1', 'pr-schuko', 2100, 100, 90, 30);
  d.entities.push(s);
  const h = hostWall(s.pos, d.entities.filter((e): e is Wall => e.kind === 'wall'));
  assert.equal(h?.wall.id, 's');
  const p = placementOf(s, d);
  assert.equal(p.height, 30);
  assert.equal(p.ceiling, 240);
  assert.equal(p.room, 270);
  // parë nga dhoma drejt jugut: majtas është lindja
  assert.equal(p.right, 200);
  assert.equal(p.left, 280);
  assert.equal(p.left! + p.right!, 480);
});

test('shkruan "nga muri majtas" ose "djathtas": elementi lëviz dhe tjetra llogaritet', () => {
  const d = room();
  const s = sym('p1', 'pr-schuko', 2100, 100, 90, 30);
  d.entities.push(s);
  const a = moveToMeasure(s, d, 'left', 100)!;
  assert.deepEqual({ x: Math.round(a.x), y: Math.round(a.y) }, { x: 3900, y: 100 });
  s.pos = a;
  assert.equal(placementOf(s, d).right, 380);
  const b = moveToMeasure(s, d, 'right', 50)!;
  assert.equal(Math.round(b.x), 600);
  // jashtë murit nuk del
  assert.equal(Math.round(moveToMeasure(s, d, 'right', 9999)!.x), 4900);
});

test('elementi në tavan: largësitë nga muret majtas/djathtas dhe lart/poshtë', () => {
  const d = room();
  const s = sym('l1', 'nd-tavan', 1600, 2100, 90);
  s.layer = 'ndricimi';
  d.entities.push(s);
  const p = placementOf(s, d);
  assert.equal(p.onWall, false);
  assert.equal(p.height, null);
  assert.deepEqual([p.left, p.right, p.top, p.bottom], [150, 330, 180, 200]);
  const q = moveToMeasure(s, d, 'top', 190)!;
  assert.equal(Math.round(q.y), 2000);
});

test('kuota zinxhir: cepat, elementet dhe skajet e derës, në cm nga cepi në cep', () => {
  const d = room();
  d.entities.push(sym('p1', 'pr-schuko', 2100, 100, 90, 30), sym('p2', 'pr-schuko', 3800, 100, 90, 110));
  const door: Opening = { id: 'o1', kind: 'opening', layer: OPENING_LAYER, type: 'door', wall: 's', t: 900, width: 800, side: 1, hinge: 'a' };
  d.entities.push(door);
  const chains = chainDimensions(d, 50);
  assert.equal(chains.length, 1);
  const c = chains[0];
  assert.equal(c.wall, 's');
  // 100 | 500 (dera) | 1300 | 2100 (prizë) | 3800 (prizë) | 4900
  assert.deepEqual(c.texts.map((x) => x.text), ['40', '80', '80', '170', '110']);
  assert.equal(c.ticks.filter((x) => x.dotted).length, 2);
  // vija është jashtë murit (y < 0)
  assert.ok(c.a.y < -100 && c.b.y < -100);
  // teksti që s'nxë kalon në rreshtin tjetër, jo mbi fqinjin
  const rows = new Set(c.texts.map((x) => x.row));
  assert.ok(rows.size >= 1);
  assert.equal(heightLabel(d.entities.find((e) => e.id === 'p2') as SymbolEntity), 'h 110');
});

test('kuotat zinxhir ndjekin elementin kur lëviz', () => {
  const d = room();
  const s = sym('p1', 'pr-schuko', 2100, 100, 90, 30);
  d.entities.push(s);
  assert.deepEqual(chainDimensions(d, 50)[0].texts.map((x) => x.text), ['200', '280']);
  s.pos = { x: 1100, y: 100 };
  assert.deepEqual(chainDimensions(d, 50)[0].texts.map((x) => x.text), ['100', '380']);
});

test('tekstet e ngushta nuk mbivendosen: kalojnë në rresht tjetër', () => {
  const d = room();
  for (const x of [1000, 1050, 1100, 1150]) d.entities.push(sym(`p${x}`, 'pr-schuko', x, 100, 90, 30));
  const c = chainDimensions(d, 50)[0];
  const byRow = new Map<number, { a: number; b: number }[]>();
  for (const tx of c.texts) {
    const w = tx.text.length * 2.2 * 0.62 * 50;
    const list = byRow.get(tx.row) ?? [];
    for (const o of list) assert.ok(tx.at.x - w / 2 >= o.b - 1 || tx.at.x + w / 2 <= o.a + 1, `mbivendosje në rreshtin ${tx.row}`);
    list.push({ a: tx.at.x - w / 2, b: tx.at.x + w / 2 });
    byRow.set(tx.row, list);
  }
  assert.ok(c.rows >= 2);
});

test('shtresat me sy: grupet hapen/mbyllen dhe dalin/s’dalin në eksport', () => {
  const d = room();
  d.entities.push(sym('p1', 'pr-schuko', 2100, 100, 90, 30));
  assert.ok(groupOn(d, 'elements', true));
  setGroup(d, 'elements', false);
  assert.equal(groupOn(d, 'elements', true), false);
  assert.equal(d.layers.find((l) => l.id === 'prizat')!.visible, false);
  const ids = recordDrawing(d).layers.map((l) => l.layer.id);
  assert.ok(!ids.includes('prizat'));
  // pa elemente: as kuota zinxhir, as h
  const dims = recordDrawing(d).layers.find((l) => l.layer.id === 'kuotat')!;
  assert.ok(!dims.shapes.some((s) => s.t === 'text' && s.text.startsWith('h ')));
  setGroup(d, 'elements', true);
  const dims2 = recordDrawing(d).layers.find((l) => l.layer.id === 'kuotat')!;
  assert.ok(dims2.shapes.some((s) => s.t === 'text' && s.text === 'h 30'));
  assert.ok(dims2.shapes.some((s) => s.t === 'text' && s.text === '200'));
  setGroup(d, 'dims', false);
  assert.ok(!recordDrawing(d).layers.some((l) => l.layer.id === 'kuotat'));
  setGroup(d, 'texts', false);
  assert.deepEqual(d.viewOff, ['texts']);
  assert.deepEqual(hiddenGroups(d, false), ['dims', 'texts', 'grid']);
});

test('pamjet e ruajtura: plani i masave pa kabllo, plani i kabllove pa masa; ruhen në skedar', () => {
  const d = room();
  const dimsView = BUILTIN_VIEWS.find((v) => v.id === 'dims')!;
  const cablesView = BUILTIN_VIEWS.find((v) => v.id === 'cables')!;
  const a = docWithView(d, dimsView.hidden);
  assert.equal(groupOn(a, 'cables', true), false);
  assert.equal(groupOn(a, 'dims', true), true);
  const b = docWithView(d, cablesView.hidden);
  assert.equal(groupOn(b, 'dims', true), false);
  // origjinali nuk preket
  assert.ok(groupOn(d, 'cables', true));
  d.views = [{ id: 'v1', name: 'Plani i prizave', hidden: ['cables', 'coverage'] }];
  applyView(d, d.views[0].hidden);
  const back = parse(serialize(d));
  assert.deepEqual(back.views, d.views);
  assert.deepEqual(back.viewOff, ['coverage']);
  assert.deepEqual(parseViews([{ id: 'x', name: '', hidden: [] }, { id: 'all', name: 'a', hidden: [] }]), []);
});

test('PDF me shumë faqe: një faqe për çdo pamje', () => {
  const d = room();
  d.entities.push(sym('p1', 'pr-schuko', 2100, 100, 90, 30));
  const page = { title: 'Prova', product: 'AST', date: '14.10.2026', labels: { project: 'P', scale: 'S', date: 'D', sheet: 'F' } };
  const pdf = new TextDecoder('latin1').decode(
    docsToPdf(BUILTIN_VIEWS.map((v) => ({ doc: docWithView(d, v.hidden), name: v.id })), page),
  );
  assert.match(pdf, /\/Count 3/);
  assert.match(pdf, /\(h 30\)/);
});
