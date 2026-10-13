import type { Doc, ProjectLogo, Vec } from '../core/types';
import { recordDrawing, type Drawing } from './export';
import { latin1 } from './dxf';
import { PX_PER_PAPER_MM, Recorder, parseColor, type Shape } from './recorder';

/**
 * PDF vektorial për printim: plani në shkallë të vërtetë (p.sh. 1:50) në fletën më të vogël A4–A0 ku nxë,
 * me kornizë dhe kutinë e titullit (firma, projektuesi me firmën, objekti, vizatimi, shkalla, faqja) në çdo faqe.
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
/** Lartësia më e vogël e kutisë së titullit; rritet sipas fushave të plotësuara. */
const TITLE_MIN = 22;
const STD_SCALES = [20, 50, 100, 200, 500, 1000, 2000];

export interface Sheet {
  paper: (typeof PAPERS)[number];
  scale: number;
}

// legjenda e simboleve: kolona djathtas, mbi tabelën e titullit
// (një kolonë; ato që s'nxënë vazhdojnë në faqe A4 pas planit, pa u zvogëluar)
const LEG_W = 68;
const LEG_ROW = 11;
const LEG_HEAD = 9;

/** Gjerësia e legjendës në fletë (0 kur s'ka legjendë). */
export function legendWidth(n: number): number {
  return n ? LEG_W + PAD : 0;
}

/** Sa rreshta legjende nxë kolona e fletës me lartësi h. */
const legendPerColumn = (h: number, titleH: number) => Math.max(1, Math.floor((h - 2 * MARGIN - 2 * PAD - titleH - LEG_HEAD) / LEG_ROW));

