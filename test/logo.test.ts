import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawingToPdf } from '../src/io/pdf';
import { parse } from '../src/io/files';

// JPEG 1×1 i bardhë
const JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

test('logoja e projektit del te PDF-ja si figurë dhe ruhet te skedari', () => {
  const page = { title: 'P', product: 'AST', date: '2026-10-09', labels: { project: 'Projekti', scale: 'Shkalla', date: 'Data', sheet: 'Fleta' } };
  const pdf = drawingToPdf({ layers: [], bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 } } as never, 50, { ...page, logo: { jpeg: JPEG, w: 1, h: 1 } });
  assert.match(pdf, /\/XObject << \/Im1 8 0 R >>/);
  assert.match(pdf, /\/Filter \/DCTDecode/);
  assert.match(pdf, /\/Im1 Do/);
  assert.doesNotMatch(drawingToPdf({ layers: [], bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 } } as never, 50, page), /Im1/);
  const doc = parse(JSON.stringify({ format: 'astcad', version: 1, name: 'x', scale: 50, layers: [], entities: [], logo: { jpeg: JPEG, w: 1, h: 1 } }));
  assert.equal(doc.logo?.w, 1);
  assert.equal(parse(JSON.stringify({ format: 'astcad', version: 1, name: 'x', scale: 50, layers: [], entities: [], logo: { jpeg: 'javascript:x', w: 1, h: 1 } })).logo, undefined);
});
