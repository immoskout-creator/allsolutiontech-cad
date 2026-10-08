import type { Vec } from '../core/types';

/**
 * Një "kanavacë" që nuk vizaton, por mban mend çfarë i vizaton renderer-i (vijat, mbushjet, rrathët, tekstet),
 * në koordinatat e botës (mm, Y lart). Prej këtyre formave dalin DXF dhe PDF, të njëjta me planin në ekran.
 */

export interface PathShape {
  t: 'path';
  pts: Vec[];
  closed: boolean;
  stroke?: string;
  fill?: string;
  alpha: number;
  dash: boolean;
  /** Trashësia e vijës në piksela të eksportit (shih PX_PER_PAPER_MM). */
  width: number;
}

export interface CircleShape {
  t: 'circle';
  c: Vec;
  r: number;
  stroke?: string;
  fill?: string;
  alpha: number;
  dash: boolean;
  width: number;
}

export interface TextShape {
  t: 'text';
  text: string;
  p: Vec;
  /** Madhësia e shkronjave (em) në mm të botës. */
  size: number;
  /** Gjerësia e tekstit në mm të botës. */
  w: number;
  /** Këndi në gradë, kundër akrepave të orës. */
  angle: number;
  align: 'left' | 'center' | 'right';
  base: 'baseline' | 'middle' | 'top' | 'bottom';
  color: string;
  bold: boolean;
  alpha: number;
}

export type Shape = PathShape | CircleShape | TextShape;

/** Sa piksela eksporti bëjnë një mm në letër (rreth 100 dpi): madhësitë e teksteve të renderer-it mbeten si në ekran. */
export const PX_PER_PAPER_MM = 4;

type M = [number, number, number, number, number, number];
const IDENT: M = [1, 0, 0, 1, 0, 0];
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

interface Sub {
  pts: Vec[];
  closed: boolean;
}

interface State {
  m: M;
  strokeStyle: string;
  fillStyle: string;
  lineWidth: number;
  globalAlpha: number;
  dash: number[];
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
}

const ARC_STEP = Math.PI / 24;

let measureCtx: CanvasRenderingContext2D | null | undefined;
function measure(font: string, text: string, px: number): number {
  if (measureCtx === undefined) {
    try {
      measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    } catch {
      measureCtx = null;
    }
  }
  if (measureCtx) {
    measureCtx.font = font;
    return measureCtx.measureText(text).width;
  }
  return text.length * px * 0.56;
}

export class Recorder {
  readonly shapes: Shape[] = [];
  private st: State = {
    m: IDENT,
    strokeStyle: '#000000',
    fillStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1,
    dash: [],
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  };
  private stack: State[] = [];
  private subs: Sub[] = [];
  private cur: Sub | null = null;
  // pozicioni i fundit, në koordinatat e ekranit pa transformim (për arcTo dhe H/V të SVG)
  private last: Vec = { x: 0, y: 0 };

  /** `toWorld` kthen pikselat e ekranit në mm të botës (Viewport.toWorld). */
  constructor(private toWorld: (p: Vec) => Vec, private pxPerMm: number) {}

  // ---- gjendja ----
  get strokeStyle() { return this.st.strokeStyle; }
  set strokeStyle(v: string) { this.st.strokeStyle = String(v); }
  get fillStyle() { return this.st.fillStyle; }
  set fillStyle(v: string) { this.st.fillStyle = String(v); }
  get lineWidth() { return this.st.lineWidth; }
  set lineWidth(v: number) { this.st.lineWidth = v; }
  get globalAlpha() { return this.st.globalAlpha; }
  set globalAlpha(v: number) { this.st.globalAlpha = v; }
  get font() { return this.st.font; }
  set font(v: string) { this.st.font = v; }
  get textAlign() { return this.st.textAlign; }
  set textAlign(v: CanvasTextAlign) { this.st.textAlign = v; }
  get textBaseline() { return this.st.textBaseline; }
  set textBaseline(v: CanvasTextBaseline) { this.st.textBaseline = v; }
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';

