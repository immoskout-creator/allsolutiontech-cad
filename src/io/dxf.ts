import type { Doc, Vec } from '../core/types';
import { recordDrawing, type Drawing } from './export';
import { parseColor, type Shape } from './recorder';

/**
 * DXF R12 (AC1009) në ASCII: formati që hapin të gjitha versionet e AutoCAD, ActCAD, BricsCAD, LibreCAD etj.
 * Njësitë janë mm (1 njësi = 1 mm në realitet). Çdo shtresë e projektit bëhet shtresë DXF me ngjyrën e vet;
 * mbushjet bëhen SOLID, harqet dhe kurbat polilinja, tekstet TEXT me shkronjën Arial.
 */

// Ngjyrat bazë të AutoCAD (ACI) me vlerat RGB, për t'i afruar ngjyrat e projektit.
const ACI: [number, [number, number, number]][] = [
  [1, [255, 0, 0]], [2, [255, 255, 0]], [3, [0, 255, 0]], [4, [0, 255, 255]], [5, [0, 0, 255]], [6, [255, 0, 255]],
  [8, [128, 128, 128]], [9, [192, 192, 192]], [10, [255, 0, 0]], [14, [165, 0, 0]], [30, [255, 127, 0]], [34, [165, 82, 0]],
  [40, [255, 191, 0]], [42, [165, 124, 0]], [92, [0, 165, 0]], [94, [0, 127, 0]], [114, [0, 165, 82]], [122, [0, 255, 127]],
  [132, [0, 165, 165]], [134, [0, 127, 127]], [140, [0, 191, 255]], [142, [0, 124, 165]], [150, [0, 127, 255]], [152, [0, 82, 165]],
  [170, [0, 63, 255]], [174, [0, 0, 165]], [190, [127, 0, 255]], [194, [82, 0, 165]], [210, [255, 0, 255]], [214, [165, 0, 165]],
  [250, [51, 51, 51]], [251, [80, 80, 80]], [252, [105, 105, 105]], [253, [130, 130, 130]], [254, [190, 190, 190]],
];

/** Ngjyra ACI më e afërt; e zeza/shumë e errëta bëhet 7 (e zezë në letër, e bardhë në ekranin e errët). */
export function aci(color: string | undefined): number {
  const [r, g, b] = parseColor(color);
  if (Math.max(r, g, b) < 70) return 7;
  let best = 7, bestD = Infinity;
  for (const [n, [R, G, B]] of ACI) {
    const d = (r - R) ** 2 * 0.3 + (g - G) ** 2 * 0.59 + (b - B) ** 2 * 0.11;
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

/** Emër shtrese i sigurt për DXF (pa shkronja me shenja, pa simbolet e ndaluara). */
export function layerName(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_ -]+/g, '_')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
  return s || 'SHTRESA';
}

/** Teksti në kodimin e DXF R12 (Windows-1252); shkronjat e tjera si \U+XXXX, që AutoCAD i njeh. */
function dxfText(s: string): string {
  let out = '';
  for (const ch of s.replace(/[\r\n]+/g, ' ')) {
    const c = ch.codePointAt(0)!;
    out += c < 0x100 ? ch : `\\U+${c.toString(16).toUpperCase().padStart(4, '0')}`;
  }
  return out;
}

const f = (n: number) => (Math.abs(n) < 1e-9 ? '0' : n.toFixed(3).replace(/\.?0+$/, ''));

/** Ndan një shumëkëndësh në trekëndësha (ear clipping), për mbushjet SOLID. */
export function triangulate(poly: Vec[]): [Vec, Vec, Vec][] {
  const pts = poly.filter((p, i) => i === 0 || Math.hypot(p.x - poly[i - 1].x, p.y - poly[i - 1].y) > 1e-6);
  if (pts.length > 3 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 1e-6) pts.pop();
  if (pts.length < 3) return [];
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  const ccw = area > 0;
  const idx = pts.map((_, i) => i);
  const out: [Vec, Vec, Vec][] = [];
  const cross = (a: Vec, b: Vec, c: Vec) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const inside = (p: Vec, a: Vec, b: Vec, c: Vec) => {
    const d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p);
    return ccw ? d1 >= -1e-9 && d2 >= -1e-9 && d3 >= -1e-9 : d1 <= 1e-9 && d2 <= 1e-9 && d3 <= 1e-9;
  };
  let guard = idx.length * idx.length;
  while (idx.length > 3 && guard-- > 0) {
    let cut = false;
    for (let k = 0; k < idx.length; k++) {
      const a = pts[idx[(k + idx.length - 1) % idx.length]], b = pts[idx[k]], c = pts[idx[(k + 1) % idx.length]];
      const cr = cross(a, b, c);
      if (ccw ? cr <= 1e-12 : cr >= -1e-12) continue;
      if (idx.some((j) => { const p = pts[j]; return p !== a && p !== b && p !== c && inside(p, a, b, c); })) continue;
      out.push([a, b, c]);
      idx.splice(k, 1);
      cut = true;
      break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) out.push([pts[idx[0]], pts[idx[1]], pts[idx[2]]]);
  else if (idx.length > 3) for (let k = 1; k + 1 < idx.length; k++) out.push([pts[idx[0]], pts[idx[k]], pts[idx[k + 1]]]);
  return out;
}

