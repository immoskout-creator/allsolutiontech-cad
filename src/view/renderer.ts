import { GRID_MM, checkFireCached } from '../core/firecheck';
import { EM_GRID_MM, checkEmergencyCached } from '../core/emergency';
import { coveragePolygon, symbolCoverage, type Coverage } from '../core/coverage';
import {
  DIM_LAYER,
  isCable,
  isOpening,
  isRoom,
  isSymbol,
  isWall,
  type Doc,
  type Entity,
  type Opening,
  type Room,
  type SymbolEntity,
  type Vec,
  type Wall,
} from '../core/types';
import { moveEntity, wallMap } from '../core/move';
import { doorKeepouts, openingFrame, sizeText, wallLength, wallPieces } from '../core/openings';
import { areaText, findRoomCached, inKeepout, labelSpot, pointInPolygon, type Keepout } from '../core/rooms';
import { dist, formatMeters, mid, sub } from '../core/geometry';
import { HIT_RADIUS_UNITS, symbolDef, unitMm } from '../symbols/library';
import { screenRotation, symbolCenter, symbolHitMm } from '../symbols/place';
import { DIM_PAPER, dimText, scaleBarLength, wallDimensions } from './dimensions';
import type { Viewport } from './viewport';

export type SnapKind = 'endpoint' | 'midpoint' | 'grid' | 'wall' | 'symbol' | 'none';

export interface Overlay {
  /** Murrët që po zhvendosen, me zhvendosjen aktuale. */
  moveIds?: Set<string>;
  moveDelta?: Vec;
  /** Simboli që po vendoset, nën kursor. */
  symbolPreview?: { symbol: string; pos: Vec; angle: number };
  /** Dera ose dritarja që po vendoset. */
  openingPreview?: Omit<Opening, 'id' | 'layer'>;
  /** Kontura e dhomës nën kursor kur vegla Dhomë është aktive. */
  roomPreview?: Vec[];
  /** Muri që po vizatohet (nga pika e parë te kursori). */
  wallPreview?: { a: Vec; b: Vec; thickness: number };
  /** Kabllo që po vizatohet, me pikën e kursorit në fund. */
  cablePreview?: Vec[];
  /** Kutia e përzgjedhjes në ekran; crossing = nga e djathta në të majtë. */
  box?: { a: Vec; b: Vec; crossing: boolean };
  snap?: { p: Vec; kind: SnapKind };
  cursor?: Vec;
  hoverId?: string | null;
  /** Kamera që po kthehet me maus: drejtimi i ri (pan) para se të ruhet. */
  aim?: { id: string; pan: number };
  /** Doreza e rrotullimit të kamerës së zgjedhur: qendra dhe pika ku kapet. */
  aimHandle?: { apex: Vec; tip: Vec };
}

export interface RenderState {
  doc: Doc;
  selection: Set<string>;
  showGrid: boolean;
  overlay: Overlay;
  /** Teksti i vizores, p.sh. "Shkalla 1:50". */
  scaleLabel: string;
  /** Për eksport (PDF, DXF): pa letrën, rrjetën, vizoren dhe paralajmërimet e ekranit. */
  print?: boolean;
  /** Vetëm entitetet e kësaj shtrese (eksporti DXF vizaton shtresë për shtresë). */
  only?: string;
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
  roomFill: 'rgba(15, 118, 110, 0.10)',
  roomHover: 'rgba(15, 118, 110, 0.06)',
  selectedFill: 'rgba(47, 111, 214, 0.10)',
};

/** Madhësia e teksteve të dhomës në letër, mm. */
const ROOM_TEXT = { name: 3.5, area: 2.5 };
/** Trashësia e kabllos dhe lartësia e etiketës së qarkut në letër, mm. */
const CABLE_MM = 0.35;
const CIRCUIT_TEXT = 2;
/** Lartësia e tekstit të masave të dyerve/dritareve në letër, mm. */
const OPENING_TEXT = 2;

const GRID_STEPS = [10, 50, 100, 500, 1000, 5000, 10000, 50000];