  save(): void {
    this.stack.push({ ...this.st, dash: [...this.st.dash] });
  }
  restore(): void {
    const s = this.stack.pop();
    if (s) this.st = s;
  }
  setLineDash(d: number[]): void {
    this.st.dash = [...d];
  }
  getLineDash(): number[] {
    return [...this.st.dash];
  }
  translate(x: number, y: number): void {
    this.st.m = mul(this.st.m, [1, 0, 0, 1, x, y]);
  }
  rotate(a: number): void {
    const c = Math.cos(a), s = Math.sin(a);
    this.st.m = mul(this.st.m, [c, s, -s, c, 0, 0]);
  }
  scale(x: number, y: number): void {
    this.st.m = mul(this.st.m, [x, 0, 0, y, 0, 0]);
  }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.st.m = [a, b, c, d, e, f];
  }
  clip(): void {
    // pa prerje: eksporti tregon formën e plotë
  }
  measureText(text: string): { width: number } {
    return { width: measure(this.st.font, text, this.fontPx()) };
  }

  // ---- rrugët ----
  private pt(x: number, y: number): Vec {
    const m = this.st.m;
    return this.toWorld({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  }
  beginPath(): void {
    this.subs = [];
    this.cur = null;
  }
  moveTo(x: number, y: number): void {
    this.cur = { pts: [this.pt(x, y)], closed: false };
    this.subs.push(this.cur);
    this.last = { x, y };
  }
  lineTo(x: number, y: number): void {
    if (!this.cur) return this.moveTo(x, y);
    this.cur.pts.push(this.pt(x, y));
    this.last = { x, y };
  }
  closePath(): void {
    if (this.cur) {
      this.cur.closed = true;
      const first = this.cur.pts[0];
      this.cur = { pts: [first], closed: false };
      this.subs.push(this.cur);
    }
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }
  arc(cx: number, cy: number, r: number, a0: number, a1: number, ccw = false): void {
    let sweep = a1 - a0;
    if (!ccw && sweep < 0) sweep = (sweep % (2 * Math.PI)) + 2 * Math.PI;
    if (ccw && sweep > 0) sweep = (sweep % (2 * Math.PI)) - 2 * Math.PI;
    if (Math.abs(a1 - a0) >= 2 * Math.PI - 1e-9) sweep = ccw ? -2 * Math.PI : 2 * Math.PI;
    const n = Math.max(2, Math.ceil(Math.abs(sweep) / ARC_STEP));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (sweep * i) / n;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0 && this.cur) this.lineTo(x, y);
      else if (i === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
    if (Math.abs(sweep) >= 2 * Math.PI - 1e-9 && this.cur) (this.cur as Sub & { circle?: { cx: number; cy: number; r: number } }).circle = { cx, cy, r };
  }
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void {
    // qoshe e rrumbullakët: tangjentet nga pika e fundit
    const p0 = this.last;
    const v1 = { x: p0.x - x1, y: p0.y - y1 }, v2 = { x: x2 - x1, y: y2 - y1 };
    const l1 = Math.hypot(v1.x, v1.y), l2 = Math.hypot(v2.x, v2.y);
    const cross = v1.x * v2.y - v1.y * v2.x;
    if (!l1 || !l2 || !r || Math.abs(cross) < 1e-9) return this.lineTo(x1, y1);
    const ang = Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (l1 * l2))));
    const d = r / Math.tan(ang / 2);
    const t1 = { x: x1 + (v1.x / l1) * d, y: y1 + (v1.y / l1) * d };
    const t2 = { x: x1 + (v2.x / l2) * d, y: y1 + (v2.y / l2) * d };
    this.lineTo(t1.x, t1.y);
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      // Bezier kuadratik me pikën e qoshes: mjaft afër harkut për eksport
      const t = i / steps, u = 1 - t;
      this.lineTo(u * u * t1.x + 2 * u * t * x1 + t * t * t2.x, u * u * t1.y + 2 * u * t * y1 + t * t * t2.y);
    }
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    const p0 = this.last;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8, u = 1 - t;
      this.lineTo(u * u * p0.x + 2 * u * t * cx + t * t * x, u * u * p0.y + 2 * u * t * cy + t * t * y);
    }
  }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    const p0 = this.last;
    for (let i = 1; i <= 12; i++) {
      const t = i / 12, u = 1 - t;
      this.lineTo(
        u * u * u * p0.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x,
        u * u * u * p0.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y,
      );
    }
  }

  /** Rrugë SVG (simbolet e librarisë), vizatuar me transformimin aktual. */
  svgPath(d: string, fill: boolean): void {
    this.beginPath();
    tracePath(this, d);
    if (fill) this.fill();
    else this.stroke();
  }

  // ---- vizatimi ----
  private uniformScale(): number | null {
    const m = this.st.m;
    const sx = Math.hypot(m[0], m[1]), sy = Math.hypot(m[2], m[3]);
    return Math.abs(sx - sy) < 1e-6 * Math.max(sx, sy, 1) ? sx : null;
  }
  private emit(kind: 'stroke' | 'fill'): void {
    const color = kind === 'stroke' ? this.st.strokeStyle : this.st.fillStyle;
    const k = this.uniformScale() ?? 1;
    const base = {
      stroke: kind === 'stroke' ? color : undefined,
      fill: kind === 'fill' ? color : undefined,
      alpha: this.st.globalAlpha * colorAlpha(color),
      dash: kind === 'stroke' && this.st.dash.length > 0,
      width: this.st.lineWidth * k,
    };
    for (const s of this.subs) {
      if (s.pts.length < 2) continue;
      const circle = (s as Sub & { circle?: { cx: number; cy: number; r: number } }).circle;
      const sc = this.uniformScale();
      if (circle && sc !== null) {
        this.shapes.push({ t: 'circle', c: this.pt(circle.cx, circle.cy), r: (circle.r * sc) / this.pxPerMm, ...base });
        continue;
      }
      if (kind === 'fill' && s.pts.length < 3) continue;
      this.shapes.push({ t: 'path', pts: s.pts, closed: s.closed || kind === 'fill', ...base });
    }
  }
  stroke(p?: unknown): void {
    if (p) return;
    this.emit('stroke');
  }
  fill(p?: unknown): void {
    if (p) return;
    this.emit('fill');
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    if (!w || !h) return;
    const keep = [this.subs, this.cur] as const;
    this.beginPath();
    this.rect(x, y, w, h);
    this.emit('fill');
    [this.subs, this.cur] = keep;
  }
  strokeRect(x: number, y: number, w: number, h: number): void {
    const keep = [this.subs, this.cur] as const;
    this.beginPath();
    this.rect(x, y, w, h);
    this.emit('stroke');
    [this.subs, this.cur] = keep;
  }
  clearRect(): void {}

  private fontPx(): number {
    const m = /(\d+(?:\.\d+)?)px/.exec(this.st.font);
    return m ? Number(m[1]) : 10;
  }
  fillText(text: string, x: number, y: number): void {
    const px = this.fontPx();
    const m = this.st.m;
    const k = Math.hypot(m[0], m[1]);
    // këndi në ekran (Y poshtë) bëhet kënd kundër akrepave në botë (Y lart)
    const angle = (-Math.atan2(m[1], m[0]) * 180) / Math.PI;
    const al = this.st.textAlign;
    const bl = this.st.textBaseline;
    this.shapes.push({
      t: 'text',
      text,
      p: this.pt(x, y),
      size: (px * k) / this.pxPerMm,
      w: (measure(this.st.font, text, px) * k) / this.pxPerMm,
      angle: Math.abs(angle) < 1e-9 ? 0 : angle,
      align: al === 'center' ? 'center' : al === 'right' || al === 'end' ? 'right' : 'left',
      base: bl === 'middle' ? 'middle' : bl === 'top' || bl === 'hanging' ? 'top' : bl === 'bottom' || bl === 'ideographic' ? 'bottom' : 'baseline',
      color: this.st.fillStyle,
      bold: /\b(600|700|800|900|bold)\b/.test(this.st.font),
      alpha: this.st.globalAlpha * colorAlpha(this.st.fillStyle),
    });
  }
  strokeText(): void {
    // kontura e bardhë pas tekstit: vetëm për ekranin
  }
}