/** Fleta dhe shkalla: shkalla e projektit nëse nxë në A4–A0, përndryshe shkalla standarde më e afërt që nxë. */
export function chooseSheet(w: number, h: number, docScale: number, legendRows = 0, titleH = TITLE_MIN): Sheet {
  const scales = [docScale, ...STD_SCALES.filter((s) => s > docScale)];
  const room = (paper: (typeof PAPERS)[number]) => ({
    fw: paper.w - 2 * MARGIN - 2 * PAD - legendWidth(legendRows),
    fh: paper.h - 2 * MARGIN - 2 * PAD - titleH,
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
    // WinAnsi: vija e mesme dhe e gjatë kanë vendin e tyre (0x96, 0x97); të tjerat jashtë Latin-1 bëhen "?"
    const b = c < 0x100 ? ch : c === 0x2013 ? '\x96' : c === 0x2014 ? '\x97' : c === 0x2026 ? '\x85' : '?';
    out += b === '(' || b === ')' || b === '\\' ? `\\${b}` : b;
  }
  return `(${out})`;
}

/** Një rresht i listës së materialeve në PDF. */
export interface MaterialPdfRow {
  group: string;
  code: string;
  name: string;
  qty: number;
  unit: string;
}

/** Lista e materialeve: faqja 2 (e të tjera nëse s'nxë), pas planit. */
export interface MaterialPdf {
  title: string;
  rows: MaterialPdfRow[];
  labels: { nr: string; code: string; name: string; qty: string; unit: string; total: string; page: string };
  /** Shënimi poshtë tabelës (p.sh. rezerva e kabllove). */
  note?: string;
}

/**
 * Kutia e titullit: firma dhe projektuesi (të ruajtura në program), objekti dhe vizatimi (me projektin).
 * Fushat bosh nuk dalin; shkalla dhe faqja X / N plotësohen vetë.
 */
export interface TitleBox {
  firm?: { name?: string; address?: string; contact?: string; logo?: ProjectLogo };
  designer?: { name?: string; title?: string; signature?: ProjectLogo };
  object?: { name?: string; address?: string; client?: string };
  drawing?: { sheet?: string; number?: string; revision?: string; date?: string; checked?: string };
  labels?: Partial<Record<'designer' | 'object' | 'client' | 'number' | 'revision' | 'date' | 'checked', string>>;
}

export interface PageInput {
  title: string;
  product: string;
  date: string;
  labels: { project: string; scale: string; date: string; sheet: string; legend?: string; legendMore?: string };
  /** Lista e materialeve; pa rreshta faqja 2 nuk shtohet. */
  materials?: MaterialPdf;
  /** Simbolet e përdorura në plan, për legjendën automatike. */
  legend?: LegendItem[];
  /** Logoja e projektit (JPEG); pa të logoja e firmës, pa të logoja AST. */
  logo?: ProjectLogo;
  box?: TitleBox;
}

/** Figurat e PDF-së: /Im1 logoja, /Im2 firma (nënshkrimi) e projektuesit. */
interface PdfImages {
  logo: { img: ProjectLogo; bytes: string } | null;
  signature: { img: ProjectLogo; bytes: string } | null;
}

function pdfImages(page: PageInput): PdfImages {
  const pick = (img?: ProjectLogo) => {
    const bytes = img ? jpegBytes(img.jpeg) : null;
    return img && bytes ? { img, bytes } : null;
  };
  return { logo: pick(page.logo) ?? pick(page.box?.firm?.logo), signature: pick(page.box?.designer?.signature) };
}

/** Përmbajtja e faqes (operatorët PDF) dhe madhësia e fletës. */
export function drawingToPdf(drawing: Drawing, docScale: number, page: PageInput): string {
  const b = drawing.bounds ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  const allLegend = page.legend ?? [];
  const imgs = pdfImages(page);
  const titleH = titleBlock(null, 0, 0, page, imgs, ['', ''], '');
  const { paper, scale } = chooseSheet(b.maxX - b.minX, b.maxY - b.minY, docScale, allLegend.length, titleH);
  const W = paper.w, H = paper.h;
  const ops: string[] = [];
  const legW = legendWidth(allLegend.length);
  const legend = allLegend.slice(0, legendPerColumn(H, titleH));
  const legendRest = allLegend.slice(legend.length);

  // vizatimi në qendër të hapësirës mbi tabelën e titullit, majtas legjendës
  const areaX = MARGIN + PAD, areaY = MARGIN + PAD + titleH;
  const areaW = W - 2 * MARGIN - 2 * PAD - legW, areaH = H - 2 * MARGIN - 2 * PAD - titleH;
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

  // legjenda: simbolet e planit me figurën, kodin, emrin dhe sasinë, në një kolonë djathtas
  if (legend.length) {
    const top = H - MARGIN - PAD; // mm nga poshtë
    const x0 = W - MARGIN - legW + PAD / 2;
    ops.push('[] 0 d 0 0 0 RG');
    ops.push(`${P(0.2)} w ${P(x0 - PAD / 2)} ${P(MARGIN + titleH)} m ${P(x0 - PAD / 2)} ${P(H - MARGIN)} l S`);
    ops.push(`BT 0 0 0 rg /F2 ${P(4)} Tf ${P(x0 + 1)} ${P(top - 5)} Td ${pdfString(page.labels.legend ?? 'Legend')} Tj ET`);
    legend.forEach((it, i) => legendRow(ops, it, x0, top - LEG_HEAD - i * LEG_ROW - LEG_ROW / 2, LEG_W));
  }

  const matPages = materialPages(page, titleH);
  const legPages = legendPages(legendRest, titleH);
  const total = 1 + legPages.length + matPages.length;
  titleBlock(ops, W, H, page, imgs, [page.labels.scale, `1:${scale}`], `${paper.name}${total > 1 ? `  1/${total}` : ''}`);
  const pages = [
    { W, H, content: ops.join('\n') },
    ...legPages.map((items, i) => ({ W: A4P.w, H: A4P.h, content: legendPage(page, items, i + 2, total, imgs, titleH) })),
    ...matPages.map((rows, i) => ({ W: A4P.w, H: A4P.h, content: materialPage(page, rows, i + 2 + legPages.length, total, imgs, titleH) })),
  ];
  return writePdf(pages, page, imgs);
}

/** Një rresht legjende (lartësia LEG_ROW) me mesin në yMid: figura, kodi, emri (deri në 2 rreshta) dhe sasia. */
function legendRow(ops: string[], it: LegendItem, x: number, yMid: number, w: number): void {
  const P = (mm: number) => n(mm * PT);
  const IX = (p: Vec) => n((x + 5 + p.x) * PT), IY = (p: Vec) => n((yMid - p.y) * PT);
  for (const s of legendIcon(it.parts, 0, 0, 7.4)) {
    if (s.t === 'circle') {
      const cx = (x + 5 + s.c.x) * PT, cy = (yMid - s.c.y) * PT, r = s.r * PT, m = 0.5523 * r;
      ops.push(`${n(cx + r)} ${n(cy)} m ${n(cx + r)} ${n(cy + m)} ${n(cx + m)} ${n(cy + r)} ${n(cx)} ${n(cy + r)} c ${n(cx - m)} ${n(cy + r)} ${n(cx - r)} ${n(cy + m)} ${n(cx - r)} ${n(cy)} c ${n(cx - r)} ${n(cy - m)} ${n(cx - m)} ${n(cy - r)} ${n(cx)} ${n(cy - r)} c ${n(cx + m)} ${n(cy - r)} ${n(cx + r)} ${n(cy - m)} ${n(cx + r)} ${n(cy)} c h`);
    } else if (s.t === 'path') {
      s.pts.forEach((p, j) => ops.push(`${IX(p)} ${IY(p)} ${j ? 'l' : 'm'}`));
      if (s.closed) ops.push('h');
    } else continue;
    ops.push(s.fill ? `${rgb(it.color, 1)} rg f` : `${P(0.3)} w ${rgb(it.color, 1)} RG S`);
  }
  const tx = x + 12;
  const qty = `${it.qty}x`;
  const qtyW = qty.length * 3.4 * 0.56;
  const lines = wrap(it.name, w - 12 - qtyW - 3, 3.1, 2);
  ops.push(`BT 0.35 0.35 0.35 rg /F1 ${P(2.4)} Tf ${P(tx)} ${P(yMid + (lines.length > 1 ? 2.9 : 1.6))} Td ${pdfString(it.code)} Tj ET`);
  lines.forEach((l, i) => ops.push(`BT 0 0 0 rg /F1 ${P(3.1)} Tf ${P(tx)} ${P(yMid - (lines.length > 1 ? 0.6 : 1.9) - i * 3.5)} Td ${pdfString(l)} Tj ET`));
  ops.push(`BT 0 0 0 rg /F2 ${P(3.4)} Tf ${P(x + w - qtyW - 1)} ${P(yMid - 1.2)} Td ${pdfString(qty)} Tj ET`);
}

/** Legjenda që s'nxë në fletën e planit: faqe A4 më këmbë me dy kolona. */
function legendPages(items: LegendItem[], titleH: number): LegendItem[][] {
  if (!items.length) return [];
  const per = 2 * Math.max(1, Math.floor((A4P.h - 2 * MARGIN - MAT_HEAD - 6 - titleH - 4) / LEG_ROW));
  const out: LegendItem[][] = [];
  for (let i = 0; i < items.length; i += per) out.push(items.slice(i, i + per));
  return out;
}

function legendPage(page: PageInput, items: LegendItem[], no: number, total: number, imgs: PdfImages, titleH: number): string {
  const ops: string[] = ['1 J 1 j'];
  const top = pageHead(ops, page, `${page.labels.legend ?? 'Legend'}${page.labels.legendMore ? ` (${page.labels.legendMore})` : ''}`, no, total, imgs);
  const per = Math.ceil(items.length / 2) || 1;
  const colW = (A4P.w - 2 * MARGIN - 8) / 2;
  const perCol = Math.max(per, 1);
  items.forEach((it, i) => {
    const col = Math.floor(i / perCol), row = i % perCol;
    legendRow(ops, it, MARGIN + 4 + col * colW, top - MAT_HEAD - 6 - row * LEG_ROW - LEG_ROW / 2, colW - 4);
  });
  titleBlock(ops, A4P.w, A4P.h, page, imgs, [pageWord(page), `${no} / ${total}`], 'A4');
  void titleH;
  return ops.join('\n');
}

/** Fjala "Faqe" nga etiketa "Faqe {n} / {total}". */
const pageWord = (page: PageInput) => (page.materials?.labels.page ?? 'Page {n}').replace(/\s*\{n\}.*$/, '');

/** Koka e faqeve A4 (legjenda e vazhduar, materialet): logoja, programi, titulli; djathtas projekti, data, faqja. */
function pageHead(ops: string[], page: PageInput, title: string, no: number, total: number, imgs: PdfImages): number {
  const W = A4P.w, H = A4P.h;
  const P = (mm: number) => n(mm * PT);
  const text = (x: number, y: number, s: string, size: number, bold = false, gray = 0, right = false) => {
    const dx = right ? -s.length * size * 0.5 : 0;
    ops.push(`BT ${n(gray)} ${n(gray)} ${n(gray)} rg ${bold ? '/F2' : '/F1'} ${P(size)} Tf ${P(x + dx)} ${P(y)} Td ${pdfString(s)} Tj ET`);
  };
  const top = H - MARGIN;
  logoOps(ops, imgs, MARGIN + 4, top - 4 - 14, 14);
  text(MARGIN + 22, top - 9, short(page.product, 60), 3, false, 0.35);
  text(MARGIN + 22, top - 15.5, title, 5.2, true);
  const rx = W - MARGIN - 4;
  text(rx, top - 8, short(page.box?.object?.name || page.title, 40), 3.2, true, 0, true);
  text(rx, top - 13, page.box?.drawing?.date || page.date, 2.8, false, 0.35, true);
  const label = page.materials?.labels.page ?? 'Page {n} / {total}';
  text(rx, top - 18, label.replace('{n}', String(no)).replace('{total}', String(total)), 2.8, true, 0, true);
  ops.push(`0 0 0 RG ${P(0.4)} w ${P(MARGIN)} ${P(top - MAT_HEAD)} m ${P(W - MARGIN)} ${P(top - MAT_HEAD)} l S`);
  return top;
}

/** Ndan tekstin në rreshta që nxënë në gjerësinë w (mm) me shkronja size; i fundit shkurtohet me "...". */
export function wrap(text: string, w: number, size: number, maxLines: number, bold = false): string[] {
  const max = Math.max(4, Math.floor(w / (size * (bold ? 0.56 : 0.5))));
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= max) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines);
    keep[maxLines - 1] = short(`${keep[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, max);
    return keep;
  }
  return lines.map((l) => short(l, max));
}

type TLine = { text: string; size: number; bold?: boolean; gray?: number } | { img: ProjectLogo; name: string; w: number; h: number } | { gap: number };

/**
 * Korniza e fletës dhe kutia e titullit poshtë djathtas: majtas logoja dhe firma (emri, adresa, kontakti),
 * pastaj projektuesi (emri, titulli / licenca, firma si figurë), djathtas objekti, emri i fletës dhe kutitë
 * nr. i vizatimit · rev. · data · shkalla · faqja · kontrolloi. Fushat bosh nuk dalin. Me ops = null vetëm mat
 * lartësinë (e njëjtë në çdo faqe).
 */
function titleBlock(ops: string[] | null, W: number, H: number, page: PageInput, imgs: PdfImages, mid: [string, string], sheet: string): number {
  const P = (mm: number) => n(mm * PT);
  const box = page.box ?? {};
  const L = box.labels ?? {};
  const tbW = 190;
  const firmW = 50, desW = 46;
  const lines = (list: (TLine | null | false | undefined)[]) => list.filter(Boolean) as TLine[];
  const txt = (text: string | undefined, w: number, size: number, max: number, bold = false, gray = 0): TLine[] =>
    text?.trim() ? wrap(text, w, size, max, bold).map((t) => ({ text: t, size, bold, gray })) : [];
  const fit = (img: ProjectLogo, name: string, mw: number, mh: number): TLine => {
    const k = Math.min(mw / img.w, mh / img.h);
    return { img, name, w: img.w * k, h: img.h * k };
  };

  const f = box.firm ?? {}, d = box.designer ?? {}, o = box.object ?? {}, dr = box.drawing ?? {};
  const firm = lines([
    imgs.logo ? fit(imgs.logo.img, 'Im1', firmW - 4, 13) : { gap: 13 },
    ...txt(f.name, firmW - 4, 2.7, 2, true),
    ...txt(f.address, firmW - 4, 2.1, 2, false, 0.25),
    ...txt(f.contact, firmW - 4, 2.1, 2, false, 0.25),
    ...(f.name || f.address || f.contact ? [] : txt(page.product, firmW - 4, 1.6, 2, true, 0.3)),
  ]);
  const hasDesigner = !!(d.name?.trim() || d.title?.trim() || imgs.signature);
  const designer = hasDesigner
    ? lines([
        { text: L.designer ?? 'Designer', size: 1.6, gray: 0.4 },
        ...txt(d.name, desW - 4, 2.7, 2, true),
        ...txt(d.title, desW - 4, 2.1, 2, false, 0.25),
        imgs.signature && fit(imgs.signature.img, 'Im2', desW - 4, 11),
      ])
    : [];
  const rightW = tbW - firmW - (hasDesigner ? desW : 0);
  const objectLines = lines([
    { text: L.object ?? page.labels.project, size: 1.6, gray: 0.4 },
    ...txt(o.name?.trim() || page.title, rightW - 4, 3.1, 2, true),
    ...txt(o.address, rightW - 4, 2.2, 1, false, 0.25),
    ...txt(o.client ? `${L.client ?? 'Client'}: ${o.client}` : '', rightW - 4, 2.2, 1, false, 0.25),
    ...txt(dr.sheet, rightW - 4, 2.7, 2, true),
  ]);
  // kutitë poshtë: vetëm ato me vlerë; gjerësia sipas gjatësisë së vlerës
  const cells = [
    [L.number ?? 'No.', dr.number],
    [L.revision ?? 'Rev.', dr.revision],
    [L.date ?? page.labels.date, dr.date || page.date],
    [mid[0], mid[1]],
    [page.labels.sheet, sheet],
    [L.checked ?? 'Checked', dr.checked],
  ]
    .filter((c) => c[1]?.trim())
    .map(([label, value]) => [Math.max(label!.length * 0.78, value!.length * 1.36) + 2.6, label, value] as [number, string, string]);
  const CELL_H = 8;
  const lineH = (l: TLine) => ('gap' in l ? l.gap : 'img' in l ? l.h + 1 : l.size * 1.32);
  const colH = (list: TLine[]) => list.reduce((a, l) => a + lineH(l), 0) + 3;
  const h = Math.max(TITLE_MIN, colH(firm), Math.max(colH(designer), colH(objectLines)) + CELL_H);
  if (!ops) return h;

  ops.push('[] 0 d 0 0 0 RG 0 0 0 rg');
  ops.push(`${P(0.5)} w ${P(MARGIN)} ${P(MARGIN)} ${P(W - 2 * MARGIN)} ${P(H - 2 * MARGIN)} re S`);
  const tx = W - MARGIN - tbW, ty = MARGIN;
  ops.push(`${P(0.35)} w ${P(tx)} ${P(ty)} ${P(tbW)} ${P(h)} re S`);
  const drawCol = (list: TLine[], x: number) => {
    let y = ty + h - 1.5;
    for (const l of list) {
      if ('gap' in l) y -= l.gap;
      else if ('img' in l) {
        y -= l.h;
        ops.push(`q ${P(l.w)} 0 0 ${P(l.h)} ${P(x)} ${P(y)} cm /${l.name} Do Q`);
        y -= 1;
      } else {
        y -= l.size * 1.05;
        ops.push(`BT ${n(l.gray ?? 0)} ${n(l.gray ?? 0)} ${n(l.gray ?? 0)} rg /${l.bold ? 'F2' : 'F1'} ${P(l.size)} Tf ${P(x)} ${P(y)} Td ${pdfString(l.text)} Tj ET`);
        y -= l.size * 0.27;
      }
    }
  };
  // logoja AST kur s'ka logo (as të projektit, as të firmës)
  if (!imgs.logo) {
    ops.push(`0.961 0.62 0.259 rg ${P(tx + 2)} ${P(ty + h - 1.5 - 12)} ${P(12)} ${P(12)} re f`);
    ops.push(`BT 1 1 1 rg /F2 ${P(4.1)} Tf ${P(tx + 3.1)} ${P(ty + h - 1.5 - 7.5)} Td (AST) Tj ET`);
  }
  drawCol(firm, tx + 2);
  ops.push(`0 0 0 RG ${P(0.2)} w ${P(tx + firmW)} ${P(ty)} m ${P(tx + firmW)} ${P(ty + h)} l S`);
  let rx = tx + firmW;
  if (hasDesigner) {
    drawCol(designer, rx + 2);
    rx += desW;
    ops.push(`${P(rx)} ${P(ty + CELL_H)} m ${P(rx)} ${P(ty + h)} l S`);
  }
  drawCol(objectLines, rx + 2);
  // kutitë poshtë, nën projektuesin dhe objektin
  const cellX = tx + firmW, cellW = tbW - firmW;
  ops.push(`${P(cellX)} ${P(ty + CELL_H)} m ${P(tx + tbW)} ${P(ty + CELL_H)} l S`);
  const sum = cells.reduce((a, c) => a + c[0], 0);
  let cx = cellX;
  cells.forEach(([part, label, value], i) => {
    const cw = (cellW * part) / sum;
    if (i) ops.push(`${P(cx)} ${P(ty)} m ${P(cx)} ${P(ty + CELL_H)} l S`);
    ops.push(`BT 0.4 0.4 0.4 rg /F1 ${P(1.5)} Tf ${P(cx + 1.2)} ${P(ty + CELL_H - 2.2)} Td ${pdfString(short(label, Math.floor((cw - 2) / 0.75)))} Tj ET`);
    ops.push(`BT 0 0 0 rg /F2 ${P(2.4)} Tf ${P(cx + 1.2)} ${P(ty + 1.6)} Td ${pdfString(short(value, Math.floor((cw - 2) / (2.4 * 0.55))))} Tj ET`);
    cx += cw;
  });
  return h;
}

const short = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}...` : s);