export function render(ctx: CanvasRenderingContext2D, vp: Viewport, st: RenderState): void {
  const { width, height } = vp;
  if (!st.print) {
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, width, height);
  }

  if (st.showGrid && !st.print) drawGrid(ctx, vp);

  const hidden = new Set(st.doc.layers.filter((l) => !l.visible).map((l) => l.id));
  const ov = st.overlay;

  const colorOf = new Map(st.doc.layers.map((l) => [l.id, l.color]));
  const unit = unitMm(st.doc.scale);
  const docWalls = wallMap(st.doc.entities);
  const shifted = (e: Entity): Entity =>
    ov.moveIds?.has(e.id) && ov.moveDelta ? moveEntity(e, ov.moveDelta, ov.moveIds, docWalls) : e;
  const all = st.doc.entities.map(shifted);
  const shown = all.filter((e) => !hidden.has(e.layer));
  const visible = st.only === undefined ? shown : shown.filter((e) => e.layer === st.only);
  const walls = all.filter(isWall);
  const openingsOf = new Map<string, Opening[]>();
  for (const o of all.filter(isOpening)) openingsOf.set(o.wall, [...(openingsOf.get(o.wall) ?? []), o]);
  const wallById = new Map(walls.map((w) => [w.id, w]));
  const paperPx = st.doc.scale * vp.scale;

  // dhomat: ngjyrë e lehtë për atë nën kursor, të zgjedhurën dhe atë që po shtohet
  for (const e of visible) {
    if (!isRoom(e)) continue;
    const sel = st.selection.has(e.id);
    if (!sel && ov.hoverId !== e.id) continue;
    const shape = findRoomCached(walls, e.pos);
    if (shape) fillPolygon(ctx, vp, shape.poly, sel ? COLORS.selectedFill : COLORS.roomHover);
  }
  if (ov.roomPreview) fillPolygon(ctx, vp, ov.roomPreview, COLORS.roomFill);

  for (const e of visible) {
    if (!isWall(e)) continue;
    let color = COLORS.wall;
    if (st.selection.has(e.id)) color = COLORS.selected;
    else if (ov.hoverId === e.id) color = COLORS.wallHover;
    drawWall(ctx, vp, e, color, openingsOf.get(e.id) ?? []);
  }

  for (const e of visible) {
    if (!isOpening(e)) continue;
    const w = wallById.get(e.wall);
    if (!w) continue;
    let color = colorOf.get(e.layer) ?? COLORS.wall;
    if (st.selection.has(e.id)) color = COLORS.selected;
    else if (ov.hoverId === e.id) color = COLORS.wallHover;
    drawOpening(ctx, vp, e, w, color);
    drawOpeningLabel(ctx, vp, e, w, color, paperPx);
  }
  if (ov.openingPreview) {
    const w = wallById.get(ov.openingPreview.wall);
    if (w) {
      const ghost: Opening = { ...ov.openingPreview, id: '', layer: '' };
      drawWall(ctx, vp, w, COLORS.wall, [...(openingsOf.get(w.id) ?? []), ghost]);
      drawOpening(ctx, vp, ghost, w, COLORS.selected);
      drawOpeningLabel(ctx, vp, ghost, w, COLORS.selected, paperPx);
    }
  }

  if (!hidden.has(DIM_LAYER) && (st.only === undefined || st.only === DIM_LAYER)) {
    drawDimensions(ctx, vp, shown.filter(isWall), st.doc.scale, colorOf.get(DIM_LAYER) ?? COLORS.label);
  }

  const keepouts = doorKeepouts(st.doc.entities.filter(isOpening), walls);
  for (const e of visible) {
    if (!isRoom(e)) continue;
    const shape = findRoomCached(walls, e.pos);
    const color = st.selection.has(e.id) ? COLORS.selected : (colorOf.get(e.layer) ?? COLORS.label);
    // etiketa që bie mbi harkun e një dere zhvendoset te pika më e lirë e dhomës
    const at = shape && inKeepout(e.pos, keepouts) ? labelSpotCached(shape.poly, keepouts) : e.pos;
    drawRoomLabel(ctx, vp, { ...e, pos: at }, shape ? areaText(shape.area) : null, color, paperPx);
  }

  // kabllot, me ngjyrën e qarkut
  const circuitOf = new Map((st.doc.circuits ?? []).map((c) => [c.id, c]));
  const cableW = Math.min(3, Math.max(1.2, CABLE_MM * paperPx));
  for (const e of visible) {
    if (!isCable(e)) continue;
    const c = e.circuit ? circuitOf.get(e.circuit) : undefined;
    let color = c?.color ?? colorOf.get(e.layer) ?? COLORS.wall;
    if (st.selection.has(e.id)) color = COLORS.selected;
    drawCable(ctx, vp, e.points, color, ov.hoverId === e.id && !st.selection.has(e.id) ? cableW + 1.5 : cableW, false);
    if (c) drawCableTag(ctx, vp, e.points, c.name, color, paperPx);
  }
  if (ov.cablePreview && ov.cablePreview.length >= 2) drawCable(ctx, vp, ov.cablePreview, COLORS.selected, cableW, true);

  // pjesët e dhomave që nuk i mbulon asnjë detektor zjarri
  if (!st.print && visible.some((e) => isSymbol(e) && (symbolDef(e.symbol)?.detector || symbolDef(e.symbol)?.beam))) {
    const fire = checkFireCached(st.doc);
    const cell = GRID_MM * vp.scale;
    ctx.save();
    ctx.fillStyle = 'rgba(220, 38, 38, 0.28)';
    for (const r of fire.rooms) for (const g of r.gaps) {
      const p = vp.toScreen(g);
      ctx.fillRect(p.x - cell / 2, p.y - cell / 2, cell, cell);
    }
    ctx.restore();
  }
  // pjesët e dhomave nën 0.5 lux në emergjencë
  if (!st.print && visible.some((e) => isSymbol(e) && symbolDef(e.symbol)?.emergency)) {
    const cell = EM_GRID_MM * vp.scale;
    ctx.save();
    ctx.fillStyle = 'rgba(220, 38, 38, 0.28)';
    for (const r of checkEmergencyCached(st.doc).rooms) for (const g of r.gaps) {
      const p = vp.toScreen(g);
      ctx.fillRect(p.x - cell / 2, p.y - cell / 2, cell, cell);
    }
    ctx.restore();
  }

  // zona e kamerave dhe e detektorëve të zjarrit, nën simbolet
  for (const e of visible) {
    if (!isSymbol(e)) continue;
    const cov = symbolCoverage(ov.aim?.id === e.id ? { ...e, pan: ov.aim.pan } : e, unit);
    if (!cov) continue;
    // detektori mbulon vetëm dhomën e vet: rrethi pritet te muret e saj
    const clip = symbolDef(e.symbol)?.detector || symbolDef(e.symbol)?.beam || symbolDef(e.symbol)?.emergency ? roomPolyAt(st.doc, walls, cov.apex) : null;
    drawCoverage(ctx, vp, cov, st.selection.has(e.id) ? COLORS.selected : (colorOf.get(e.layer) ?? COLORS.wall), st.selection.has(e.id), paperPx, clip);
  }

  for (const e of visible) {
    if (!isSymbol(e)) continue;
    let color = colorOf.get(e.layer) ?? COLORS.wall;
    if (st.selection.has(e.id)) color = COLORS.selected;
    drawSymbol(ctx, vp, e, color, 1, unit);
    const c = e.circuit ? circuitOf.get(e.circuit) : undefined;
    if (c) drawSymbolTag(ctx, vp, e, c.name, c.color, unit, paperPx);
    if (ov.hoverId === e.id && !st.selection.has(e.id)) drawSymbolRing(ctx, vp, e, COLORS.wallHover, true, unit);
    // detektor që shkel rregullat e vendosjes: unazë e kuqe
    if (st.print) continue;
    if (symbolDef(e.symbol)?.detector && checkFireCached(st.doc).detectors.get(e.id)?.issues.length) drawSymbolRing(ctx, vp, e, '#DC2626', false, unit);
    // tabelë EXIT që nuk shihet nga e gjithë dhoma
    if (symbolDef(e.symbol)?.sign && checkEmergencyCached(st.doc).signs.get(e.id)?.tooFar) drawSymbolRing(ctx, vp, e, '#DC2626', false, unit);
  }

  for (const e of visible) {
    if (!st.selection.has(e.id)) continue;
    if (isWall(e)) {
      drawGrip(ctx, vp.toScreen(e.a));
      drawGrip(ctx, vp.toScreen(e.b));
    } else if (isSymbol(e)) {
      drawSymbolRing(ctx, vp, e, COLORS.selected, false, unit);
    }
  }

  if (ov.symbolPreview) {
    const p = ov.symbolPreview;
    const def = symbolDef(p.symbol);
    const ghost: SymbolEntity = { id: '', kind: 'symbol', layer: def?.layer ?? '', symbol: p.symbol, pos: p.pos, angle: p.angle };
    drawSymbol(ctx, vp, ghost, colorOf.get(ghost.layer) ?? COLORS.selected, 0.6, unit);
  }

  if (ov.wallPreview) {
    const { a, b, thickness } = ov.wallPreview;
    if (dist(a, b) > 0) {
      drawWall(ctx, vp, { id: '', kind: 'wall', layer: '', a, b, thickness }, COLORS.preview);
      drawLengthLabel(ctx, vp, a, b);
    }
  }

  if (ov.aimHandle) drawAimHandle(ctx, vp, ov.aimHandle.apex, ov.aimHandle.tip);
  if (ov.box) drawBox(ctx, ov.box);
  if (ov.snap && ov.snap.kind !== 'none') drawSnap(ctx, vp.toScreen(ov.snap.p), ov.snap.kind);
  if (ov.cursor) drawCrosshair(ctx, ov.cursor);
  if (!st.print) drawScaleBar(ctx, vp, st.scaleLabel);
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

