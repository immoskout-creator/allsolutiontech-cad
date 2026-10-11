import type { Doc, ProjectLogo, Vec } from '../core/types';
import { recordDrawing, type Drawing } from './export';
import { latin1 } from './dxf';
import { PX_PER_PAPER_MM, Recorder, parseColor, type Shape } from './recorder';

/**
 * PDF vektorial për printim: plani në shkallë të vërtetë (p.sh. 1:50) në fletën më të vogël A4–A0 ku nxë,
 * me kornizë dhe tabelë titulli (logoja AST, programi, projekti, shkalla, data, fleta).
 * Pa biblioteka: PDF 1.4 me shkronjat standarde Helvetica.
 */

const PT = 72 / 25.4;
export const PAPERS = [
  { name: 'A4', w: 297, h: 210 },
  { name: 'A3', w: 420, h: 297 },
  { name: 'A2', w: 594, h: 420 },
  { name: 'A1', w: 841, h: 594 },
  { name: 'A0', w: 1189, h: 841 },
] as const;
const MARGIN = 10;
const PAD = 6;
const TITLE_H = 24;
const STD_SCALES = [20, 50, 100, 200, 500, 1000, 2000];

export interface Sheet {
  paper: (typeof PAPERS)[number];
  scale: number;
}

// legjenda e simboleve: kolona djathtas, mbi tabelën e titullit
const LEG_W = 58;
const LEG_ROW = 6.5;
const LEG_HEAD = 8;

/** Gjerësia e legjendës në një fletë me lartësi h për n rreshta (0 kur s'ka legjendë). */
export function legendWidth(n: number, h: number): number {
  if (!n) return 0;
  const perCol = Math.max(1, Math.floor((h - 2 * MARGIN - 2 * PAD - TITLE_H - LEG_HEAD) / LEG_ROW));
  return Math.ceil(n / perCol) * LEG_W + PAD;
}

/** Fleta dhe shkalla: shkalla e projektit nëse nxë në A4–A0, përndryshe shkalla standarde më e afërt që nxë. */
export function chooseSheet(w: number, h: number, docScale: number, legendRows = 0): Sheet {
  const scales = [docScale, ...STD_SCALES.filter((s) => s > docScale)];
  const room = (paper: (typeof PAPERS)[number]) => ({
    fw: paper.w - 2 * MARGIN - 2 * PAD - legendWidth(legendRows, paper.h),
    fh: paper.h - 2 * MARGIN - 2 * PAD - TITLE_H,
  });
  for (const scale of scales)
    for (const paper of PAPERS) {
      const { fw, fh } = room(paper);
      if (w / scale <= fw && h / scale <= fh) return { paper, scale };
    }
  const paper = PAPERS[PAPERS.length - 1];
  const { fw, fh } = room(paper);
  return { paper, scale: Math.ceil(Math.max(w / Math.max(fw, 50), h / fh)) };
}

/** Një rresht i legjendës: figura e simbolit (rrugë SVG në njësitë e tij), kodi, emri dhe sasia. */
export interface LegendItem {
  parts: { d: string; fill?: boolean }[];
  code: string;
  name: string;
  qty: number;
  color?: string;
}

/** Figura e simbolit si forma në mm letre (Y poshtë), e futur në katrorin size × size me qendër (cx, cy). */
function legendIcon(parts: LegendItem['parts'], cx: number, cy: number, size: number): Shape[] {
  const rec = new Recorder((p) => p, 1);
  for (const part of parts) rec.svgPath(part.d, !!part.fill);
  const pts = rec.shapes.flatMap((s) => (s.t === 'path' ? s.pts : s.t === 'circle' ? [{ x: s.c.x - s.r, y: s.c.y - s.r }, { x: s.c.x + s.r, y: s.c.y + s.r }] : []));
  if (!pts.length) return [];
  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  const k = size / Math.max(maxX - minX, maxY - minY, 1e-6);
  const ox = cx - ((minX + maxX) / 2) * k, oy = cy - ((minY + maxY) / 2) * k;
  const map = (p: Vec): Vec => ({ x: ox + p.x * k, y: oy + p.y * k });
  return rec.shapes.flatMap((s): Shape[] =>
    s.t === 'path' ? [{ ...s, pts: s.pts.map(map) }] : s.t === 'circle' ? [{ ...s, c: map(s.c), r: s.r * k }] : [],
  );
}

