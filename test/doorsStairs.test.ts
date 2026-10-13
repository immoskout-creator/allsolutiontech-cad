import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SWINGS, applyDoorKind, applySwing, doorKind, insideSide, openingFrame, openingSymbol, swingOf, wallPieces } from '../src/core/openings';
import { STAIR_TYPES, fitStair, rotateTo, stairAngle, stairGeometry, type StairParams } from '../src/core/drawings';
import { findRoom } from '../src/core/rooms';
import { materialList } from '../src/core/materials';
import { emptyDoc, type Opening, type Vec, type Wall } from '../src/core/types';
import { parse, serialize } from '../src/io/files';
import { recordDrawing } from '../src/io/export';
import { docToDxf } from '../src/io/dxf';
import { docToPdf } from '../src/io/pdf';
import { docToSvg } from '../src/io/svg';

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/** Dhomë 4 × 3 m; dera në murin poshtë (nga e majta në të djathtë), brendësia lart. */
function room(): Wall[] {
  const P = (x: number, y: number) => ({ x, y });
  const w = (id: string, a: Vec, b: Vec): Wall => ({ id, kind: 'wall', layer: 'muret', a, b, thickness: 200 });
  return [w('w1', P(0, 0), P(4000, 0)), w('w2', P(4000, 0), P(4000, 3000)), w('w3', P(4000, 3000), P(0, 3000)), w('w4', P(0, 3000), P(0, 0))];
}
const door = (o: Partial<Opening> = {}): Opening => ({ id: 'o', kind: 'opening', layer: 'hapjet', type: 'door', wall: 'w1', t: 2000, width: 900, side: 1, hinge: 'a', ...o });
const leaves = (o: Opening, w: Wall) => openingSymbol(o, w).filter((s) => s.kind === 'leaf');

test('dyert: 4 kombinimet brenda/jashtë × majtas/djathtas vizatohen nga ana dhe me menteshat e duhura', () => {
  const walls = room();
  const w = walls[0];
  const inside = insideSide(door(), w, walls);
  assert.equal(inside, 1);
  const f = openingFrame(door(), w)!;
  for (const s of SWINGS) {
    const o = door(applySwing(s, inside));
    assert.equal(swingOf(o, inside), s);
    const [leaf] = leaves(o, w);
    const [H, tip] = leaf.pts;
    // kanati del brenda dhomës kur hapet nga brenda, jashtë kur hapet nga jashtë
    assert.equal(!!findRoom(walls, tip), s.startsWith('in'), s);
    // menteshat te skaji i hapjes që del nga `hinge`
    near(H.x, (o.hinge === 'a' ? f.p1 : f.p2).x);
    near(dist(H, tip), 900);
    // harku i hapjes: nga kanati i mbyllur (skaji tjetër) te kanati i hapur
    const arc = openingSymbol(o, w).find((x) => x.kind === 'arc')!;
    near(dist(arc.pts[0], H), 900);
    near(arc.pts[0].x, (o.hinge === 'a' ? f.p2 : f.p1).x);
  }
  // parë nga brenda (lart), mur nga e majta në të djathtë: menteshat te b (+x) janë majtas
  assert.deepEqual(applySwing('inLeft', 1), { side: 1, hinge: 'b' });
});

test('dyert: këndi i hapjes ndryshon drejtimin e kanatit', () => {
  const w = room()[0];
  const [leaf] = leaves(door({ angle: 45 }), w);
  const [H, tip] = leaf.pts;
  near(tip.x - H.x, 900 * Math.cos(Math.PI / 4));
  near(tip.y - H.y, 900 * Math.sin(Math.PI / 4));
});

test('dyert me dy kanate: të barabartë ose 1/3–2/3, i ngushti nga menteshat', () => {
  const w = room()[0];
  const len = (o: Opening) => leaves(o, w).map((l) => Math.round(dist(l.pts[0], l.pts[1])));
  assert.deepEqual(len(door({ leaf: 'double', width: 1500 })), [750, 750]);
  assert.deepEqual(len(door({ leaf: 'double', width: 1500, split: 'third', hinge: 'a' })), [500, 1000]);
  assert.deepEqual(len(door({ leaf: 'double', width: 1500, split: 'third', hinge: 'b' })), [1000, 500]);
  assert.equal(openingSymbol(door({ leaf: 'double', width: 1500 }), w).filter((s) => s.kind === 'arc').length, 2);
});

