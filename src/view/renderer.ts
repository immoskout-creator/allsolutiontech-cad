import { isSymbol, isWall, type Doc, type Entity, type SymbolEntity, type Vec, type Wall } from '../core/types';
import { add, dist, formatMeters, mid, sub } from '../core/geometry';
import { symbolDef, UNIT_MM } from '../symbols/library';
import { screenRotation, symbolCenter, SYMBOL_HIT_MM } from '../symbols/place';
import type { Viewport } from './viewport';

export type SnapKind = 'endpoint' | 'midpoint' | 'grid' | 'wall' | 'none';

export interface Overlay {
  /** Murrët që po zhvendosen, me zhvendosjen aktuale. */
  moveIds?: Set<string>;
  moveDelta?: Vec;
  /** Simboli që po vendoset, nën kursor. */
  symbolPreview?: { symbol: string; pos: Vec; angle: number };
  /** Muri që po vizatohet (nga pika e parë te kursori). */
  wallPreview?: { a: Vec; b: Vec; thickness: number };
  /** Kutia e përzgjedhjes në ekran; crossing = nga e djathta në të majtë. */
  box?: { a: Vec; b: Vec; crossing: boolean };
  snap?: { p: Vec; kind: SnapKind };
  cursor?: Vec;
  hoverId?: string | null;
}

export interface RenderState {
  doc: Doc;
  selection: Set<string>;
  showGrid: boolean;
  overlay: Overlay;
}

const COLORS = {
  paper: '#F4F5F7',
  gridMinor: '#E5E8EC',
  gridMajor: '#D0D5DC',
  axis: '#C2C8D0',
  wall: '#2A2F37',
  wallHover: '#4B5563',
  selected: '#2F6FD6',
  preview: 'rgba(47, 111, 214, 0.55)',
  snap: '#E8780C',
  label: '#1F242B',
  cursor: '#1F242B',
};

const GRID_STEPS = [10, 50, 100, 500, 1000, 5000, 10000, 50000];

export function render(ctx: CanvasRenderingContext2D, vp: Viewport, st: RenderState): void {
  const { width, height } = vp;
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, width, height);

  if (st.showGrid) drawGrid(ctx, vp);

  const hidden = new Set(st.doc.layers.filter((l) => !l.visible).map((l) => l.id));
  const ov = st.overlay;

  const colorOf = new Map(st.doc.layers.map((l) => [l.id, l.color]));
  const shifted = (e: Entity): Entity => {
    const d = ov.moveIds?.has(e.id) ? ov.moveDelta : undefined;
    if (!d) return e;
    return isWall(e) ? { ...e, a: add(e.a, d), b: add(e.b, d) } : { ...e, pos: add(e.pos, d) };
  };
  const visible = st.doc.entities.filter((e) => !hidden.has(e.layer)).map(shifted);

  for (const e of visible) {
    if (!isWall(e)) continue;
    let color = COLORS.wall;
    if (st.selection.has(e.id)) color = COLORS.selected;
    else if (ov.hoverId === e.id) color = COLORS.wallHover;
    drawWall(ctx, vp, e, color);
  }

  for (const e of visible) {
    if (!isSymbol(e)) continue;
    let color = colorOf.get(e.layer) ?? COLORS.wall;
    if (st.selection.has(e.id)) color = COLORS.selected;
    drawSymbol(ctx, vp, e, color, 1);
    if (ov.hoverId === e.id && !st.selection.has(e.id)) drawSymbolRing(ctx, vp, e, COLORS.wallHover, true);
  }

  for (const e of visible) {
    if (!st.selection.has(e.id)) continue;
    if (isWall(e)) {
      drawGrip(ctx, vp.toScreen(e.a));
      drawGrip(ctx, vp.toScreen(e.b));
    } else {
      drawSymbolRing(ctx, vp, e, COLORS.selected, false);
    }
  }

  if (ov.symbolPreview) {
    const p = ov.symbolPreview;
    const def = symbolDef(p.symbol);
    const ghost: SymbolEntity = { id: '', kind: 'symbol', layer: def?.layer ?? '', symbol: p.symbol, pos: p.pos, angle: p.angle };
    drawSymbol(ctx, vp, ghost, colorOf.get(ghost.layer) ?? COLORS.selected, 0.6);
  }

  if (ov.wallPreview) {
    const { a, b, thickness } = ov.wallPreview;
    if (dist(a, b) > 0) {
      drawWall(ctx, vp, { id: '', kind: 'wall', layer: '', a, b, thickness }, COLORS.preview);
      drawLengthLabel(ctx, vp, a, b);
    }
  }

  if (ov.box) drawBox(ctx, ov.box);
  if (ov.snap && ov.snap.kind !== 'none') drawSnap(ctx, vp.toScreen(ov.snap.p), ov.snap.kind);
  if (ov.cursor) drawCrosshair(ctx, ov.cursor);
}

