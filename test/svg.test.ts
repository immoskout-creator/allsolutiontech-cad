import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docToSvg } from '../src/io/svg';
import { sampleDoc } from '../src/core/sample';

test('SVG: plani në shkallë, një grup për çdo shtresë, pa tekst të paskapuar', () => {
  const doc = sampleDoc();
  const svg = docToSvg(doc);
  assert.match(svg, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="[\d.]+mm" height="[\d.]+mm"/);
  assert.match(svg, /<g id="muret"/);
  assert.ok((svg.match(/<path /g) ?? []).length > 20);
  // plani 14.6 m në 1:50 del rreth 292 mm, plus kuotat dhe kufijtë
  const w = Number(/width="([\d.]+)mm"/.exec(svg)![1]);
  assert.ok(w > 290 && w < 360, String(w));
  assert.ok(!/<text[^>]*>[^<]*[<>&][^<]*<\/text>/.test(svg.replace(/&(amp|lt|gt|quot);/g, '')));
  assert.ok(svg.trimEnd().endsWith('</svg>'));
});
