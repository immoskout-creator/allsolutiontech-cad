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

test('PDF: legjenda e simboleve të përdorura vendoset vetë', () => {
  const legend = [
    { parts: [{ d: 'M -5 -5 L 5 5 M -5 5 L 5 -5' }], code: 'E-01', name: 'Prizë', qty: 7 },
    { parts: [{ d: 'M 0 -5 A 5 5 0 1 0 0 5 A 5 5 0 1 0 0 -5', fill: true }], code: 'E-02', name: 'Llambë', qty: 3, color: '#DC2626' },
  ];
  const pdf = text(docToPdf(sampleDoc('civil'), { ...PAGE, labels: { ...PAGE.labels, legend: 'Simbolet' }, legend }));
  assert.ok(pdf.includes('(Simbolet) Tj') && pdf.includes('(E-01) Tj') && pdf.includes('(7x) Tj') && pdf.includes('(Llamb\xeb) Tj'));
  // legjenda e vogël nuk e zmadhon fletën
  assert.equal(chooseSheet(12000, 8000, 50, 2).paper.name, 'A3');
});

const MATERIAL_LABELS = { nr: 'Nr', code: 'Kodi', name: 'Emërtimi', qty: 'Sasia', unit: 'Njësia', total: 'Gjithsej', page: 'Faqe {n} / {total}' };

