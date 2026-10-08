import type { Store } from '../core/store';
import { breakerSpec, cableSpec, materialList, usedSymbols, type Materials } from '../core/materials';
import { getLang, t } from '../i18n/strings';
import { allSymbols, CATEGORIES, categoryName, symbolName, symbolSvg, type SymbolDef } from '../symbols/library';
import { saveData } from '../io/files';
import { symbolCenters } from './circuits';

export type ReportKind = 'materials' | 'legend' | 'catalog';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const num = (v: number, digits = 0) => v.toLocaleString(getLang(), { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Stili i raportit: letër e bardhë, gati për A4. */
const REPORT_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font: 12px/1.45 "Segoe UI", system-ui, -apple-system, sans-serif; color: #111827; background: #FFFFFF; }
  header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 14px; }
  .brand { font-weight: 700; font-size: 13px; letter-spacing: 0.02em; }
  .brand span { display: inline-block; background: #E8780C; color: #FFFFFF; border-radius: 4px; padding: 1px 6px; margin-right: 6px; font-size: 11px; }
  h1 { margin: 4px 0 0; font-size: 18px; }
  .meta { text-align: right; color: #4B5563; font-size: 11px; }
  h2 { font-size: 13px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th { text-align: left; font-size: 10.5px; font-weight: 600; color: #4B5563; border-bottom: 1px solid #9CA3AF; padding: 4px 6px; }
  td { border-bottom: 1px solid #E5E7EB; padding: 4px 6px; vertical-align: middle; }
  td.code { font-family: Consolas, "IBM Plex Mono", monospace; font-size: 11px; white-space: nowrap; }
  td.qty, th.qty { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  table { table-layout: fixed; }
  th.sym, td.sym { width: 60px; }
  th.code, td.code { width: 150px; }
  th.qty, td.qty { width: 70px; }
  th.unit, td.unit { width: 60px; }
  td.sym svg { width: 44px; height: 33px; display: block; fill: none; stroke: #111827; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  td.sym svg .fill { fill: #111827; }
  tfoot td { font-weight: 600; border-top: 1px solid #9CA3AF; border-bottom: none; }
  .note { color: #4B5563; font-size: 11px; margin: 10px 0 0; }
  .empty { color: #6B7280; padding: 24px 0; }
`;

function page(title: string, project: string, body: string): string {
  const date = new Date().toLocaleDateString(getLang(), { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `<!doctype html><html lang="${esc(getLang())}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(`${title} - ${project}`)}</title><style>${REPORT_CSS}</style></head><body>
<header><div><div class="brand"><span>AST</span>AllSolutionTech CAD 2D</div><h1>${esc(title)}</h1></div>
<div class="meta"><div><b>${esc(t('project'))}:</b> ${esc(project)}</div><div>${esc(t('generatedOn', { v: date }))}</div></div></header>
${body}</body></html>`;
}

const symbolRow = (d: SymbolDef, qty?: number) =>
  `<tr><td class="sym">${symbolSvg(d)}</td><td class="code">${esc(d.code)}</td><td>${esc(symbolName(d))}</td>${
    qty === undefined ? '' : `<td class="qty">${num(qty)}</td><td class="unit">${esc(t('unitPcs'))}</td>`
  }</tr>`;

/** Rreshtat e listës së materialeve: grupi, kodi, përshkrimi, sasia, njësia. */
function materialRows(m: Materials): { group: string; code: string; name: string; qty: number; unit: string; def?: SymbolDef }[] {
  return [
    ...m.symbols.map((s) => ({ group: t('groupDevices'), code: s.def.code, name: symbolName(s.def), qty: s.qty, unit: t('unitPcs'), def: s.def })),
    ...m.cables.map((c) => ({
      group: t('groupCables'),
      code: cableSpec(c) || '—',
      name: c.section === null ? t('cableNoCircuit') : t('cableName', { v: cableSpec(c) }),
      qty: c.qty,
      unit: 'm',
    })),
    ...m.breakers.map((b) => ({ group: t('groupBreakers'), code: breakerSpec(b), name: t('breakerName', { v: breakerSpec(b) }), qty: b.qty, unit: t('unitPcs') })),
  ];
}

export class ReportsDialog {
  private modal = document.getElementById('reportsModal')!;
  private frame = document.getElementById('reportFrame') as HTMLIFrameElement;
  private tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-report]')];
  private csvBtn = document.getElementById('reportCsv') as HTMLButtonElement;
  kind: ReportKind = 'materials';

  constructor(
    private store: Store,
    private toast: (msg: string, error?: boolean) => void,
  ) {
    this.tabs.forEach((b) => b.addEventListener('click', () => this.show(b.dataset.report as ReportKind)));
    document.getElementById('reportClose')!.addEventListener('click', () => this.close());
    document.getElementById('reportPrint')!.addEventListener('click', () => this.print());
    document.getElementById('reportHtml')!.addEventListener('click', () => this.saveHtml());
    this.csvBtn.addEventListener('click', () => this.saveCsv());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
  }

  get isOpen(): boolean {
    return !this.modal.hidden;
  }

  open(kind: ReportKind = this.kind): void {
    this.modal.hidden = false;
    this.show(kind);
  }

  close(): void {
    this.modal.hidden = true;
  }

  /** Rifreskon pamjen kur ndryshon gjuha ose projekti ndërsa dritarja është hapur. */
  refresh(): void {
    if (this.isOpen) this.show(this.kind);
  }

  private show(kind: ReportKind): void {
    this.kind = kind;
    this.tabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.report === kind)));
    this.csvBtn.hidden = kind === 'catalog';
    this.frame.srcdoc = this.html(kind);
  }

  private title(kind: ReportKind): string {
    return t(kind === 'materials' ? 'tabMaterials' : kind === 'legend' ? 'tabLegend' : 'tabCatalog');
  }

  html(kind: ReportKind): string {
    const doc = this.store.doc;
    const title = this.title(kind);
    if (kind === 'catalog') {
      const all = allSymbols();
      const body = CATEGORIES.map((cat) => {
        const defs = all.filter((d) => d.category === cat.id);
        if (!defs.length) return '';
        return `<h2>${esc(categoryName(cat))}</h2><table><thead><tr><th class="sym">${esc(t('symbolCol'))}</th><th class="code">${esc(t('code'))}</th><th>${esc(t('description'))}</th></tr></thead>
          <tbody>${defs.map((d) => symbolRow(d)).join('')}</tbody></table>`;
      }).join('');
      return page(title, doc.name, `${body}<p class="note">${esc(t('catalogNote'))} ${num(all.length)} ${esc(t('symbolsCount').toLowerCase())}.</p>`);
    }
    if (kind === 'legend') {
      const used = usedSymbols(doc);
      if (!used.length) return page(title, doc.name, `<p class="empty">${esc(t('emptyPlan'))}</p>`);
      const total = used.reduce((s, u) => s + u.qty, 0);
      return page(
        title,
        doc.name,
        `<table><thead><tr><th class="sym">${esc(t('symbolCol'))}</th><th class="code">${esc(t('code'))}</th><th>${esc(t('description'))}</th><th class="qty">${esc(t('qty'))}</th><th class="unit">${esc(t('unit'))}</th></tr></thead>
        <tbody>${used.map((u) => symbolRow(u.def, u.qty)).join('')}</tbody>
        <tfoot><tr><td colspan="3">${esc(t('totalArea'))}</td><td class="qty">${num(total)}</td><td>${esc(t('unitPcs'))}</td></tr></tfoot></table>
        <p class="note">${esc(t('legendNote'))}</p>`,
      );
    }
    const rows = materialRows(materialList(doc, symbolCenters(doc)));
    if (!rows.length) return page(title, doc.name, `<p class="empty">${esc(t('emptyPlan'))}</p>`);
    const groups = [...new Set(rows.map((r) => r.group))];
    const body = groups
      .map((g) => {
        const list = rows.filter((r) => r.group === g);
        return `<h2>${esc(g)}</h2><table><thead><tr><th class="sym">${esc(t('symbolCol'))}</th><th class="code">${esc(t('code'))}</th><th>${esc(t('description'))}</th><th class="qty">${esc(t('qty'))}</th><th class="unit">${esc(t('unit'))}</th></tr></thead>
          <tbody>${list
            .map((r) => `<tr><td class="sym">${r.def ? symbolSvg(r.def) : ''}</td><td class="code">${esc(r.code)}</td><td>${esc(r.name)}</td><td class="qty">${num(r.qty)}</td><td class="unit">${esc(r.unit)}</td></tr>`)
            .join('')}</tbody></table>`;
      })
      .join('');
    return page(title, doc.name, `${body}<p class="note">${esc(t('reserveNote'))}</p>`);
  }

  private fileBase(): string {
    return `${this.store.doc.name} - ${this.title(this.kind)}`.replace(/[\\/:*?"<>|]+/g, '_');
  }

  private print(): void {
    try {
      const w = this.frame.contentWindow;
      if (!w) throw new Error('no frame');
      w.focus();
      w.print();
    } catch {
      this.toast(t('printBlocked'), true);
    }
  }

  private async save(name: string, data: string, type: string): Promise<void> {
    try {
      if ((await saveData(name, data, type)) === 'saved') this.toast(t('reportSaved'));
    } catch (err) {
      this.toast((err as Error).message, true);
    }
  }

  private saveHtml(): void {
    void this.save(`${this.fileBase()}.html`, this.html(this.kind), 'text/html');
  }

  private saveCsv(): void {
    const doc = this.store.doc;
    const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    let table: string[][];
    if (this.kind === 'legend') {
      table = [[t('code'), t('description'), t('qty'), t('unit')], ...usedSymbols(doc).map((u) => [u.def.code, symbolName(u.def), String(u.qty), t('unitPcs')])];
    } else {
      const rows = materialRows(materialList(doc, symbolCenters(doc)));
      table = [[t('category'), t('code'), t('description'), t('qty'), t('unit')], ...rows.map((r) => [r.group, r.code, r.name, String(r.qty), r.unit])];
    }
    // BOM që Excel ta hapë me shkronjat e sakta
    void this.save(`${this.fileBase()}.csv`, '\ufeff' + table.map((r) => r.map(cell).join(';')).join('\r\n'), 'text/csv');
  }
}