function drawGrid(ctx: CanvasRenderingContext2D, vp: Viewport): void {
  const minor = GRID_STEPS.find((s) => s * vp.scale >= 9) ?? GRID_STEPS[GRID_STEPS.length - 1];
  const major = minor * (String(minor).startsWith('5') ? 2 : 10);
  const tl = vp.toWorld({ x: 0, y: 0 });
  const br = vp.toWorld({ x: vp.width, y: vp.height });

  const lines = (step: number, color: string) => {
    ctx.beginPath();
    for (let x = Math.floor(tl.x / step) * step; x <= br.x; x += step) {
      const sx = Math.round(vp.toScreen({ x, y: 0 }).x) + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, vp.height);
    }
    for (let y = Math.floor(br.y / step) * step; y <= tl.y; y += step) {
      const sy = Math.round(vp.toScreen({ x: 0, y }).y) + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(vp.width, sy);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  lines(minor, COLORS.gridMinor);
  lines(major, COLORS.gridMajor);

  const o = vp.toScreen({ x: 0, y: 0 });
  ctx.beginPath();
  ctx.moveTo(Math.round(o.x) + 0.5, 0);
  ctx.lineTo(Math.round(o.x) + 0.5, vp.height);
  ctx.moveTo(0, Math.round(o.y) + 0.5);
  ctx.lineTo(vp.width, Math.round(o.y) + 0.5);
  ctx.strokeStyle = COLORS.axis;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawWall(ctx: CanvasRenderingContext2D, vp: Viewport, w: Wall, color: string): void {
  const a = vp.toScreen(w.a);
  const b = vp.toScreen(w.b);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(w.thickness * vp.scale, 1.5);
  ctx.lineCap = 'square';
  ctx.stroke();
}

const pathCache = new Map<string, Path2D>();
function path(d: string): Path2D {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(d, p);
  }
  return p;
}

function drawSymbol(ctx: CanvasRenderingContext2D, vp: Viewport, e: SymbolEntity, color: string, alpha: number): void {
  const def = symbolDef(e.symbol);
  if (!def) return;
  const s = vp.toScreen(e.pos);
  const unitPx = UNIT_MM * vp.scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(s.x, s.y);
  ctx.rotate(screenRotation(e.angle));
  ctx.scale(unitPx, unitPx);
  ctx.lineWidth = Math.min(2.4, Math.max(1.2, unitPx * 1.5)) / unitPx;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (const part of def.parts) {
    const p = path(part.d);
    if (part.fill) ctx.fill(p);
    else ctx.stroke(p);
  }
  ctx.restore();
}

function drawSymbolRing(ctx: CanvasRenderingContext2D, vp: Viewport, e: SymbolEntity, color: string, dashed: boolean): void {
  const c = vp.toScreen(symbolCenter(e));
  const r = Math.max(10, SYMBOL_HIT_MM * vp.scale);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dashed ? [3, 3] : [5, 3]);
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGrip(ctx: CanvasRenderingContext2D, p: Vec): void {
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = COLORS.selected;
  ctx.lineWidth = 1.5;
  ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
  ctx.strokeRect(p.x - 4 + 0.5, p.y - 4 + 0.5, 7, 7);
}

function drawLengthLabel(ctx: CanvasRenderingContext2D, vp: Viewport, a: Vec, b: Vec): void {
  const m = vp.toScreen(mid(a, b));
  const text = formatMeters(dist(a, b));
  ctx.font = '500 12px "IBM Plex Mono", ui-monospace, monospace';
  const w = ctx.measureText(text).width + 12;
  const d = sub(vp.toScreen(b), vp.toScreen(a));
  const horizontal = Math.abs(d.x) >= Math.abs(d.y);
  const x = horizontal ? m.x - w / 2 : m.x + 14;
  const y = horizontal ? m.y - 34 : m.y - 11;
  ctx.fillStyle = COLORS.label;
  roundRect(ctx, x, y, w, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 6, y + 11);
}

function drawBox(ctx: CanvasRenderingContext2D, box: { a: Vec; b: Vec; crossing: boolean }): void {
  const x = Math.min(box.a.x, box.b.x);
  const y = Math.min(box.a.y, box.b.y);
  const w = Math.abs(box.a.x - box.b.x);
  const h = Math.abs(box.a.y - box.b.y);
  ctx.fillStyle = box.crossing ? 'rgba(5, 150, 105, 0.10)' : 'rgba(47, 111, 214, 0.10)';
  ctx.fillRect(x, y, w, h);
  ctx.setLineDash(box.crossing ? [5, 4] : []);
  ctx.strokeStyle = box.crossing ? '#059669' : COLORS.selected;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  ctx.setLineDash([]);
}

function drawSnap(ctx: CanvasRenderingContext2D, p: Vec, kind: SnapKind): void {
  ctx.strokeStyle = COLORS.snap;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (kind === 'wall') {
    ctx.moveTo(p.x - 7, p.y);
    ctx.lineTo(p.x + 7, p.y);
    ctx.moveTo(p.x - 4, p.y - 5);
    ctx.lineTo(p.x + 4, p.y - 5);
  } else if (kind === 'endpoint') {
    ctx.rect(p.x - 6, p.y - 6, 12, 12);
  } else if (kind === 'midpoint') {
    ctx.moveTo(p.x, p.y - 7);
    ctx.lineTo(p.x + 7, p.y + 5);
    ctx.lineTo(p.x - 7, p.y + 5);
    ctx.closePath();
  } else {
    ctx.moveTo(p.x - 5, p.y);
    ctx.lineTo(p.x + 5, p.y);
    ctx.moveTo(p.x, p.y - 5);
    ctx.lineTo(p.x, p.y + 5);
  }
  ctx.stroke();
}

function drawCrosshair(ctx: CanvasRenderingContext2D, p: Vec): void {
  const x = Math.round(p.x) + 0.5;
  const y = Math.round(p.y) + 0.5;
  ctx.strokeStyle = COLORS.cursor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 24, y);
  ctx.lineTo(x - 5, y);
  ctx.moveTo(x + 5, y);
  ctx.lineTo(x + 24, y);
  ctx.moveTo(x, y - 24);
  ctx.lineTo(x, y - 5);
  ctx.moveTo(x, y + 5);
  ctx.lineTo(x, y + 24);
  ctx.rect(x - 3, y - 3, 6, 6);
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