/** Muri si drejtkëndësh i mbushur, me boshllëqe aty ku ka dyer e dritare. */
function drawWall(ctx: CanvasRenderingContext2D, vp: Viewport, w: Wall, color: string, openings: Opening[] = []): void {
  const L = wallLength(w);
  const h = w.thickness / 2;
  ctx.fillStyle = color;
  if (L < 1) return;
  const u = { x: (w.b.x - w.a.x) / L, y: (w.b.y - w.a.y) / L };
  const n = { x: -u.y, y: u.x };
  const minPx = 0.75 / vp.scale; // muri të duket edhe kur është shumë larg
  const hh = Math.max(h, minPx);
  ctx.beginPath();
  for (const [s0, s1] of wallPieces(w, openings)) {
    // skajet e vërteta të murit zgjaten me gjysmën e trashësisë (qoshet mbyllen); skajet te hapjet jo
    const e0 = s0 <= 0 ? -h : 0;
    const e1 = s1 >= L ? h : 0;
    const corners = [
      [s0 + e0, -hh],
      [s1 + e1, -hh],
      [s1 + e1, hh],
      [s0 + e0, hh],
    ].map(([along, across]) =>
      vp.toScreen({ x: w.a.x + u.x * along + n.x * across, y: w.a.y + u.y * along + n.y * across }),
    );
    ctx.moveTo(corners[0].x, corners[0].y);
    for (const c of corners.slice(1)) ctx.lineTo(c.x, c.y);
    ctx.closePath();
  }
  ctx.fill();
}