/** Kontrolli i xref: çdo objekt fillon aty ku thotë tabela. */
function assertXref(pdf: string): void {
  const xref = Number(/startxref\n(\d+)/.exec(pdf)![1]);
  assert.equal(pdf.slice(xref, xref + 4), 'xref');
  const offsets = [...pdf.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
  offsets.forEach((o, i) => assert.equal(pdf.slice(o, o + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
  for (const m of pdf.matchAll(/\/Length (\d+) >>\nstream\n/g)) {
    const start = m.index! + m[0].length;
    assert.equal(pdf.slice(start + Number(m[1]), start + Number(m[1]) + 10), '\nendstream');
  }
}

test('PDF: lista e materialeve hyn vetë si faqja 2, me shenjat shqipe', () => {
  const rows = [
    { group: 'Pajisjet', code: 'AST-PR-02', name: 'Prizë me tokëzim', qty: 12, unit: 'copë' },
    { group: 'Pajisjet', code: 'AST-ND-01', name: 'Ndriçues tavani', qty: 5, unit: 'copë' },
    { group: 'Kabllot', code: '3×2.5 mm²', name: 'Kabllo 3×2.5 mm²', qty: 48, unit: 'm' },
  ];
  const pdf = text(docToPdf(sampleDoc('civil'), { ...PAGE, materials: { title: 'Lista e materialeve', rows, labels: MATERIAL_LABELS } }));
  assertXref(pdf);
  assert.match(pdf, /\/Count 2 >>/);
  assert.equal([...pdf.matchAll(/\/Type \/Page /g)].length, 2);
  assert.ok(pdf.includes('(Lista e materialeve) Tj') && pdf.includes('(Faqe 2 / 2) Tj') && pdf.includes('(Em\xebrtimi) Tj'));
  assert.ok(pdf.includes('(Ndri\xe7ues tavani) Tj') && pdf.includes('(AST-PR-02) Tj') && pdf.includes('(48) Tj'));
  // "Gjithsej" për çdo njësi të grupit: 17 copë pajisje
  assert.ok(pdf.includes('(Gjithsej) Tj') && pdf.includes('(17) Tj'));
  // faqja e planit tregon "1/2" te fleta; data ka kutinë e vet
  assert.match(pdf, /\(A\d {2}1\/2\) Tj/);
  assert.ok(pdf.includes('(08.10.2026) Tj'));
});

test('PDF: pa materiale s\'ka faqe 2; shumë materiale zënë disa faqe', () => {
  const none = text(docToPdf(sampleDoc('civil'), { ...PAGE, materials: { title: 'Lista e materialeve', rows: [], labels: MATERIAL_LABELS } }));
  assert.match(none, /\/Count 1 >>/);
  const rows = Array.from({ length: 90 }, (_, i) => ({ group: i < 60 ? 'Pajisjet' : 'Kabllot', code: `AST-X-${i}`, name: `Element ${i}`, qty: i + 1, unit: i < 60 ? 'copë' : 'm' }));
  const pdf = text(docToPdf(sampleDoc('civil'), { ...PAGE, materials: { title: 'Lista e materialeve', rows, labels: MATERIAL_LABELS } }));
  assertXref(pdf);
  const count = Number(/\/Count (\d+) >>/.exec(pdf)![1]);
  assert.ok(count >= 3, `faqe: ${count}`);
  assert.ok(pdf.includes(`(Faqe ${count} / ${count}) Tj`));
  assert.ok(pdf.includes('(Element 89) Tj'));
});

const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

const BOX = {
  firm: { name: 'Firma Shembull sh.p.k.', address: 'Rruga e Shembullit 1, Tiranë', contact: '+355 4 000 000 · info@shembull.al', logo: { jpeg: JPEG, w: 1, h: 1 } },
  designer: { name: 'Projektuesi Shembull', title: 'Ing. elektrik, licenca E-0000', signature: { jpeg: JPEG, w: 1, h: 1 } },
  object: { name: 'Shtëpi banimi 2 kat', address: 'Rruga e Objektit 5', client: 'Investitori Shembull' },
  drawing: { sheet: 'Plani i instalimeve elektrike – Kati 1', number: 'EL-001', revision: 'A', date: '14.10.2026 09:30', checked: 'Kontrolluesi' },
  labels: { designer: 'Projektuesi', object: 'Objekti', client: 'Investitori', number: 'Nr. i vizatimit', revision: 'Revizioni', date: 'Data', checked: 'Kontrolloi' },
};

test('PDF: kutia e titullit me të gjitha fushat, logon dhe firmën, në çdo faqe', () => {
  const rows = [{ group: 'Pajisjet', code: 'AST-PR-02', name: 'Prizë', qty: 2, unit: 'copë' }];
  const pdf = text(docToPdf(sampleDoc('civil'), { ...PAGE, box: BOX, materials: { title: 'Lista e materialeve', rows, labels: MATERIAL_LABELS } }));
  assertXref(pdf);
  assert.match(pdf, /\/XObject << \/Im1 8 0 R \/Im2 9 0 R >>/);
  assert.equal([...pdf.matchAll(/\/Im2 Do/g)].length, 2, 'firma në të dyja faqet');
  for (const v of ['(Firma Shembull sh.p.k.) Tj', '(Projektuesi Shembull) Tj', '(Ing. elektrik, licenca E-0000) Tj', '(Investitori: Investitori Shembull) Tj', '(EL-001) Tj', '(14.10.2026 09:30) Tj', '(Kontrolluesi) Tj', '(1:50) Tj', '(2 / 2) Tj'])
    assert.equal(pdf.split(v).length - 1 >= 2 || v === '(1:50) Tj' || v === '(2 / 2) Tj', true, v);
  assert.ok(pdf.includes('(Sht\xebpi banimi 2 kat) Tj'), 'ë si WinAnsi');
  assert.ok(pdf.includes('(Plani i instalimeve elektrike \x96 Kati 1) Tj'), 'vija e mesme në WinAnsi');
  assert.ok(!pdf.includes('(AST) Tj'), 'pa logon AST kur ka logo firme');
});

test('PDF: fushat bosh nuk dalin dhe kutia ngel e vogël; emrat e gjatë kalojnë në rresht të dytë', async () => {
  const { wrap } = await import('../src/io/pdf');
  const empty = text(docToPdf(sampleDoc('civil'), { ...PAGE, box: { labels: BOX.labels } }));
  assert.ok(!empty.includes('(Projektuesi) Tj') && !empty.includes('(Kontrolloi) Tj') && !empty.includes('(Revizioni) Tj'));
  assert.ok(empty.includes('(AST) Tj') && empty.includes('(1:50) Tj') && empty.includes('(Sht\xebpi) Tj'));
  assert.ok(!/\/XObject/.test(empty));
  const lines = wrap('Plani i instalimeve elektrike dhe i ndriçimit të emergjencës – Kati përdhes dhe bodrumi', 60, 3, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines[1].endsWith('...'));
  const long = text(docToPdf(sampleDoc('civil'), { ...PAGE, box: { ...BOX, firm: { name: 'Firma me një emër shumë shumë të gjatë për ndërtime dhe instalime elektrike' } } }));
  assertXref(long);
});

test('PDF: legjenda e madhe vazhdon në faqe tjetër pa u zvogëluar', () => {
  const legend = Array.from({ length: 60 }, (_, i) => ({ parts: [{ d: 'M -5 -5 L 5 5' }], code: `E-${i}`, name: `Simboli me emër të gjatë numër ${i} për provë`, qty: i + 1 }));
  const pdf = text(docToPdf(sampleDoc('civil'), { ...PAGE, labels: { ...PAGE.labels, legend: 'Legjenda', legendMore: 'vazhdim' }, legend }));
  assertXref(pdf);
  assert.ok(pdf.includes('(Legjenda \\(vazhdim\\)) Tj'));
  assert.ok(pdf.includes('(E-0) Tj') && pdf.includes('(E-59) Tj') && pdf.includes('(60x) Tj'));
  // shkronjat e legjendës: emri 3.1 mm, sasia 3.4 mm
  assert.ok(pdf.includes(`/F1 ${(3.1 * 72 / 25.4).toFixed(2).replace(/\.?0+$/, '')} Tf`));
});

test('kutia e titullit: objekti dhe vizatimi ruhen me projektin', async () => {
  const { parse, serialize } = await import('../src/io/files');
  const doc = { ...sampleDoc('civil'), info: { objectName: 'Vila', sheetName: 'Plani', drawingNo: 'E-01', revision: 'A', date: '14.10.2026 09:30', bad: 'x' } };
  assert.deepEqual(parse(serialize(doc as never)).info, { objectName: 'Vila', sheetName: 'Plani', drawingNo: 'E-01', revision: 'A', date: '14.10.2026 09:30' });
  assert.equal(parse(serialize({ ...sampleDoc('civil'), info: { client: '  ' } } as never)).info, undefined);
});