test('dyert rrëshqitëse, palosëse dhe brenda murit', () => {
  const walls = room();
  const w = walls[0];
  // rrëshqitëse: kanati drejtkëndësh paralel me murin, pa hark, me shigjetë
  const sl = openingSymbol(door({ leaf: 'sliding' }), w);
  assert.equal(sl.filter((s) => s.kind === 'arc').length, 0);
  const panel = sl.find((s) => s.kind === 'leaf')!;
  assert.ok(panel.closed && panel.pts.every((p) => p.y > 0), 'kanati nga ana e hapjes');
  assert.ok(sl.some((s) => s.kind === 'thin'), 'shigjeta');
  assert.equal(openingSymbol(door({ leaf: 'sliding2', width: 1600 }), w).filter((s) => s.kind === 'leaf').length, 2);
  // palosëse: dy pjesë në formë V, fundi në mes të hapjes
  const fo = leaves(door({ leaf: 'folding' }), w)[0].pts;
  assert.equal(fo.length, 3);
  near(dist(fo[0], fo[2]), 450);
  assert.ok(fo[1].y > fo[0].y);
  // brenda murit: muri pritet edhe sa gjerësia e derës nga ana e menteshave (xhepi)
  const pocket = door({ leaf: 'pocket', hinge: 'a' });
  assert.deepEqual(wallPieces(w, [pocket]), [[0, 650], [2450, 4000]]);
  assert.deepEqual(wallPieces(w, [{ ...pocket, hinge: 'b' }]), [[0, 1550], [3350, 4000]]);
  const leafRect = leaves(pocket, w)[0];
  assert.ok(leafRect.closed && Math.min(...leafRect.pts.map((p) => p.x)) < 1550, 'kanati futet në xhep');
});

test('dera hyrëse: kasë e fortë dhe prag, jo më ngushtë se 100 cm; lloji kthehet mbrapsht', () => {
  const o = door();
  applyDoorKind(o, 'entrance');
  assert.equal(o.exterior, true);
  assert.equal(o.width, 1000);
  assert.equal(doorKind(o), 'entrance');
  assert.ok(openingSymbol(o, room()[0]).some((s) => s.kind === 'heavy'));
  applyDoorKind(o, 'double');
  assert.equal(o.exterior, undefined);
  assert.equal(o.leaf, 'double');
  assert.ok(o.width >= 1200);
  applyDoorKind(o, 'pocket');
  assert.equal(doorKind(o), 'pocket');
});

test('dritaret: fikse, me një ose dy krahë që hapen nga ana e zgjedhur', () => {
  const w = room()[0];
  const win = (o: Partial<Opening>) => openingSymbol(door({ type: 'window', width: 1200, ...o }), w);
  assert.equal(win({}).filter((s) => s.kind === 'arc').length, 0);
  assert.equal(win({ sash: 'single' }).filter((s) => s.kind === 'arc').length, 1);
  const two = win({ sash: 'double', side: -1 });
  assert.equal(two.filter((s) => s.kind === 'arc').length, 2);
  assert.ok(two.filter((s) => s.kind === 'thin').every((s) => s.pts[1].y < 0), 'hapen jashtë (side -1)');
});

test('dyert dhe dritaret e reja ruhen dhe lexohen; vlerat e gabuara hidhen', () => {
  const doc = emptyDoc();
  doc.entities.push(...room());
  doc.entities.push(door({ id: 'd1', leaf: 'double', split: 'third', angle: 60 }), door({ id: 'd2', leaf: 'folding' }), door({ id: 'd3', leaf: 'pocket' }));
  doc.entities.push(door({ id: 'n1', type: 'window', sash: 'double' }), door({ id: 'bad', sash: 'x' as never }));
  const back = parse(serialize(doc));
  assert.deepEqual(back.entities.filter((e) => e.kind === 'opening').map((e) => e.id), ['d1', 'd2', 'd3', 'n1']);
});

const stair = (type: StairParams['type'], extra: Partial<StairParams> = {}): StairParams => ({ type, width: 1000, steps: 16, turn: 1, riser: 175, tread: 280, ...extra });

test('shkallët: e drejtë, L, U dhe spirale kanë numrat 1…N, shigjetën dhe vijën e prerjes', () => {
  for (const type of ['straight', 'L', 'U', 'spiral'] as const) {
    const s = stair(type);
    const fit = fitStair({ x: 0, y: 0 }, { x: 1, y: 0 }, s);
    const g = stairGeometry({ x: 0, y: 0 }, type === 'spiral' ? { x: 1200, y: 0 } : fit.b, fit.stair);
    assert.deepEqual(g.labels!.map((l) => l.text), Array.from({ length: 16 }, (_, i) => String(i + 1)), type);
    assert.ok((g.arrow?.length ?? 0) >= 2, type);
    assert.equal(g.info, '16 × 17.5/28', type);
    // vija e prerjes: 6 pika me thyerjen në mes
    assert.ok(g.paths.some((p) => p.pts.length === 6 && !p.closed), type);
    for (const p of g.paths.flatMap((x) => x.pts)) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), type);
  }
  assert.ok(STAIR_TYPES.includes('winder'));
});