class Writer {
  private out: string[] = [];
  g(code: number, value: string | number): void {
    this.out.push(String(code), typeof value === 'number' ? f(value) : value);
  }
  toString(): string {
    return this.out.join('\r\n') + '\r\n';
  }
}

/** Mbushjet shumë të tejdukshme (zonat e kamerave etj.) nuk bëhen SOLID, që të mos mbulojnë planin. */
const SOLID_ALPHA = 0.5;

function writeEntities(w: Writer, layer: string, layerColor: number, shapes: Shape[]): void {
  const common = (color: string | undefined, dash: boolean) => {
    w.g(8, layer);
    const c = aci(color);
    if (c !== layerColor) w.g(62, c);
    if (dash) w.g(6, 'DASHED');
  };
  for (const s of shapes) {
    if (s.t === 'text') {
      if (!s.text.trim()) continue;
      w.g(0, 'TEXT');
      common(s.color, false);
      w.g(10, s.p.x); w.g(20, s.p.y); w.g(30, 0);
      w.g(40, s.size * 0.72); // lartësia e shkronjave të mëdha
      w.g(1, dxfText(s.text));
      if (s.angle) w.g(50, s.angle);
      w.g(7, 'AST');
      const h = s.align === 'center' ? 1 : s.align === 'right' ? 2 : 0;
      const v = s.base === 'bottom' ? 1 : s.base === 'middle' ? 2 : s.base === 'top' ? 3 : 0;
      if (h) w.g(72, h);
      if (h || v) { w.g(11, s.p.x); w.g(21, s.p.y); w.g(31, 0); }
      if (v) w.g(73, v);
      continue;
    }
    if (s.fill) {
      if (s.alpha < SOLID_ALPHA) continue;
      const poly = s.t === 'circle'
        ? Array.from({ length: 36 }, (_, i) => ({ x: s.c.x + Math.cos((i / 36) * 2 * Math.PI) * s.r, y: s.c.y + Math.sin((i / 36) * 2 * Math.PI) * s.r }))
        : s.pts;
      for (const [a, b, c] of triangulate(poly)) {
        w.g(0, 'SOLID');
        common(s.fill, false);
        // radhitja e SOLID: pika e 3-të dhe e 4-ta njësoj për trekëndësh
        w.g(10, a.x); w.g(20, a.y); w.g(30, 0);
        w.g(11, b.x); w.g(21, b.y); w.g(31, 0);
        w.g(12, c.x); w.g(22, c.y); w.g(32, 0);
        w.g(13, c.x); w.g(23, c.y); w.g(33, 0);
      }
      continue;
    }
    if (s.alpha < 0.2) continue;
    if (s.t === 'circle') {
      w.g(0, 'CIRCLE');
      common(s.stroke, s.dash);
      w.g(10, s.c.x); w.g(20, s.c.y); w.g(30, 0);
      w.g(40, s.r);
      continue;
    }
    const pts = s.pts;
    if (pts.length === 2 && !s.closed) {
      w.g(0, 'LINE');
      common(s.stroke, s.dash);
      w.g(10, pts[0].x); w.g(20, pts[0].y); w.g(30, 0);
      w.g(11, pts[1].x); w.g(21, pts[1].y); w.g(31, 0);
      continue;
    }
    w.g(0, 'POLYLINE');
    common(s.stroke, s.dash);
    w.g(66, 1);
    w.g(10, 0); w.g(20, 0); w.g(30, 0);
    w.g(70, s.closed ? 1 : 0);
    for (const p of pts) {
      w.g(0, 'VERTEX');
      w.g(8, layer);
      w.g(10, p.x); w.g(20, p.y); w.g(30, 0);
    }
    w.g(0, 'SEQEND');
    w.g(8, layer);
  }
}

