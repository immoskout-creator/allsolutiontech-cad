import type { Doc, Vec } from '../core/types';
import { recordDrawing, type Drawing } from './export';
import { PX_PER_PAPER_MM, parseColor } from './recorder';

/**
 * SVG vektorial i planit në shkallën e projektit (1 njësi = 1 mm letre), një grup për çdo shtresë.
 * Hapet në Illustrator, Inkscape, CorelDRAW, shfletues dhe shumë programe CAD.
 */

const MARGIN = 10;
const n = (v: number) => (Math.abs(v) < 1e-6 ? '0' : v.toFixed(3).replace(/\.?0+$/, ''));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const color = (c: string | undefined) => `rgb(${parseColor(c).join(',')})`;
const ANCHOR = { left: 'start', center: 'middle', right: 'end' } as const;
const BASE = { baseline: 'alphabetic', middle: 'central', top: 'hanging', bottom: 'text-after-edge' } as const;

export function drawingToSvg(drawing: Drawing, scale: number, title = ''): string {
  const b = drawing.bounds ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  const W = (b.maxX - b.minX) / scale + 2 * MARGIN;
  const H = (b.maxY - b.minY) / scale + 2 * MARGIN;
  // bota: mm, Y lart; letra: mm, Y poshtë
  const X = (p: Vec) => n((p.x - b.minX) / scale + MARGIN);
  const Y = (p: Vec) => n((b.maxY - p.y) / scale + MARGIN);
  const out: string[] = [];
  out.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${n(W)}mm" height="${n(H)}mm" viewBox="0 0 ${n(W)} ${n(H)}">`);
  if (title) out.push(`<title>${esc(title)}</title>`);
  out.push(`<rect width="100%" height="100%" fill="#fff"/>`);
  for (const { layer, shapes } of drawing.layers) {
    out.push(`<g id="${esc(layer.id)}" data-name="${esc(layer.name)}" stroke-linecap="round" stroke-linejoin="round">`);
    for (const s of shapes) {
      if (s.t === 'text') {
        if (!s.text.trim()) continue;
        const rot = s.angle ? ` transform="rotate(${n(-s.angle)} ${X(s.p)} ${Y(s.p)})"` : '';
        out.push(
          `<text x="${X(s.p)}" y="${Y(s.p)}" font-family="Helvetica, Arial, sans-serif" font-size="${n(s.size / scale)}"${s.bold ? ' font-weight="bold"' : ''} text-anchor="${ANCHOR[s.align]}" dominant-baseline="${BASE[s.base]}" fill="${color(s.color)}"${s.alpha < 1 ? ` fill-opacity="${n(s.alpha)}"` : ''}${rot}>${esc(s.text)}</text>`,
        );
        continue;
      }
      if (s.alpha < 0.02) continue;
      const paint = s.fill
        ? `fill="${color(s.fill)}" stroke="none"`
        : `fill="none" stroke="${color(s.stroke)}" stroke-width="${n(Math.min(1, Math.max(0.1, s.width / PX_PER_PAPER_MM)))}"${s.dash ? ' stroke-dasharray="2 1"' : ''}`;
      const op = s.alpha < 1 ? ` opacity="${n(s.alpha)}"` : '';
      if (s.t === 'circle') out.push(`<circle cx="${X(s.c)}" cy="${Y(s.c)}" r="${n(s.r / scale)}" ${paint}${op}/>`);
      else if (s.pts.length) out.push(`<path d="${s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p)} ${Y(p)}`).join(' ')}${s.closed ? ' Z' : ''}" ${paint}${op}/>`);
    }
    out.push('</g>');
  }
  out.push('</svg>');
  return out.join('\n');
}

/** Plani si skedar SVG. */
export const docToSvg = (doc: Doc): string => drawingToSvg(recordDrawing(doc), doc.scale, doc.name);