/** Dera: krahu dhe harku i hapjes. Dritarja: tri vija (faqet dhe xhami). */
function drawOpening(ctx: CanvasRenderingContext2D, vp: Viewport, o: Opening, w: Wall, color: string): void {
  const f = openingFrame(o, w);
  if (!f) return;
  const at = (base: Vec, k: number) => vp.toScreen({ x: base.x + f.n.x * k, y: base.y + f.n.y * k });
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'butt';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  // kufijtë e hapjes, nga njëra faqe e murit te tjetra
  for (const p of [f.p1, f.p2]) {
    const a = at(p, -f.half);
    const b = at(p, f.half);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  if (o.type === 'window') {
    for (const k of [-f.half, -f.half * 0.2, f.half * 0.2, f.half]) {
      const a = at(f.p1, k);
      const b = at(f.p2, k);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  } else {
    ctx.stroke();
    const width = Math.hypot(f.p2.x - f.p1.x, f.p2.y - f.p1.y);
    const leaf = o.leaf ?? 'single';
    const face = f.half * o.side;
    if (o.exterior) {
      // dera e jashtme: pragu nga ana e jashtme dhe kasa e trashë
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      const a = at(f.p1, -face);
      const b = at(f.p2, -face);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      for (const p of [f.p1, f.p2]) {
        const c = at(p, -f.half);
        const d = at(p, f.half);
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
      }
      ctx.stroke();
    }
    if (leaf === 'single' || leaf === 'double') {
      // krahu (ose dy krahët) dhe harku i hapjes
      const leaves: [Vec, Vec, number][] =
        leaf === 'single'
          ? [o.hinge === 'a' ? [f.p1, f.p2, width] : [f.p2, f.p1, width]]
          : [
              [f.p1, { x: (f.p1.x + f.p2.x) / 2, y: (f.p1.y + f.p2.y) / 2 }, width / 2],
              [f.p2, { x: (f.p1.x + f.p2.x) / 2, y: (f.p1.y + f.p2.y) / 2 }, width / 2],
            ];
      for (const [hingeBase, otherBase, lw] of leaves) {
        const hinge = { x: hingeBase.x + f.n.x * face, y: hingeBase.y + f.n.y * face };
        const other = { x: otherBase.x + f.n.x * face, y: otherBase.y + f.n.y * face };
        const tip = { x: hinge.x + f.n.x * o.side * lw, y: hinge.y + f.n.y * o.side * lw };
        const H = vp.toScreen(hinge);
        const T = vp.toScreen(tip);
        const O = vp.toScreen(other);
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(H.x, H.y);
        ctx.lineTo(T.x, T.y);
        ctx.stroke();
        const a0 = Math.atan2(T.y - H.y, T.x - H.x);
        const a1 = Math.atan2(O.y - H.y, O.x - H.x);
        let d = a1 - a0;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(H.x, H.y, lw * vp.scale, a0, a0 + d, d < 0);
        ctx.stroke();
      }
    } else {
      // rrëshqitëse: kanati paralel me murin, nga ana e hapjes, me shigjetën e lëvizjes
      const panels: [number, number, number][] =
        leaf === 'sliding'
          ? [o.hinge === 'a' ? [0, 1, -1] : [0, 1, 1]]
          : [
              [0, 0.5, -1],
              [0.5, 1, 1],
            ];
      const off = face + o.side * Math.max(20, f.half * 0.35);
      const pt = (k: number, across: number) =>
        vp.toScreen({ x: f.p1.x + (f.p2.x - f.p1.x) * k + f.n.x * across, y: f.p1.y + (f.p2.y - f.p1.y) * k + f.n.y * across });
      const thick = o.side * Math.max(30, f.half * 0.3);
      for (const [k0, k1, dir] of panels) {
        ctx.lineWidth = 1.6;
        ctx.setLineDash([]);
        const c = [pt(k0, off), pt(k1, off), pt(k1, off + thick), pt(k0, off + thick)];
        ctx.beginPath();
        ctx.moveTo(c[0].x, c[0].y);
        for (const q of c.slice(1)) ctx.lineTo(q.x, q.y);
        ctx.closePath();
        ctx.stroke();
        // shigjeta drejt anës ku rrëshqet kanati
        const mid = (k0 + k1) / 2;
        const span = (k1 - k0) * 0.35;
        const across = off + thick * 3;
        const s0 = pt(mid - dir * span, across);
        const s1 = pt(mid + dir * span, across);
        const ang = Math.atan2(s1.y - s0.y, s1.x - s0.x);
        const ah = 6;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s0.x, s0.y);
        ctx.lineTo(s1.x, s1.y);
        ctx.lineTo(s1.x - ah * Math.cos(ang - 0.45), s1.y - ah * Math.sin(ang - 0.45));
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s1.x - ah * Math.cos(ang + 0.45), s1.y - ah * Math.sin(ang + 0.45));
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** Masat e hapjes (p.sh. "90/210") pranë saj; dera nga ana pa hapje, dritarja nga brenda. */
function drawOpeningLabel(ctx: CanvasRenderingContext2D, vp: Viewport, o: Opening, w: Wall, color: string, paperPx: number): void {
  const textPx = OPENING_TEXT * paperPx;
  if (textPx < 7) return;
  const f = openingFrame(o, w);
  if (!f) return;
  const side = o.type === 'door' ? -o.side : o.side;
  const off = f.half + 1.2 * paperPx / vp.scale;
  const c = vp.toScreen({ x: (f.p1.x + f.p2.x) / 2 + f.n.x * side * off, y: (f.p1.y + f.p2.y) / 2 + f.n.y * side * off });
  // drejtimi i murit në ekran, i kthyer që teksti të lexohet nga poshtë ose nga e djathta
  let ang = Math.atan2(-f.u.y, f.u.x);
  if (ang > Math.PI / 2 || ang <= -Math.PI / 2) ang += Math.PI;
  // ana e tekstit në ekran: larg murit
  const nx = f.n.x * side;
  const ny = -f.n.y * side;
  const away = -Math.sin(ang) * nx + Math.cos(ang) * ny;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = away > 0 ? 'top' : 'bottom';
  ctx.font = `500 ${Math.min(textPx, 32)}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.fillText(sizeText(o), 0, 0);
  ctx.restore();
}

function fillPolygon(ctx: CanvasRenderingContext2D, vp: Viewport, poly: Vec[], color: string): void {
  if (poly.length < 3) return;
  ctx.beginPath();
  poly.forEach((p, i) => {
    const s = vp.toScreen(p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Emri i dhomës dhe sipërfaqja, me madhësi letre sipas shkallës. */
const spotCache = new Map<string, Vec>();
function labelSpotCached(poly: Vec[], zones: Keepout[]): Vec {
  const key = JSON.stringify([poly, zones]);
  let v = spotCache.get(key);
  if (!v) {
    if (spotCache.size > 200) spotCache.clear();
    v = labelSpot(poly, zones);
    spotCache.set(key, v);
  }
  return v;
}

function drawRoomLabel(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  r: Room,
  area: string | null,
  color: string,
  paperPx: number,
): void {
  const namePx = Math.max(ROOM_TEXT.name * paperPx, 9);
  const areaPx = Math.max(ROOM_TEXT.area * paperPx, 8);
  if (ROOM_TEXT.area * paperPx < 4) return;
  const c = vp.toScreen(r.pos);
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  // sfond i lehtë rreth tekstit, që vijat e dyerve dhe kabllove të mos e ngatërrojnë
  ctx.strokeStyle = COLORS.paper;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.font = `600 ${Math.min(namePx, 48)}px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.strokeText(r.name, c.x, c.y);
  ctx.fillText(r.name, c.x, c.y);
  ctx.textBaseline = 'top';
  ctx.font = `500 ${Math.min(areaPx, 36)}px "IBM Plex Mono", ui-monospace, monospace`;
  const areaLabel = area === null ? '— m²' : `${area} m²`;
  ctx.strokeText(areaLabel, c.x, c.y + areaPx * 0.25);
  ctx.fillText(areaLabel, c.x, c.y + areaPx * 0.25);
  ctx.restore();
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

function drawSymbol(ctx: CanvasRenderingContext2D, vp: Viewport, e: SymbolEntity, color: string, alpha: number, unit: number): void {
  const def = symbolDef(e.symbol);
  if (!def) return;
  const s = vp.toScreen(e.pos);
  const unitPx = unit * vp.scale;
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
  // eksporti (io/recorder.ts) i lexon rrugët si tekst SVG
  const svg = (ctx as unknown as { svgPath?: (d: string, fill: boolean) => void }).svgPath;
  for (const part of def.parts) {
    if (svg) {
      svg.call(ctx, part.d, !!part.fill);
      continue;
    }
    const p = path(part.d);
    if (part.fill) ctx.fill(p);
    else ctx.stroke(p);
  }
  ctx.restore();
}

function drawCable(ctx: CanvasRenderingContext2D, vp: Viewport, points: Vec[], color: string, width: number, dashed: boolean): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (dashed) ctx.setLineDash([8, 5]);
  ctx.beginPath();
  points.forEach((p, i) => {
    const s = vp.toScreen(p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.stroke();
  ctx.restore();
}

/** Emri i qarkut mbi pjesën më të gjatë të kabllos. */
function drawCableTag(ctx: CanvasRenderingContext2D, vp: Viewport, points: Vec[], name: string, color: string, paperPx: number): void {
  const px = Math.max(CIRCUIT_TEXT * paperPx, 9);
  if (CIRCUIT_TEXT * paperPx < 3.5) return;
  let best = -1;
  let at = 1;
  for (let i = 1; i < points.length; i++) {
    const d = dist(points[i - 1], points[i]);
    if (d > best) {
      best = d;
      at = i;
    }
  }
  const a = vp.toScreen(points[at - 1]);
  const b = vp.toScreen(points[at]);
  if (Math.hypot(b.x - a.x, b.y - a.y) < px * 3) return;
  let ang = Math.atan2(b.y - a.y, b.x - a.x);
  if (ang > Math.PI / 2) ang -= Math.PI;
  if (ang < -Math.PI / 2) ang += Math.PI;
  ctx.save();
  ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.font = `600 ${Math.min(px, 22)}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, 0, -2);
  ctx.restore();
}

/** Emri i qarkut pranë simbolit. */
function drawSymbolTag(ctx: CanvasRenderingContext2D, vp: Viewport, e: SymbolEntity, name: string, color: string, unit: number, paperPx: number): void {
  const px = Math.max(CIRCUIT_TEXT * paperPx, 9);
  if (CIRCUIT_TEXT * paperPx < 3.5) return;
  const c = vp.toScreen(symbolCenter(e, unit));
  const r = HIT_RADIUS_UNITS * unit * vp.scale;
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `600 ${Math.min(px, 22)}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, c.x + r * 0.75, c.y - r * 0.75);
  ctx.restore();
}

/** Zona e kamerës: sektor i tejdukshëm me këndin dhe distancën te harku. */
/** Kontura e dhomës ku ndodhet pika, nëse ka. */
function roomPolyAt(doc: Doc, walls: Wall[], p: Vec): Vec[] | null {
  for (const r of doc.entities) {
    if (!isRoom(r)) continue;
    const shape = findRoomCached(walls, r.pos);
    if (shape && pointInPolygon(p, shape.poly)) return shape.poly;
  }
  return null;
}

function drawCoverage(ctx: CanvasRenderingContext2D, vp: Viewport, c: Coverage, color: string, selected: boolean, paperPx: number, clip: Vec[] | null = null): void {
  const pts = coveragePolygon(c).map((p) => vp.toScreen(p));
  ctx.save();
  if (clip) {
    ctx.beginPath();
    clip.forEach((q, i) => {
      const p = vp.toScreen(q);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.clip();
  }
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  // rrathët e detektorëve mbivendosen shumë, ndaj mbushen më lehtë
  ctx.globalAlpha = selected ? 0.16 : c.fov >= 360 && !clip ? 0.04 : 0.09;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = selected ? 0.9 : 0.55;
  ctx.strokeStyle = color;
  ctx.lineWidth = selected ? 1.5 : 1;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  // rrethi i brendshëm: 1 lux për rrugën e evakuimit
  if (c.inner && c.inner > 0) {
    const ctr = vp.toScreen(c.apex);
    ctx.beginPath();
    ctx.arc(ctr.x, ctr.y, c.inner * vp.scale, 0, Math.PI * 2);
    ctx.setLineDash([2, 3]);
    ctx.stroke();
  }
  // këndi dhe distanca, pak brenda harkut në mes të zonës
  const px = Math.max(CIRCUIT_TEXT * paperPx, 9);
  if (CIRCUIT_TEXT * paperPx >= 3.5) {
    const a = (c.dir * Math.PI) / 180;
    // te detektori i prerë nga dhoma, teksti qëndron pranë tij që të mos bjerë jashtë
    const r = clip ? Math.min(c.range * 0.55, 800) : c.range * (c.fov >= 360 ? 0.55 : 0.82);
    const at = vp.toScreen({ x: c.apex.x + Math.cos(a) * r, y: c.apex.y + Math.sin(a) * r });
    const text = c.label;
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.font = `600 ${Math.min(px, 22)}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeText(text, at.x, at.y);
    ctx.fillStyle = color;
    ctx.fillText(text, at.x, at.y);
  }
  ctx.restore();
}

function drawSymbolRing(ctx: CanvasRenderingContext2D, vp: Viewport, e: SymbolEntity, color: string, dashed: boolean, unit: number): void {
  const c = vp.toScreen(symbolCenter(e, unit));
  const r = Math.max(10, symbolHitMm(unit) * vp.scale);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dashed ? [3, 3] : [5, 3]);
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDimensions(ctx: CanvasRenderingContext2D, vp: Viewport, walls: Wall[], scale: number, color: string): void {
  const paperPx = scale * vp.scale; // piksela për 1 mm letre
  const textPx = DIM_PAPER.text * paperPx;
  if (textPx < 5) return; // shumë larg: kuotat do bëheshin njolla
  const tick = DIM_PAPER.tick * paperPx;
  const over = DIM_PAPER.overshoot * paperPx;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  ctx.font = `500 ${Math.min(textPx, 40)}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const d of wallDimensions(walls, scale)) {
    const a = vp.toScreen(d.a);
    const b = vp.toScreen(d.b);
    const da = vp.toScreen(d.da);
    const db = vp.toScreen(d.db);
    // drejtimi pingul në ekran (Y poshtë)
    const nx = d.n.x;
    const ny = -d.n.y;
    const ux = (db.x - da.x) / Math.hypot(db.x - da.x, db.y - da.y);
    const uy = (db.y - da.y) / Math.hypot(db.x - da.x, db.y - da.y);
    ctx.beginPath();
    // vijat ndihmëse: nga afër murit deri pak përtej vijës së kuotës
    const gap = 1.5 * paperPx;
    for (const [w, k] of [[a, da], [b, db]] as const) {
      const len = Math.hypot(k.x - w.x, k.y - w.y);
      ctx.moveTo(w.x + nx * Math.min(gap + 0, len), w.y + ny * Math.min(gap, len));
      ctx.lineTo(k.x + nx * over, k.y + ny * over);
    }
    // vija e kuotës, pak më e gjatë se pikat
    ctx.moveTo(da.x - ux * over, da.y - uy * over);
    ctx.lineTo(db.x + ux * over, db.y + uy * over);
    // vijat e pjerrëta 45° në skaje
    for (const p of [da, db]) {
      const tx = (ux + nx) * (tick / Math.SQRT2);
      const ty = (uy + ny) * (tick / Math.SQRT2);
      ctx.moveTo(p.x - tx, p.y - ty);
      ctx.lineTo(p.x + tx, p.y + ty);
    }
    ctx.stroke();

    // teksti mbi vijë, i lexueshëm nga poshtë ose nga e djathta
    let ang = Math.atan2(uy, ux);
    if (ang > Math.PI / 2 || ang <= -Math.PI / 2) ang += Math.PI;
    const mx = (da.x + db.x) / 2;
    const my = (da.y + db.y) / 2;
    const text = dimText(d.length);
    const span = Math.hypot(db.x - da.x, db.y - da.y);
    if (ctx.measureText(text).width > span - 4) continue; // muri shumë i shkurtër për tekstin
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(ang);
    // teksti vendoset nga ana e jashtme e vijës
    const side = Math.sin(ang) * nx - Math.cos(ang) * ny > 0 ? -1 : 1;
    ctx.textBaseline = side < 0 ? 'bottom' : 'top';
    ctx.fillText(text, 0, side * paperPx * 0.8);
    ctx.restore();
  }
  ctx.restore();
}

function drawScaleBar(ctx: CanvasRenderingContext2D, vp: Viewport, label: string): void {
  const mm = scaleBarLength(vp.scale);
  const w = mm * vp.scale;
  const x = 16;
  const y = vp.height - 22;
  const h = 6;
  ctx.save();
  ctx.fillStyle = 'rgba(244, 245, 247, 0.9)';
  ctx.fillRect(x - 8, y - 30, w + 16 + 120, 44);
  ctx.strokeStyle = COLORS.label;
  ctx.lineWidth = 1;
  ctx.fillStyle = COLORS.label;
  ctx.fillRect(x, y, w / 2, h);
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  ctx.fillText('0', x, y - 3);
  ctx.fillText(mm >= 1000 ? `${mm / 1000} m` : `${mm / 10} cm`, x + w, y - 3);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '600 12px "IBM Plex Sans", system-ui, sans-serif';
  ctx.fillText(label, x + w + 16, y + h / 2 - 6);
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

/** Doreza e kamerës: vijë nga kamera dhe rreth me shigjeta rrotullimi; kapet me maus dhe kthen kamerën. */
function drawAimHandle(ctx: CanvasRenderingContext2D, vp: Viewport, apex: Vec, tip: Vec): void {
  const A = vp.toScreen(apex);
  const T = vp.toScreen(tip);
  ctx.save();
  ctx.strokeStyle = COLORS.snap;
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  ctx.lineTo(T.x, T.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(T.x, T.y, AIM_HANDLE_PX, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // dy harqe të vogla: shenja e rrotullimit
  ctx.beginPath();
  ctx.arc(T.x, T.y, AIM_HANDLE_PX - 3.5, -2.6, -0.6);
  ctx.moveTo(T.x + (AIM_HANDLE_PX - 3.5) * Math.cos(0.5), T.y + (AIM_HANDLE_PX - 3.5) * Math.sin(0.5));
  ctx.arc(T.x, T.y, AIM_HANDLE_PX - 3.5, 0.5, 2.5);
  ctx.stroke();
  ctx.restore();
}

/** Rrezja e dorezës së rrotullimit të kamerës, px. */
export const AIM_HANDLE_PX = 8;

function drawSnap(ctx: CanvasRenderingContext2D, p: Vec, kind: SnapKind): void {
  ctx.strokeStyle = COLORS.snap;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (kind === 'wall') {
    ctx.moveTo(p.x - 7, p.y);
    ctx.lineTo(p.x + 7, p.y);
    ctx.moveTo(p.x - 4, p.y - 5);
    ctx.lineTo(p.x + 4, p.y - 5);
  } else if (kind === 'symbol') {
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
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