/** Ngjyra si [r, g, b] 0–255 nga #rgb, #rrggbb ose rgb()/rgba(). */
export function parseColor(c: string | undefined): [number, number, number] {
  if (!c) return [0, 0, 0];
  const s = c.trim();
  if (s.startsWith('#')) {
    const h = s.length === 4 ? [...s.slice(1)].map((x) => x + x).join('') : s.slice(1, 7);
    const n = parseInt(h, 16);
    return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [0, 0, 0];
  }
  const m = /rgba?\(([^)]+)\)/.exec(s);
  if (m) {
    const [r, g, b] = m[1].split(',').map((v) => Number(v.trim()));
    return [r || 0, g || 0, b || 0];
  }
  return [0, 0, 0];
}

function colorAlpha(c: string): number {
  const m = /rgba\(([^)]+)\)/.exec(c);
  if (!m) return 1;
  const a = Number(m[1].split(',')[3]);
  return Number.isFinite(a) ? a : 1;
}

// ---- rrugët SVG ----

interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
}

/** Ndjek një rrugë SVG (M L H V Q C A Z, të mëdha dhe të vogla) mbi `sink`. */
export function tracePath(sink: PathSink, d: string): void {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd = '';
  let x = 0, y = 0, sx = 0, sy = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') {
      sink.closePath();
      x = sx; y = sy;
      continue;
    }
    if (i >= tokens.length || /[a-zA-Z]/.test(tokens[i])) {
      if (C !== 'Z') i++; // komandë pa numra: kapërceje
      continue;
    }
    if (C === 'M') {
      x = num() + (rel ? x : 0); y = num() + (rel ? y : 0);
      sx = x; sy = y;
      sink.moveTo(x, y);
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') {
      x = num() + (rel ? x : 0); y = num() + (rel ? y : 0);
      sink.lineTo(x, y);
    } else if (C === 'H') {
      x = num() + (rel ? x : 0);
      sink.lineTo(x, y);
    } else if (C === 'V') {
      y = num() + (rel ? y : 0);
      sink.lineTo(x, y);
    } else if (C === 'Q') {
      const cx = num() + (rel ? x : 0), cy = num() + (rel ? y : 0);
      x = num() + (rel ? x : 0); y = num() + (rel ? y : 0);
      sink.quadraticCurveTo(cx, cy, x, y);
    } else if (C === 'C') {
      const c1x = num() + (rel ? x : 0), c1y = num() + (rel ? y : 0);
      const c2x = num() + (rel ? x : 0), c2y = num() + (rel ? y : 0);
      x = num() + (rel ? x : 0); y = num() + (rel ? y : 0);
      sink.bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
    } else if (C === 'A') {
      const rx = num(), ry = num(), rot = num(), large = num(), sweep = num();
      const nx = num() + (rel ? x : 0), ny = num() + (rel ? y : 0);
      for (const p of arcPoints(x, y, rx, ry, rot, !!large, !!sweep, nx, ny)) sink.lineTo(p.x, p.y);
      x = nx; y = ny;
    } else {
      i++;
    }
  }
}

/** Pikat e një harku SVG (parametrizimi me skaje → me qendër, sipas specifikimit SVG). */
function arcPoints(x1: number, y1: number, rx: number, ry: number, rotDeg: number, large: boolean, sweep: boolean, x2: number, y2: number): Vec[] {
  if (!rx || !ry) return [{ x: x2, y: y2 }];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  let co = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) co = -co;
  const cxp = (co * rx * yp) / ry, cyp = (-co * ry * xp) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(2, Math.ceil(Math.abs(dt) / ARC_STEP));
  const out: Vec[] = [];
  for (let i = 1; i <= n; i++) {
    const t = t1 + (dt * i) / n;
    const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    out.push({ x: cos * ex - sin * ey + cx, y: sin * ex + cos * ey + cy });
  }
  out[out.length - 1] = { x: x2, y: y2 };
  return out;
}
