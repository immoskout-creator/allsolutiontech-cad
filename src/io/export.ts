import type { Doc, Layer, Vec } from '../core/types';
import { render } from '../view/renderer';
import { Viewport } from '../view/viewport';
import { PX_PER_PAPER_MM, Recorder, type Shape } from './recorder';

/** Formët e planit, shtresë për shtresë, në mm të botës. */
export interface LayerShapes {
  layer: Layer;
  shapes: Shape[];
}

export interface Drawing {
  layers: LayerShapes[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

/**
 * Vizaton planin me të njëjtin renderer si ekrani, por në një Recorder, një shtresë në një herë:
 * kështu DXF-ja ka shtresat e projektit dhe PDF-ja është e njëjtë me atë që shihet.
 */
export function recordDrawing(doc: Doc): Drawing {
  const vp = new Viewport();
  vp.scale = PX_PER_PAPER_MM / doc.scale;
  vp.ox = 0;
  vp.oy = 0;
  vp.width = 0;
  vp.height = 0;
  const layers: LayerShapes[] = [];
  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    const rec = new Recorder((p) => vp.toWorld(p), vp.scale);
    render(rec as unknown as CanvasRenderingContext2D, vp, {
      doc,
      selection: new Set(),
      showGrid: false,
      overlay: {},
      scaleLabel: '',
      print: true,
      only: layer.id,
    });
    if (rec.shapes.length) layers.push({ layer, shapes: rec.shapes });
  }
  return { layers, bounds: boundsOf(layers.flatMap((l) => l.shapes)) };
}

function boundsOf(shapes: Shape[]): Drawing['bounds'] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (p: Vec, r = 0) => {
    minX = Math.min(minX, p.x - r);
    minY = Math.min(minY, p.y - r);
    maxX = Math.max(maxX, p.x + r);
    maxY = Math.max(maxY, p.y + r);
  };
  for (const s of shapes) {
    if (s.t === 'path') s.pts.forEach((p) => add(p));
    else if (s.t === 'circle') add(s.c, s.r);
    else add(s.p, s.w);
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}
