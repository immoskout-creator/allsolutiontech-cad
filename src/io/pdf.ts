import type { Doc, Vec } from '../core/types';
import { recordDrawing, type Drawing } from './export';
import { latin1 } from './dxf';
import { PX_PER_PAPER_MM, parseColor, type Shape } from './recorder';

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

/** Fleta dhe shkalla: shkalla e projektit nëse nxë në A4–A0, përndryshe shkalla standarde më e afërt që nxë. */
export function chooseSheet(w: number, h: number, docScale: number): Sheet {
  const scales = [docScale, ...STD_SCALES.filter((s) => s > docScale)];
  for (const scale of scales)
    for (const paper of PAPERS) {
      const fw = paper.w - 2 * MARGIN - 2 * PAD;
      const fh = paper.h - 2 * MARGIN - 2 * PAD - TITLE_H;
      if (w / scale <= fw && h / scale <= fh) return { paper, scale };
    }
  const paper = PAPERS[PAPERS.length - 1];
  const fw = paper.w - 2 * MARGIN - 2 * PAD;
  const fh = paper.h - 2 * MARGIN - 2 * PAD - TITLE_H;
  return { paper, scale: Math.ceil(Math.max(w / fw, h / fh)) };
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
  labels: { project: string; scale: string; date: string; sheet: string };
}

/** Përmbajtja e faqes (operatorët PDF) dhe madhësia e fletës. */
export function drawingToPdf(drawing: Drawing, docScale: number, page: PageInput): string {
  const b = drawing.bounds ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  const { paper, scale } = chooseSheet(b.maxX - b.minX, b.maxY - b.minY, docScale);
  const W = paper.w, H = paper.h;
  const ops: string[] = [];

  // vizatimi në qendër të hapësirës mbi tabelën e titullit
  const areaX = MARGIN + PAD, areaY = MARGIN + PAD + TITLE_H;
  const areaW = W - 2 * MARGIN - 2 * PAD, areaH = H - 2 * MARGIN - 2 * PAD - TITLE_H;
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

  // korniza dhe tabela e titullit
  const P = (mm: number) => n(mm * PT);
  ops.push('[] 0 d 0 0 0 RG 0 0 0 rg');
  ops.push(`${P(0.5)} w ${P(MARGIN)} ${P(MARGIN)} ${P(W - 2 * MARGIN)} ${P(H - 2 * MARGIN)} re S`);
  const tbW = Math.min(190, W - 2 * MARGIN);
  const tx = W - MARGIN - tbW, ty = MARGIN;
  ops.push(`${P(0.35)} w ${P(tx)} ${P(ty)} ${P(tbW)} ${P(TITLE_H)} re S`);
  // logoja: katror portokalli me "AST"
  ops.push(`0.961 0.62 0.259 rg ${P(tx + 3)} ${P(ty + 3)} ${P(18)} ${P(18)} re f`);
  ops.push(`BT 1 1 1 rg /F2 ${P(6.2)} Tf ${P(tx + 4.6)} ${P(ty + 9.8)} Td (AST) Tj ET`);
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
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${P(W)} ${P(H)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Title ${pdfString(page.title)} /Producer ${pdfString(page.product)} /Creator (AllSolutionTech CAD) >>`,
  ];
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

/** Plani si skedar PDF. */
export function docToPdf(doc: Doc, page: PageInput): Uint8Array<ArrayBuffer> {
  return latin1(drawingToPdf(recordDrawing(doc), doc.scale, page));
}