/** DXF-ja e vizatimit si tekst (përdor `dxfBytes` për skedarin). */
export function drawingToDxf(drawing: Drawing, scale: number): string {
  const w = new Writer();
  const b = drawing.bounds ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  const names = new Map<string, string>();
  for (const { layer } of drawing.layers) {
    let n = layerName(layer.name);
    while ([...names.values()].includes(n)) n += '_';
    names.set(layer.id, n);
  }

  w.g(0, 'SECTION'); w.g(2, 'HEADER');
  w.g(9, '$ACADVER'); w.g(1, 'AC1009');
  w.g(9, '$DWGCODEPAGE'); w.g(3, 'ANSI_1252');
  w.g(9, '$INSBASE'); w.g(10, 0); w.g(20, 0); w.g(30, 0);
  w.g(9, '$EXTMIN'); w.g(10, b.minX); w.g(20, b.minY); w.g(30, 0);
  w.g(9, '$EXTMAX'); w.g(10, b.maxX); w.g(20, b.maxY); w.g(30, 0);
  w.g(9, '$LIMMIN'); w.g(10, b.minX); w.g(20, b.minY);
  w.g(9, '$LIMMAX'); w.g(10, b.maxX); w.g(20, b.maxY);
  w.g(9, '$LTSCALE'); w.g(40, scale);
  w.g(9, '$TEXTSTYLE'); w.g(7, 'AST');
  w.g(0, 'ENDSEC');

  w.g(0, 'SECTION'); w.g(2, 'TABLES');
  w.g(0, 'TABLE'); w.g(2, 'LTYPE'); w.g(70, 2);
  w.g(0, 'LTYPE'); w.g(2, 'CONTINUOUS'); w.g(70, 0); w.g(3, 'Solid line'); w.g(72, 65); w.g(73, 0); w.g(40, 0);
  // vijat e ndërprera: 2 mm vijë, 1 mm hapësirë në letër; $LTSCALE i shumëzon me shkallën
  w.g(0, 'LTYPE'); w.g(2, 'DASHED'); w.g(70, 0); w.g(3, '__ __ __'); w.g(72, 65); w.g(73, 2); w.g(40, 3); w.g(49, 2); w.g(49, -1);
  w.g(0, 'ENDTAB');
  w.g(0, 'TABLE'); w.g(2, 'LAYER'); w.g(70, drawing.layers.length + 1);
  w.g(0, 'LAYER'); w.g(2, '0'); w.g(70, 0); w.g(62, 7); w.g(6, 'CONTINUOUS');
  for (const { layer } of drawing.layers) {
    w.g(0, 'LAYER'); w.g(2, names.get(layer.id)!); w.g(70, 0); w.g(62, aci(layer.color)); w.g(6, 'CONTINUOUS');
  }
  w.g(0, 'ENDTAB');
  w.g(0, 'TABLE'); w.g(2, 'STYLE'); w.g(70, 2);
  w.g(0, 'STYLE'); w.g(2, 'STANDARD'); w.g(70, 0); w.g(40, 0); w.g(41, 1); w.g(50, 0); w.g(71, 0); w.g(42, 2.5); w.g(3, 'txt'); w.g(4, '');
  w.g(0, 'STYLE'); w.g(2, 'AST'); w.g(70, 0); w.g(40, 0); w.g(41, 1); w.g(50, 0); w.g(71, 0); w.g(42, 2.5); w.g(3, 'arial.ttf'); w.g(4, '');
  w.g(0, 'ENDTAB');
  w.g(0, 'ENDSEC');

  w.g(0, 'SECTION'); w.g(2, 'ENTITIES');
  for (const { layer, shapes } of drawing.layers) writeEntities(w, names.get(layer.id)!, aci(layer.color), shapes);
  w.g(0, 'ENDSEC');
  w.g(0, 'EOF');
  return w.toString();
}

/** Teksti në bajtë Windows-1252 (shkronjat jashtë tij janë shkruar më parë si \U+XXXX). */
export function latin1(s: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i] = c < 0x100 ? c : 0x3f;
  }
  return out;
}

/** Plani si skedar DXF. */
export function docToDxf(doc: Doc): Uint8Array<ArrayBuffer> {
  return latin1(drawingToDxf(recordDrawing(doc), doc.scale));
}