/** Logoja (e projektit ose e firmës) brenda katrorit size × size, me përpjesëtimet e veta; pa të katrori "AST". */
function logoOps(ops: string[], imgs: PdfImages, x: number, y: number, size: number): void {
  const P = (mm: number) => n(mm * PT);
  const logo = imgs.logo?.img;
  if (logo) {
    const k = size / Math.max(logo.w, logo.h);
    const lw = logo.w * k, lh = logo.h * k;
    ops.push(`q ${P(lw)} 0 0 ${P(lh)} ${P(x + (size - lw) / 2)} ${P(y + (size - lh) / 2)} cm /Im1 Do Q`);
  } else {
    ops.push(`0.961 0.62 0.259 rg ${P(x)} ${P(y)} ${P(size)} ${P(size)} re f`);
    ops.push(`BT 1 1 1 rg /F2 ${P(size * 0.344)} Tf ${P(x + size * 0.089)} ${P(y + size * 0.378)} Td (AST) Tj ET`);
  }
}

// ---- lista e materialeve: A4 më këmbë, pas faqes së planit ----

const A4P = { w: 210, h: 297 };
const MAT_HEAD = 24; // koka e faqes: logoja, titulli, projekti, data, faqja
const MAT_ROW = 5.4;
const MAT_COLS = { nr: 0, code: 10, name: 46, qty: 160, unit: 172 }; // mm nga e majta e tabelës (gjerësia 190)

