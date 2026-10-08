import type { Store } from '../core/store';
import type { Editor } from '../tools/editor';
import { isCable, isSymbol, newId, type Circuit, type CircuitKind, type Doc, type Vec } from '../core/types';
import { BALANCE_LIMIT, BREAKERS, DROP_LIMIT, SECTIONS, calcAll, freeName, newCircuit, phaseBalance, type CircuitCalc, type CircuitWarning } from '../core/circuits';
import { EDITION } from '../edition';
import { SYSTEM_CABLES, ZONE_MAX_DEVICES, cableTypeOf, circuitPrefix, isSystemKind, syncCableLayers } from '../core/systems';
import { getLang, t, type StringKey } from '../i18n/strings';
import { unitMm } from '../symbols/library';
import { symbolCenter } from '../symbols/place';
import { saveData } from '../io/files';

export const KIND_KEY: Record<CircuitKind, StringKey> = {
  lighting: 'kind_lighting',
  sockets: 'kind_sockets',
  appliance: 'kind_appliance',
  cctv: 'kind_cctv',
  network: 'kind_network',
  fire: 'kind_fire',
  emergency: 'kind_emergency',
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Numrat me presjen dhjetore të gjuhës aktuale. */
const num = (v: number, digits: number) => v.toLocaleString(getLang(), { minimumFractionDigits: digits, maximumFractionDigits: digits });

const WARN =
  '<svg class="ic warn" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z"></path><path d="M12 10v5M12 18v.5"></path></svg>';

/** Qendrat e simboleve, që kabllot të njihen si të lidhura me to. */
export function symbolCenters(doc: Doc): Map<string, Vec> {
  const unit = unitMm(doc.scale);
  return new Map(doc.entities.filter(isSymbol).map((s) => [s.id, symbolCenter(s, unit)]));
}

export function circuitResults(doc: Doc): CircuitCalc[] {
  return calcAll(doc, symbolCenters(doc));
}

/** Paneli "Qarqet": lista, redaktimi i qarkut aktiv dhe tabela e plotë. */
export class CircuitPanel {
  private key = '';
  private list = document.getElementById('circuitList')!;
  private modal = document.getElementById('circuitModal')!;
  private table = document.getElementById('circuitTableBody')!;

  constructor(
    private store: Store,
    private editor: Editor,
    private onActive: () => void,
    private toast: (msg: string) => void,
    /** Lloji i qarkut të ri: sipas librarisë së hapur (kamera, rrjet, zjarr) ose priza. */
    private newKind: () => CircuitKind = () => 'sockets',
  ) {
    document.getElementById('btnNewCircuit')!.addEventListener('click', () => this.create());
    document.getElementById('btnCircuitTable')!.addEventListener('click', () => this.openTable());
    document.getElementById('circuitModalClose')!.addEventListener('click', () => (this.modal.hidden = true));
    document.getElementById('circuitCsv')!.addEventListener('click', () => this.exportCsv());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.modal.hidden = true;
    });
    this.list.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('[data-circuit]');
      if (row) this.setActive(this.editor.activeCircuit === row.dataset.circuit ? null : row.dataset.circuit!);
    });
  }

  get isOpen(): boolean {
    return !this.modal.hidden;
  }

  closeTable(): void {
    this.modal.hidden = true;
  }

  private circuits(): Circuit[] {
    return this.store.doc.circuits ?? [];
  }

  setActive(id: string | null): void {
    this.editor.activeCircuit = id;
    this.key = '';
    this.onActive();
  }

  private create(): void {
    const kind = this.newKind();
    const c = newCircuit(this.circuits(), kind, t(KIND_KEY[kind]), newId('q'));
    this.store.commit((d) => {
      d.circuits = [...(d.circuits ?? []), c];
    });
    this.setActive(c.id);
  }

  private updateCircuit(id: string, fn: (c: Circuit) => void): void {
    this.store.commit((d) => {
      const c = d.circuits?.find((x) => x.id === id);
      if (c) fn(c);
      syncCableLayers(d);
    });
  }

  private remove(id: string): void {
    this.store.commit((d) => {
      d.circuits = (d.circuits ?? []).filter((c) => c.id !== id);
      if (d.circuits.length === 0) delete d.circuits;
      for (const e of d.entities) if ((isSymbol(e) || isCable(e)) && e.circuit === id) delete e.circuit;
      syncCableLayers(d);
    });
    this.setActive(null);
  }

  render(): void {
    const doc = this.store.doc;
    // qarku aktiv që nuk ekziston më (p.sh. pas zhbërjes) hiqet
    if (this.editor.activeCircuit && !this.circuits().some((c) => c.id === this.editor.activeCircuit)) this.editor.activeCircuit = null;
    const key = JSON.stringify([getLang(), doc.circuits, doc.scale, this.editor.activeCircuit, doc.entities.filter((e) => isCable(e) || isSymbol(e))]);
    if (key === this.key) return;
    this.key = key;
    const res = circuitResults(doc);
    if (res.length === 0) {
      this.list.innerHTML = `<p class="muted small">${esc(t('noCircuits'))}</p>`;
    } else {
      const rows = res
        .map((r) => {
          const c = r.circuit;
          const active = c.id === this.editor.activeCircuit;
          return `<button class="circuit-row" type="button" data-circuit="${c.id}" aria-pressed="${active}" style="--c:${esc(c.color)}">
            <span class="dot"></span><b>${esc(c.name)}</b><span class="lbl">${esc(c.label)}</span>
            <span class="spec">${r.warnings.length ? WARN : ''}${r.system ? '' : `${r.breaker} A · `}${esc(r.cable)}</span></button>`;
        })
        .join('');
      this.list.innerHTML = `<div class="circuit-list">${rows}</div>`;
    }
    const active = res.find((r) => r.circuit.id === this.editor.activeCircuit);
    if (active) this.renderEditor(active);
    if (this.isOpen) this.renderTable(res);
  }

  private warnText(w: CircuitWarning, r: CircuitCalc): string {
    if (w === 'drop') return t('warnDrop', { v: DROP_LIMIT[r.circuit.kind] });
    if (w === 'run') return t('warnRun', { v: cableTypeOf(r.circuit).maxRun ?? 0 });
    if (w === 'devices') return t('warnDevices', { v: ZONE_MAX_DEVICES });
    if (w === 'phase') return t('warnPhase');
    return t('warnOverload');
  }

  private renderEditor(r: CircuitCalc): void {
    const c = r.circuit;
    const opt = (v: string, label: string, sel: boolean) => `<option value="${v}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
    // llojet e programit; një qark nga një program tjetër ruan llojin e vet
    const kinds = [...new Set([...EDITION.kinds, c.kind])];
    const kindSelect =
      kinds.length > 1
        ? `<label class="field" for="ciKind">${esc(t('circuitKind'))}<select id="ciKind">${kinds.map((k) => opt(k, t(KIND_KEY[k]), c.kind === k)).join('')}</select></label>`
        : '';
    let fields: string;
    let stats: string;
    const line = phaseBalance(circuitResults(this.store.doc)).lines.get(c.id);
    if (isSystemKind(c.kind)) {
      const type = cableTypeOf(c);
      const cableOpts = SYSTEM_CABLES[c.kind].map((x) => opt(x.id, x.spec, x.id === type.id)).join('');
      fields = `${kindSelect}<label class="field" for="ciCable">${esc(t('cableType'))}<select id="ciCable">${cableOpts}</select></label>`;
      stats = `
        <div class="stat"><span>${esc(t('points'))}</span><b>${r.points}</b></div>
        <div class="stat"><span>${esc(t('devicePower'))}</span><b>${num(r.power, 0)} W</b></div>
        <div class="stat"><span>${esc(t('cableLength'))}</span><b>${r.length ? `${num(r.length, 1)} m` : '—'}</b></div>
        <div class="stat"><span>${esc(t('longestRun'))}</span><b>${r.longest ? `${num(r.longest, 1)} m` : '—'}</b></div>`;
    } else {
      const breakerOpts = [opt('', t('auto'), c.breaker === undefined), ...BREAKERS.map((b) => opt(String(b), `${b} A`, c.breaker === b))].join('');
      const sectionOpts = [opt('', t('auto'), c.section === undefined), ...SECTIONS.map((s) => opt(String(s), `${num(s, s % 1 ? 1 : 0)} mm²`, c.section === s))].join('');
      fields = `${kindSelect}
        <label class="field" for="ciPhases">${esc(t('phases'))}<select id="ciPhases">${opt('1', t('phase1'), c.phases === 1)}${opt('3', t('phase3'), c.phases === 3)}</select></label>
        ${c.phases === 1 ? `<label class="field" for="ciLine">${esc(t('phaseLine'))}<select id="ciLine">${opt('', t('autoLine', { v: line ? `L${line}` : '—' }), c.line === undefined)}${[1, 2, 3].map((n) => opt(String(n), `L${n}`, c.line === n)).join('')}</select></label>` : ''}
        <label class="field" for="ciBreaker">${esc(t('breaker'))}<select id="ciBreaker">${breakerOpts}</select></label>
        <label class="field" for="ciSection">${esc(t('minSection'))}<select id="ciSection">${sectionOpts}</select></label>`;
      stats = `
        <div class="stat"><span>${esc(t('points'))}</span><b>${r.points}</b></div>
        <div class="stat"><span>${esc(t('powerTotal'))}</span><b>${num(r.power / 1000, 2)} kW</b></div>
        <div class="stat"><span>Ib</span><b>${num(r.ib, 1)} A</b></div>
        <div class="stat"><span>${esc(t('breaker'))}</span><b>${r.breaker} A</b></div>
        <div class="stat"><span>${esc(t('cableType'))}</span><b>${esc(r.cable)}</b></div>
        <div class="stat"><span>${esc(t('cableLength'))}</span><b>${r.length ? `${num(r.length, 1)} m` : '—'}</b></div>
        <div class="stat wide"><span>${esc(t('voltageDrop'))}</span><b>${r.drop === null ? '—' : `${num(r.drop, 2)} %`}</b></div>`;
    }
    const warn = r.warnings.map((w) => `<p class="warn-text">${WARN}${esc(this.warnText(w, r))}</p>`).join('');
    const box = document.createElement('div');
    box.className = 'circuit-edit';
    box.innerHTML = `
      <p class="muted small">${esc(t('activeCircuit', { name: c.name }))}</p>
      <div class="prop-grid">
        <label class="field" for="ciName">${esc(t('circuitName'))}<input id="ciName" type="text" maxlength="8" value="${esc(c.name)}"></label>
        <label class="field" for="ciColor">${esc(t('color'))}<input id="ciColor" type="color" value="${esc(c.color)}"></label>
      </div>
      <label class="field" for="ciLabel">${esc(t('circuitLabel'))}<input id="ciLabel" type="text" maxlength="40" value="${esc(c.label)}"></label>
      <div class="prop-grid">${fields}</div>
      <div class="stats">${stats}</div>
      ${warn}
      <div class="btn-row">
        <button class="btn" id="ciSelect" type="button">${esc(t('selectCircuit'))}</button>
        <button class="btn" id="ciClose" type="button">${esc(t('closeCircuit'))}</button>
      </div>
      <button class="btn danger" id="ciDelete" type="button">${esc(t('deleteCircuit'))}</button>`;
    this.list.appendChild(box);
    const val = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
    const on = (id: string, fn: (v: string) => void) => document.getElementById(id)?.addEventListener('change', () => fn(val(id)));
    on('ciName', (v) => v.trim() && this.updateCircuit(c.id, (x) => void (x.name = v.trim())));
    on('ciLabel', (v) => this.updateCircuit(c.id, (x) => void (x.label = v.trim())));
    on('ciColor', (v) => this.updateCircuit(c.id, (x) => void (x.color = v)));
    on('ciKind', (v) => this.changeKind(c.id, v as CircuitKind));
    on('ciPhases', (v) => this.updateCircuit(c.id, (x) => (v === '3' ? ((x.phases = 3), delete x.line) : (x.phases = 1))));
    on('ciLine', (v) => this.updateCircuit(c.id, (x) => (v ? (x.line = Number(v) as 1 | 2 | 3) : delete x.line)));
    on('ciBreaker', (v) => this.updateCircuit(c.id, (x) => (v ? (x.breaker = Number(v)) : delete x.breaker)));
    on('ciSection', (v) => this.updateCircuit(c.id, (x) => (v ? (x.section = Number(v)) : delete x.section)));
    on('ciCable', (v) => this.updateCircuit(c.id, (x) => void (x.cableType = v)));
    document.getElementById('ciSelect')!.addEventListener('click', () => {
      this.store.setSelection(this.store.doc.entities.filter((e) => (isSymbol(e) || isCable(e)) && e.circuit === c.id).map((e) => e.id));
    });
    document.getElementById('ciClose')!.addEventListener('click', () => this.setActive(null));
    document.getElementById('ciDelete')!.addEventListener('click', () => this.remove(c.id));
  }

  /** Ndryshon llojin; emri automatik (Q1, CAM1...) dhe përshkrimi standard ndjekin llojin e ri. */
  private changeKind(id: string, kind: CircuitKind): void {
    this.updateCircuit(id, (x) => {
      const others = this.circuits().filter((o) => o.id !== id);
      if (circuitPrefix(x.kind) !== circuitPrefix(kind) && new RegExp(`^${circuitPrefix(x.kind)}\\d+$`).test(x.name)) x.name = freeName(others, kind);
      if (!x.label || x.label === t(KIND_KEY[x.kind])) x.label = t(KIND_KEY[kind]);
      x.kind = kind;
      if (!isSystemKind(kind)) delete x.cableType;
      else if (!SYSTEM_CABLES[kind].some((c) => c.id === x.cableType)) delete x.cableType;
    });
  }

  // ---- tabela ----

  private openTable(): void {
    this.modal.hidden = false;
    this.renderTable(circuitResults(this.store.doc));
  }

  private rows(res: CircuitCalc[]): string[][] {
    const lines = phaseBalance(res).lines;
    return res.map((r) => [
      r.circuit.name,
      r.circuit.label,
      t(KIND_KEY[r.circuit.kind]),
      r.system ? '—' : r.circuit.phases === 3 ? '3~ 400 V' : `1~ 230 V · L${lines.get(r.circuit.id) ?? 1}`,
      String(r.points),
      num(r.power / 1000, 2),
      r.system ? '—' : num(r.ib, 1),
      r.system ? '—' : `${r.breaker} A`,
      r.cable,
      r.length ? num(r.length, 1) : '—',
      r.drop === null ? '—' : num(r.drop, 2),
    ]);
  }

  private header(): string[] {
    return [t('circuit'), t('circuitLabel'), t('circuitKind'), t('phases'), t('points'), `${t('powerTotal')} (kW)`, 'Ib (A)', t('breaker'), t('cableType'), `${t('cableLength')} (m)`, `ΔU (%)`];
  }

  private renderTable(res: CircuitCalc[]): void {
    const head = this.header();
    const rows = this.rows(res);
    const total = res.reduce((s, r) => s + r.power, 0);
    this.table.innerHTML = res.length
      ? `<table class="summary circuits-table"><thead><tr>${head.map((h, i) => `<th${i >= 4 ? ' class="qty"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows
          .map(
            (row, ri) =>
              `<tr${res[ri].warnings.length ? ' class="has-warn"' : ''}>${row
                .map((v, i) => `<td${i >= 4 ? ' class="qty"' : ''}${i === 0 ? ` style="color:${esc(res[ri].circuit.color)};font-weight:600"` : ''}>${esc(v)}</td>`)
                .join('')}</tr>`,
          )
          .join('')}</tbody>
        <tfoot><tr><td colspan="5">${esc(t('totalArea'))}</td><td class="qty">${num(total / 1000, 2)}</td><td colspan="5"></td></tr>
        ${this.balanceRow(res)}</tfoot></table>`
      : `<p class="muted small">${esc(t('noCircuits'))}</p>`;
  }

  /** Ngarkesa e secilës fazë dhe disbalanca mes tyre. */
  private balanceRow(res: CircuitCalc[]): string {
    const b = phaseBalance(res);
    if (!b.loads.some((l) => l > 0)) return '';
    const over = b.imbalance > BALANCE_LIMIT;
    const loads = b.loads.map((l, i) => `L${i + 1} ${num(l / 1000, 2)} kW`).join(' · ');
    return `<tr${over ? ' class="has-warn"' : ''}><td colspan="5">${esc(t('phaseBalance'))}</td><td colspan="6">${esc(loads)} · ${esc(t('imbalance', { v: num(b.imbalance, 0) }))}${
      over ? ` ${WARN}${esc(t('warnBalance', { v: BALANCE_LIMIT }))}` : ''
    }</td></tr>`;
  }

  private async exportCsv(): Promise<void> {
    const res = circuitResults(this.store.doc);
    const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [this.header(), ...this.rows(res)].map((r) => r.map(cell).join(';'));
    // BOM që Excel ta hapë me shkronjat e sakta
    const name = `${this.store.doc.name.replace(/[\\/:*?"<>|]+/g, '_')} - qarqet.csv`;
    try {
      if ((await saveData(name, '\ufeff' + lines.join('\r\n'), 'text/csv')) === 'saved') this.toast(t('csvSaved'));
    } catch (err) {
      this.toast((err as Error).message);
    }
  }
}