const n = (v: number) => (Math.abs(v) < 1e-6 ? '0' : v.toFixed(2).replace(/\.?0+$/, ''));

/** Ngjyra e përzier me të bardhën sipas tejdukshmërisë, si komponentë 0–1. */
function rgb(color: string | undefined, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  return parseColor(color).map((c) => n((255 - a * (255 - c)) / 255)).join(' ');
}

function pdfString(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    const b = c < 0x100 ? ch : c === 0x2014 || c === 0x2013 ? '-' : '?';
    out += b === '(' || b === ')' || b === '\\' ? `\\${b}` : b;
  }
  return `(${out})`;
}

interface PageInput {
  title: string;
  product: string;
  date: string;
  labels: { project: string; scale: string; date: string; sheet: string; legend?: string };
  /** Simbolet e përdorura në plan, për legjendën automatike. */
  legend?: LegendItem[];
  /** Logoja e përdoruesit (JPEG); pa të vizatohet logoja AST. */
  logo?: ProjectLogo;
}

/** Përmbajtja e faqes (operatorët PDF) dhe madhësia e fletës. */
export function drawingToPdf(drawing: Drawing, docScale: number, page: PageInput): string {
  const b = drawing.bounds ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  const legend = page.legend ?? [];
  const { paper, scale } = chooseSheet(b.maxX - b.minX, b.maxY - b.minY, docScale, legend.length);
  const W = paper.w, H = paper.h;
  const ops: string[] = [];
  const legW = legendWidth(legend.length, H);

  // vizatimi në qendër të hapësirës mbi tabelën e titullit, majtas legjendës
  const areaX = MARGIN + PAD, areaY = MARGIN + PAD + TITLE_H;
  const areaW = W - 2 * MARGIN - 2 * PAD - legW, areaH = H - 2 * MARGIN - 2 * PAD - TITLE_H;
  const offX = areaX + (areaW - (b.maxX - b.minX) / scale) / 2;
  const offY = areaY + (areaH - (b.maxY - b.minY) / scale) / 2;
  const k = (1 / scale) * PT; // mm bote → pt
  const X = (p: Vec) => (offX + (p.x - b.minX) / scale) * PT;
  const Y = (p: Vec) => (offY + (p.y - b.minY) / scale) * PT;

  const line = (s: Shape & { t: 'path' | 'circle' }) => {
    const wmm = Math.min(1, Math.max(0.1, s.width / PX_PER_PAPER_MM));
    ops.push(`${n(wmm * PT)} w`);
    ops.push(s.dash ? `[${n(2 * PT)} ${n(1 * PT)}] 0 d` : '[] 0 d');
  };
  const pathOps = (pts: Vec[], closed: boolean) => {
    pts.forEach((p, i) => ops.push(`${n(X(p))} ${n(Y(p))} ${i ? 'l' : 'm'}`));
    if (closed) ops.push('h');
  };

  ops.push('1 J 1 j');
  for (const { shapes } of drawing.layers) {
    for (const s of shapes) {
      if (s.t === 'text') {
        if (!s.text.trim()) continue;
        const fs = s.size * k;
        const font = s.bold ? '/F2' : '/F1';
        const w = s.w * k * 0.95;
        const dx = s.align === 'center' ? -w / 2 : s.align === 'right' ? -w : 0;
        const dy = s.base === 'middle' ? -0.35 * fs : s.base === 'top' ? -0.75 * fs : s.base === 'bottom' ? 0.22 * fs : 0;
        const a = (s.angle * Math.PI) / 180;
        const c = Math.cos(a), sn = Math.sin(a);
        ops.push(`BT ${rgb(s.color, s.alpha)} rg ${font} ${n(fs)} Tf ${n(c)} ${n(sn)} ${n(-sn)} ${n(c)} ${n(X(s.p))} ${n(Y(s.p))} Tm ${n(dx)} ${n(dy)} Td ${pdfString(s.text)} Tj ET`);
        continue;
      }
      if (s.alpha < 0.02) continue;
      if (s.t === 'circle') {
        const cx = X(s.c), cy = Y(s.c), r = s.r * k, m = 0.5523 * r;
        ops.push(`${n(cx + r)} ${n(cy)} m`);
        ops.push(`${n(cx + r)} ${n(cy + m)} ${n(cx + m)} ${n(cy + r)} ${n(cx)} ${n(cy + r)} c`);
        ops.push(`${n(cx - m)} ${n(cy + r)} ${n(cx - r)} ${n(cy + m)} ${n(cx - r)} ${n(cy)} c`);
        ops.push(`${n(cx - r)} ${n(cy - m)} ${n(cx - m)} ${n(cy - r)} ${n(cx)} ${n(cy - r)} c`);
        ops.push(`${n(cx + m)} ${n(cy - r)} ${n(cx + r)} ${n(cy - m)} ${n(cx + r)} ${n(cy)} c h`);
      } else pathOps(s.pts, s.closed);
      if (s.fill) ops.push(`${rgb(s.fill, s.alpha)} rg f`);
      else {
        line(s);
        ops.push(`${rgb(s.stroke, s.alpha)} RG S`);
      }
    }
  }

  const P = (mm: number) => n(mm * PT);

  // legjenda: simbolet e planit me figurën, kodin, emrin dhe sasinë, kolonë pas kolone
  if (legend.length) {
    const top = H - MARGIN - PAD; // mm nga poshtë
    const x0 = W - MARGIN - legW + PAD / 2;
    const perCol = Math.max(1, Math.floor((top - (MARGIN + TITLE_H + PAD) - LEG_HEAD) / LEG_ROW));
    const short = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}...` : s);
    ops.push('[] 0 d 0 0 0 RG');
    ops.push(`${P(0.2)} w ${P(x0 - PAD / 2)} ${P(MARGIN + TITLE_H)} m ${P(x0 - PAD / 2)} ${P(H - MARGIN)} l S`);
    ops.push(`BT 0 0 0 rg /F2 ${P(3.2)} Tf ${P(x0 + 1)} ${P(top - 4.5)} Td ${pdfString(page.labels.legend ?? 'Legend')} Tj ET`);
    legend.forEach((it, i) => {
      const col = Math.floor(i / perCol), row = i % perCol;
      const x = x0 + col * LEG_W;
      const yMid = top - LEG_HEAD - row * LEG_ROW - LEG_ROW / 2; // mm nga poshtë
      // figura: koordinatat e ikonës janë me Y poshtë rreth (0, 0)
      const IX = (p: Vec) => n((x + 4 + p.x) * PT), IY = (p: Vec) => n((yMid - p.y) * PT);
      for (const s of legendIcon(it.parts, 0, 0, 4.6)) {
        if (s.t === 'circle') {
          const cx = (x + 4 + s.c.x) * PT, cy = (yMid - s.c.y) * PT, r = s.r * PT, m = 0.5523 * r;
          ops.push(`${n(cx + r)} ${n(cy)} m ${n(cx + r)} ${n(cy + m)} ${n(cx + m)} ${n(cy + r)} ${n(cx)} ${n(cy + r)} c ${n(cx - m)} ${n(cy + r)} ${n(cx - r)} ${n(cy + m)} ${n(cx - r)} ${n(cy)} c ${n(cx - r)} ${n(cy - m)} ${n(cx - m)} ${n(cy - r)} ${n(cx)} ${n(cy - r)} c ${n(cx + m)} ${n(cy - r)} ${n(cx + r)} ${n(cy - m)} ${n(cx + r)} ${n(cy)} c h`);
        } else if (s.t === 'path') {
          s.pts.forEach((p, j) => ops.push(`${IX(p)} ${IY(p)} ${j ? 'l' : 'm'}`));
          if (s.closed) ops.push('h');
        } else continue;
        ops.push(s.fill ? `${rgb(it.color, 1)} rg f` : `${P(0.22)} w ${rgb(it.color, 1)} RG S`);
      }
      ops.push(`BT 0.35 0.35 0.35 rg /F1 ${P(1.7)} Tf ${P(x + 9)} ${P(yMid + 0.9)} Td ${pdfString(it.code)} Tj ET`);
      ops.push(`BT 0 0 0 rg /F1 ${P(2.2)} Tf ${P(x + 9)} ${P(yMid - 1.9)} Td ${pdfString(short(it.name, 34))} Tj ET`);
      ops.push(`BT 0 0 0 rg /F2 ${P(2.4)} Tf ${P(x + LEG_W - 7)} ${P(yMid - 0.8)} Td ${pdfString(`${it.qty}x`)} Tj ET`);
    });
  }

  // korniza dhe tabela e titullit
  ops.push('[] 0 d 0 0 0 RG 0 0 0 rg');
  ops.push(`${P(0.5)} w ${P(MARGIN)} ${P(MARGIN)} ${P(W - 2 * MARGIN)} ${P(H - 2 * MARGIN)} re S`);
  const tbW = Math.min(190, W - 2 * MARGIN);
  const tx = W - MARGIN - tbW, ty = MARGIN;
  ops.push(`${P(0.35)} w ${P(tx)} ${P(ty)} ${P(tbW)} ${P(TITLE_H)} re S`);
  // logoja e përdoruesit brenda katrorit 18 × 18 mm, me përpjesëtimet e veta; pa të katrori portokalli me "AST"
  const jpeg = page.logo ? jpegBytes(page.logo.jpeg) : null;
  if (page.logo && jpeg) {
    const k = 18 / Math.max(page.logo.w, page.logo.h);
    const lw = page.logo.w * k, lh = page.logo.h * k;
    ops.push(`q ${P(lw)} 0 0 ${P(lh)} ${P(tx + 3 + (18 - lw) / 2)} ${P(ty + 3 + (18 - lh) / 2)} cm /Im1 Do Q`);
  } else {
    ops.push(`0.961 0.62 0.259 rg ${P(tx + 3)} ${P(ty + 3)} ${P(18)} ${P(18)} re f`);
    ops.push(`BT 1 1 1 rg /F2 ${P(6.2)} Tf ${P(tx + 4.6)} ${P(ty + 9.8)} Td (AST) Tj ET`);
  }
  const cols = [tx + 24, tx + 24 + (tbW - 24) * 0.58];
  ops.push(`${P(0.2)} w ${P(tx + 24)} ${P(ty)} m ${P(tx + 24)} ${P(ty + TITLE_H)} l S`);
  ops.push(`${P(cols[1])} ${P(ty)} m ${P(cols[1])} ${P(ty + TITLE_H)} l S`);
  ops.push(`${P(tx + 24)} ${P(ty + 12)} m ${P(tx + tbW)} ${P(ty + 12)} l S`);
  const cell = (x: number, y: number, label: string, value: string, size = 3.4) => {
    ops.push(`BT 0.4 0.4 0.4 rg /F1 ${P(1.9)} Tf ${P(x + 2)} ${P(y + 8.2)} Td ${pdfString(label)} Tj ET`);
    ops.push(`BT 0 0 0 rg /F2 ${P(size)} Tf ${P(x + 2)} ${P(y + 3)} Td ${pdfString(value)} Tj ET`);
  };
  const short = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}...` : s);
  cell(tx + 24, ty + 12, 'AllSolutionTech', short(page.product, 34), 3);
  cell(tx + 24, ty, page.labels.project, short(page.title, 34));
  cell(cols[1], ty + 12, page.labels.scale, `1:${scale}`);
  cell(cols[1], ty, `${page.labels.date} / ${page.labels.sheet}`, `${page.date}  ${paper.name}`, 3);

  const content = ops.join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${P(W)} ${P(H)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >>${jpeg ? ' /XObject << /Im1 8 0 R >>' : ''} >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Title ${pdfString(page.title)} /Producer ${pdfString(page.product)} /Creator (AllSolutionTech CAD) >>`,
  ];
  if (page.logo && jpeg)
    objs.push(`<< /Type /XObject /Subtype /Image /Width ${page.logo.w} /Height ${page.logo.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n${jpeg}\nendstream`);
  let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

/** Bajtet e JPEG-ut nga data URL, si varg latin1 (një shkronjë për bajt), ose null. */
function jpegBytes(dataUrl: string): string | null {
  const m = /^data:image\/jpeg;base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  try {
    return atob(m[1]);
  } catch {
    return null;
  }
}

/** Plani si skedar PDF. */
export function docToPdf(doc: Doc, page: PageInput): Uint8Array<ArrayBuffer> {
  return latin1(drawingToPdf(recordDrawing(doc), doc.scale, { ...page, logo: page.logo ?? doc.logo }));
}