type MatLine = { kind: 'group'; text: string } | { kind: 'row'; nr: number; row: MaterialPdfRow } | { kind: 'total'; qty: number; unit: string };

/** Rreshtat e tabelës: grupi, rreshtat me numër, pastaj "Gjithsej" për çdo njësi të grupit. */
export function materialLines(rows: MaterialPdfRow[]): MatLine[] {
  const out: MatLine[] = [];
  let nr = 0;
  for (const g of [...new Set(rows.map((r) => r.group))]) {
    const list = rows.filter((r) => r.group === g);
    out.push({ kind: 'group', text: g });
    for (const row of list) out.push({ kind: 'row', nr: ++nr, row });
    const units = [...new Set(list.map((r) => r.unit))];
    for (const unit of units) out.push({ kind: 'total', qty: list.filter((r) => r.unit === unit).reduce((a, r) => a + r.qty, 0), unit });
  }
  return out;
}

/** Rreshtat në faqe: sa nxënë mbi tabelën e titullit; grupi nuk mbetet vetëm në fund të faqes. */
function materialPages(page: PageInput, titleH: number): MatLine[][] {
  const rows = page.materials?.rows ?? [];
  if (!rows.length) return [];
  const per = Math.floor((A4P.h - 2 * MARGIN - MAT_HEAD - 2 * MAT_ROW - titleH - 10) / MAT_ROW);
  const pages: MatLine[][] = [];
  let cur: MatLine[] = [];
  for (const line of materialLines(rows)) {
    if (cur.length >= per || (line.kind === 'group' && cur.length >= per - 1)) {
      pages.push(cur);
      cur = [];
    }
    cur.push(line);
  }
  pages.push(cur);
  return pages;
}