test('shkallët: gjatësia = shkallët × thellësia, rrotullimi dhe drejtimi i ngjitjes', () => {
  const a = { x: 0, y: 0 };
  const st = fitStair(a, { x: 0, y: 5 }, stair('straight'));
  near(st.b.x, 0);
  near(st.b.y, 16 * 280);
  const L = fitStair(a, { x: 5, y: 0 }, stair('L', { steps: 15 }));
  near(L.b.x, 8 * 280);
  assert.equal(L.stair.run2, 7 * 280);
  const U = fitStair(a, { x: 5, y: 0 }, stair('U'));
  near(U.b.x, 8 * 280);
  // L me krahë 8 + 7: numrat ndjekin të dy krahët
  assert.equal(stairGeometry(a, L.b, L.stair).labels!.length, 15);
  // rrotullimi
  const b = rotateTo(a, { x: 1000, y: 0 }, 90);
  near(b.x, 0);
  near(b.y, 1000);
  assert.equal(stairAngle(a, { x: 0, y: -10 }), 270);
  // ngjitja mbrapsht: shigjeta dhe numrat nisin nga fundi
  const up = stairGeometry(a, st.b, stair('straight'));
  const down = stairGeometry(a, st.b, stair('straight', { reverse: true }));
  assert.deepEqual(down.arrow, [...up.arrow!].reverse());
  assert.deepEqual(down.labels![0].p, up.labels![15].p);
});

test('lista e materialeve: dyert sipas llojit dhe gjerësisë, dritaret, shkallët', () => {
  const doc = emptyDoc();
  doc.entities.push(...room());
  doc.entities.push(door({ id: 'a' }), door({ id: 'b', t: 1000 }), door({ id: 'c', width: 800 }), door({ id: 'e', leaf: 'sliding' }), door({ id: 'n', type: 'window', width: 1200, sash: 'single' }));
  doc.entities.push({ id: 's', kind: 'draw', layer: 'vizatime', shape: 'stair', a: { x: 0, y: 0 }, b: { x: 4480, y: 0 }, stair: stair('straight') });
  const m = materialList(doc, new Map());
  assert.deepEqual(
    m.openings.map((o) => [o.type, o.kind, o.width, o.qty]),
    [['door', 'single', 800, 1], ['door', 'single', 900, 2], ['door', 'sliding', 900, 1], ['window', 'single', 1200, 1]],
  );
  assert.deepEqual(m.stairs, [{ type: 'straight', width: 1000, steps: 16, qty: 1 }]);
});

test('eksporti: dyert dhe shkallët dalin në DXF, PDF dhe SVG', () => {
  const doc = emptyDoc();
  doc.entities.push(...room());
  doc.entities.push(door({ id: 'd', leaf: 'double', width: 1400, split: 'third' }), door({ id: 'p', leaf: 'pocket', t: 3000, width: 700 }));
  const s = stair('U');
  const fit = fitStair({ x: 600, y: 600 }, { x: 2000, y: 600 }, s);
  doc.entities.push({ id: 's', kind: 'draw', layer: 'vizatime', shape: 'stair', a: { x: 600, y: 600 }, b: fit.b, stair: fit.stair });
  const rec = recordDrawing(doc);
  const shapes = (id: string) => rec.layers.find((l) => l.layer.id === id)?.shapes ?? [];
  // dera: kanatet dhe harqet (me ndërprerje)
  assert.ok(shapes('hapjet').some((x) => x.t === 'path' && x.dash), 'harku i hapjes');
  // shkalla: numrat 1…16 dhe shënimi LART
  const texts = shapes('vizatime').filter((x) => x.t === 'text').map((x) => (x.t === 'text' ? x.text : ''));
  for (let i = 1; i <= 16; i++) assert.ok(texts.includes(String(i)), `numri ${i}`);
  assert.ok(texts.some((x) => x.startsWith('LART') && x.includes('16 × 17.5/28')), texts.join('|'));
  const dxf = Buffer.from(docToDxf(doc)).toString('latin1');
  assert.ok(dxf.includes('\r\nSHKALLE_DHE_VIZATIME\r\n') && dxf.includes('LART 16'));
  const pdf = Buffer.from(docToPdf(doc, { title: 'Prova', product: 'AllSolutionTech CAD', date: '14.10.2026', labels: { project: 'P', scale: 'S', date: 'D', sheet: 'F' } })).toString('latin1');
  assert.ok(pdf.startsWith('%PDF') && pdf.includes('(LART 16'));
  assert.ok(docToSvg(doc).includes('>LART 16'));
});
