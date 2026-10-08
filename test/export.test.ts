import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleDoc } from '../src/core/sample';
import { emptyDoc } from '../src/core/types';
import { recordDrawing } from '../src/io/export';
import { aci, docToDxf, drawingToDxf, layerName, triangulate } from '../src/io/dxf';
import { chooseSheet, docToPdf } from '../src/io/pdf';
import { tracePath } from '../src/io/recorder';

const PAGE = { title: 'Shtëpi', product: 'AllSolutionTech CAD Electrical', date: '08.10.2026', labels: { project: 'Projekti', scale: 'Shkalla', date: 'Data', sheet: 'Fleta' } };
const text = (b: Uint8Array) => Buffer.from(b).toString('latin1');

test('plani shembull regjistrohet me shtresat, muret, simbolet dhe tekstet', () => {
  const d = recordDrawing(sampleDoc('civil'));
  const ids = d.layers.map((l) => l.layer.id);
  assert.ok(ids.includes('muret') && ids.includes('prizat') && ids.includes('dhomat'), ids.join(','));
  const all = d.layers.flatMap((l) => l.shapes);
  assert.ok(all.some((s) => s.t === 'text' && /m²/.test(s.text)), 'sipërfaqja e dhomës');
  assert.ok(all.some((s) => s.t === 'path' && s.fill), 'muret e mbushura');
  assert.ok(d.bounds && d.bounds.maxX - d.bounds.minX > 3000, 'përmasat në mm');
});

test('DXF R12: koka, tabelat, shtresat dhe EOF', () => {
  const dxf = text(docToDxf(sampleDoc('civil')));
  const lines = dxf.split('\r\n');
  assert.equal(lines[0], '0');
  assert.equal(lines[1], 'SECTION');
  assert.ok(dxf.includes('$ACADVER\r\n1\r\nAC1009'));
  assert.ok(dxf.includes('\r\nLAYER\r\n2\r\nMURET\r\n'));
  assert.ok(dxf.includes('\r\nSOLID\r\n') && dxf.includes('\r\nTEXT\r\n') && dxf.includes('\r\nPOLYLINE\r\n'));
  assert.ok(dxf.trimEnd().endsWith('0\r\nEOF'));
  // grupet vijnë në çifte kod/vlerë: kodi gjithmonë numër
  for (let i = 0; i + 1 < lines.length - 1; i += 2) assert.match(lines[i], /^-?\d+$/, `rreshti ${i + 1}: ${lines[i]}`);
  // ë dhe ç mbeten në Windows-1252
  assert.ok(/Kuzhin|Dhom|Sallon/.test(dxf));
});

test('DXF: shkronjat jashtë Windows-1252 shkruhen si \\U+XXXX', () => {
  const doc = sampleDoc('civil');
  const room = doc.entities.find((e) => e.kind === 'room');
  if (room && room.kind === 'room') room.name = 'Кухиња';
  assert.ok(text(docToDxf(doc)).includes('\\U+041A'));
});

test('DXF i planit bosh është ende i vlefshëm', () => {
  const dxf = drawingToDxf(recordDrawing(emptyDoc()), 50);
  assert.ok(dxf.includes('ENTITIES') && dxf.trimEnd().endsWith('EOF'));
});

test('ngjyrat ACI dhe emrat e shtresave', () => {
  assert.equal(aci('#2A2F37'), 7);
  assert.equal(aci('#DC2626'), 1);
  assert.equal(layerName('Dyer dhe dritare'), 'DYER_DHE_DRITARE');
  assert.equal(layerName('Ndriçimi'), 'NDRICIMI');
});

test('trekëndëzimi mbulon të gjithë sipërfaqen, edhe për formë L', () => {
  const L = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 2 }];
  const tris = triangulate(L);
  const area = tris.reduce((s, [a, b, c]) => s + Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2, 0);
  assert.equal(tris.length, 4);
  assert.ok(Math.abs(area - 3) < 1e-9);
});

test('rrugët SVG: rrethi me dy harqe kthehet në pika mbi rreth', () => {
  const pts: { x: number; y: number }[] = [];
  const sink = { moveTo: (x: number, y: number) => pts.push({ x, y }), lineTo: (x: number, y: number) => pts.push({ x, y }), closePath() {}, quadraticCurveTo() {}, bezierCurveTo() {} };
  tracePath(sink, 'M10 0 A10 10 0 1 1 -10 0 A10 10 0 1 1 10 0 Z');
  assert.ok(pts.length > 20);
  for (const p of pts) assert.ok(Math.abs(Math.hypot(p.x, p.y) - 10) < 1e-6);
});

test('PDF: fleta më e vogël ku nxë plani në shkallën e projektit', () => {
  assert.deepEqual(chooseSheet(12000, 8000, 50).paper.name, 'A3');
  assert.equal(chooseSheet(12000, 8000, 50).scale, 50);
  assert.equal(chooseSheet(200000, 100000, 50).scale > 50, true);
});

test('PDF: struktura, xref dhe tabela e titullit', () => {
  const pdf = text(docToPdf(sampleDoc('civil'), PAGE));
  assert.ok(pdf.startsWith('%PDF-1.4'));
  assert.ok(pdf.trimEnd().endsWith('%%EOF'));
  const xref = Number(/startxref\n(\d+)/.exec(pdf)![1]);
  assert.equal(pdf.slice(xref, xref + 4), 'xref');
  // çdo objekt fillon aty ku thotë xref
  const offsets = [...pdf.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
  offsets.forEach((o, i) => assert.equal(pdf.slice(o, o + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
  const len = Number(/\/Length (\d+) >>\nstream\n/.exec(pdf)![1]);
  const start = pdf.indexOf('stream\n') + 7;
  assert.equal(pdf.slice(start + len, start + len + 10), '\nendstream');
  assert.ok(pdf.includes('(AST) Tj') && pdf.includes('(1:50) Tj') && pdf.includes('(Sht\xebpi) Tj'));
});
