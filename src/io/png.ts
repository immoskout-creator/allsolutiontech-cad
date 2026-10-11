import type { Doc } from '../core/types';
import { render } from '../view/renderer';
import { Viewport } from '../view/viewport';
import { recordDrawing } from './export';

/** Pikselat për mm letre: rreth 200 dpi, që plani të printohet qartë. */
const PX_PER_MM = 8;
/** Brinja më e gjatë e figurës, që skedari të mos dalë shumë i madh. */
const MAX_PX = 8000;
const MARGIN_MM = 10;

/** Plani si figurë PNG me sfond të bardhë, në shkallën e projektit (si te PDF-ja). */
export async function docToPng(doc: Doc): Promise<Uint8Array<ArrayBuffer>> {
  const b = recordDrawing(doc).bounds ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  const paperW = (b.maxX - b.minX) / doc.scale + 2 * MARGIN_MM;
  const paperH = (b.maxY - b.minY) / doc.scale + 2 * MARGIN_MM;
  const ppm = Math.min(PX_PER_MM, MAX_PX / Math.max(paperW, paperH));
  const vp = new Viewport();
  vp.scale = ppm / doc.scale;
  vp.width = Math.ceil(paperW * ppm);
  vp.height = Math.ceil(paperH * ppm);
  vp.ox = MARGIN_MM * ppm - b.minX * vp.scale;
  vp.oy = MARGIN_MM * ppm + b.maxY * vp.scale;
  const canvas = document.createElement('canvas');
  canvas.width = vp.width;
  canvas.height = vp.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, vp.width, vp.height);
  render(ctx, vp, { doc, selection: new Set(), showGrid: false, overlay: {}, scaleLabel: '', print: true });
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
  if (!blob) throw new Error('PNG');
  return new Uint8Array(await blob.arrayBuffer());
}