function materialPage(page: PageInput, lines: MatLine[], no: number, total: number, imgs: PdfImages, titleH: number): string {
  const m = page.materials!;
  const W = A4P.w;
  const P = (mm: number) => n(mm * PT);
  const ops: string[] = ['1 J 1 j'];
  const text = (x: number, y: number, s: string, size: number, bold = false, gray = 0, right = false) => {
    // tekstet djathtas: gjerësia e përafërt e Helvetica (0.5 em për shkronjë)
    const dx = right ? -s.length * size * 0.5 : 0;
    ops.push(`BT ${n(gray)} ${n(gray)} ${n(gray)} rg ${bold ? '/F2' : '/F1'} ${P(size)} Tf ${P(x + dx)} ${P(y)} Td ${pdfString(s)} Tj ET`);
  };
  const top = pageHead(ops, page, m.title, no, total, imgs);

  // tabela
  const x0 = MARGIN + 4;
  const tw = W - 2 * MARGIN - 8;
  const qtyRight = x0 + MAT_COLS.unit - 3;
  let y = top - MAT_HEAD - 6;
  text(x0 + MAT_COLS.nr + 1, y, m.labels.nr, 2.4, true, 0.3);
  text(x0 + MAT_COLS.code, y, m.labels.code, 2.4, true, 0.3);
  text(x0 + MAT_COLS.name, y, m.labels.name, 2.4, true, 0.3);
  text(qtyRight, y, m.labels.qty, 2.4, true, 0.3, true);
  text(x0 + MAT_COLS.unit, y, m.labels.unit, 2.4, true, 0.3);
  ops.push(`0.5 0.5 0.5 RG ${P(0.25)} w ${P(x0)} ${P(y - 1.8)} m ${P(x0 + tw)} ${P(y - 1.8)} l S`);
  y -= MAT_ROW;
  for (const line of lines) {
    if (line.kind === 'group') {
      ops.push(`0.93 0.94 0.95 rg ${P(x0)} ${P(y - 1.8)} ${P(tw)} ${P(MAT_ROW - 0.4)} re f`);
      text(x0 + 1, y, short(line.text, 90), 2.6, true);
    } else if (line.kind === 'row') {
      text(x0 + MAT_COLS.nr + 1, y, String(line.nr), 2.5, false, 0.35);
      text(x0 + MAT_COLS.code, y, short(line.row.code, 26), 2.4);
      text(x0 + MAT_COLS.name, y, short(line.row.name, 82), 2.5);
      text(qtyRight, y, String(line.row.qty), 2.6, true, 0, true);
      text(x0 + MAT_COLS.unit, y, line.row.unit, 2.5);
      ops.push(`0.85 0.86 0.88 RG ${P(0.15)} w ${P(x0)} ${P(y - 1.8)} m ${P(x0 + tw)} ${P(y - 1.8)} l S`);
    } else {
      text(x0 + MAT_COLS.name, y, m.labels.total, 2.6, true);
      text(qtyRight, y, String(line.qty), 2.6, true, 0, true);
      text(x0 + MAT_COLS.unit, y, line.unit, 2.6, true);
      ops.push(`0.4 0.4 0.4 RG ${P(0.25)} w ${P(x0 + MAT_COLS.name)} ${P(y + MAT_ROW - 1.8)} m ${P(x0 + tw)} ${P(y + MAT_ROW - 1.8)} l S`);
    }
    y -= MAT_ROW;
  }
  if (m.note && no === total) text(x0, Math.max(y - 2, MARGIN + titleH + 4), short(m.note, 120), 2.2, false, 0.35);

  titleBlock(ops, W, A4P.h, page, imgs, [pageWord(page), `${no} / ${total}`], 'A4');
  return ops.join('\n');
}

