import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importDxf } from '../src/io/dxfImport';
import { isWall } from '../src/core/types';

const dxf = (body: string, units = 6) =>
  ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', String(units), '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', body, '0', 'ENDSEC', '0', 'EOF'].join('\n');

test('DXF: vijat dhe polilinja e mbyllur bëhen mure në mm', () => {
  const body = ['0', 'LINE', '8', '0', '10', '0', '20', '0', '11', '4', '21', '0', '0', 'LWPOLYLINE', '8', '0', '90', '3', '70', '1', '10', '0', '20', '1', '10', '2', '20', '1', '10', '2', '20', '3'].join('\n');
  const doc = importDxf(dxf(body), 'prova');
  const walls = doc.entities.filter(isWall);
  assert.equal(walls.length, 4);
  assert.deepEqual(walls[0].b, { x: 4000, y: 0 });
  assert.deepEqual(walls[3].a, { x: 2000, y: 3000 });
});