/** Skedari PDF: një objekt /Page për çdo faqe, të gjitha nën /Pages me /Kids [...] /Count N. */
function writePdf(pages: { W: number; H: number; content: string }[], page: PageInput, imgs: PdfImages): string {
  const P = (mm: number) => n(mm * PT);
  // renditja e objekteve: 1 katalogu, 2 faqet, 3–4 faqja e planit, 5–6 shkronjat, 7 info, pastaj figurat
  // (/Im1 logoja, /Im2 firma), pastaj faqet e tjera
  const images = [imgs.logo && { name: 'Im1', ...imgs.logo }, imgs.signature && { name: 'Im2', ...imgs.signature }].filter(Boolean) as { name: string; img: ProjectLogo; bytes: string }[];
  const extra = (i: number) => 8 + images.length + 2 * (i - 1);
  const pageObj = (i: number) => (i === 0 ? 3 : extra(i));
  const xobj = images.length ? ` /XObject << ${images.map((im, i) => `/${im.name} ${8 + i} 0 R`).join(' ')} >>` : '';
  const res = `/Resources << /Font << /F1 5 0 R /F2 6 0 R >>${xobj} >>`;
  const pageDict = (i: number, contents: number) =>
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${P(pages[i].W)} ${P(pages[i].H)}] ${res} /Contents ${contents} 0 R >>`;
  const stream = (c: string) => `<< /Length ${c.length} >>\nstream\n${c}\nendstream`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    pageDict(0, 4),
    stream(pages[0].content),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Title ${pdfString(page.box?.object?.name || page.title)} /Producer ${pdfString(page.product)} /Creator (AllSolutionTech CAD) >>`,
  ];
  for (const im of images)
    objs.push(`<< /Type /XObject /Subtype /Image /Width ${im.img.w} /Height ${im.img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n${im.bytes}\nendstream`);
  for (let i = 1; i < pages.length; i++) {
    objs.push(pageDict(i, pageObj(i) + 1));
    objs.push(stream(pages[i].content));
  }
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
