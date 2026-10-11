import type { Store } from '../core/store';
import { newId } from '../core/types';
import { layerName, t } from '../i18n/strings';
import { EDITION } from '../edition';
import { CATEGORIES, SYMBOLS, allSymbols, categoryName, symbolDef, symbolName, type SymbolDef } from '../symbols/library';
import {
  CANVAS_BOUNDS,
  cleanText,
  nextCode,
  semicircle,
  shapeToPart,
  shapesFromDef,
  toSymbolDef,
  translateShape,
  type CustomSymbol,
  type Pt,
  type Shape,
} from '../symbols/custom';
import { symbolSvg } from '../symbols/library';

type ShapeTool = 'select' | 'line' | 'rect' | 'circle' | 'semicircle' | 'arc' | 'poly' | 'text';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** Shtresat ku mund të shkojë një simbol i ri. */
const SYMBOL_LAYERS = [...EDITION.layers, 'kabllot', 'tekstet'];
const SNAP = 0.5;

/**
 * Dritarja ku përdoruesi vizaton simbolin e vet me vija, drejtkëndësha, rrathë, harqe dhe tekst,
 * i jep kod, emra dhe shtresë, dhe e ruan te projekti.
 */
export class SymbolEditor {
  private modal = $<HTMLDivElement>('symbolEditor');
  private canvas = $<HTMLCanvasElement>('seCanvas');
  private ctx = this.canvas.getContext('2d')!;
  private shapes: Shape[] = [];
  private tool: ShapeTool = 'line';
  private fill = false;
  /** Pikat e klikuara për formën që po vizatohet. */
  private pts: Pt[] = [];
  private cursor: Pt | null = null;
  private editing: CustomSymbol | null = null;
  /** Forma e zgjedhur me veglën Zgjidh, dhe zhvendosja që po bëhet me tërheqje. */
  private selected = -1;
  private drag: { start: Pt; delta: Pt } | null = null;

  constructor(
    private store: Store,
    private onSaved: (id: string) => void,
    private toast: (msg: string, error?: boolean) => void,
  ) {
    this.modal.querySelectorAll<HTMLButtonElement>('[data-shape]').forEach((b) =>
      b.addEventListener('click', () => this.setTool(b.dataset.shape as ShapeTool)),
    );
    $('seFill').addEventListener('click', () => {
      this.fill = !this.fill;
      $('seFill').setAttribute('aria-pressed', String(this.fill));
    });
    $('seUndo').addEventListener('click', () => this.undo());
    $('seClear').addEventListener('click', () => {
      this.shapes = [];
      this.pts = [];
      this.redraw();
    });
    $('seMount').addEventListener('change', () => this.redraw());
    $('seDeleteShape').addEventListener('click', () => this.deleteSelected());
    $<HTMLSelectElement>('seFrom').addEventListener('change', (e) => {
      const sel = e.target as HTMLSelectElement;
      const def = symbolDef(sel.value);
      sel.value = '';
      if (def) this.startFrom(def);
    });
    this.canvas.addEventListener('pointerup', (e) => this.up(e));
    $('seCancel').addEventListener('click', () => this.close());
    $('seSave').addEventListener('click', () => this.save());
    $('seDelete').addEventListener('click', () => this.remove());
    this.canvas.addEventListener('pointerdown', (e) => this.down(e));
    this.canvas.addEventListener('pointermove', (e) => {
      this.cursor = this.toLocal(e);
      if (this.drag) this.drag.delta = { x: this.cursor.x - this.drag.start.x, y: this.cursor.y - this.drag.start.y };
      this.redraw();
    });
    this.canvas.addEventListener('pointerleave', () => {
      this.cursor = null;
      this.redraw();
    });
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.finishPoly(false);
      this.pts = [];
      this.redraw();
    });
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (this.pts.length) {
          this.finishPoly(false);
          this.pts = [];
          this.redraw();
        } else if (this.selected >= 0) {
          this.selected = -1;
          this.redraw();
        } else this.close();
      }
      if (e.key === 'Enter' && this.tool === 'poly' && this.pts.length) {
        e.preventDefault();
        this.finishPoly(false);
        this.redraw();
      }
      const typing = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT';
      if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && this.selected >= 0) {
        e.preventDefault();
        e.stopPropagation();
        this.deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.stopPropagation();
        this.undo();
      }
    });
  }

  get isOpen(): boolean {
    return !this.modal.hidden;
  }

  /** Hap dritaren: për një simbol tim ekzistues, ose bosh; "from" nis simbolin e ri nga një simbol i librarisë. */
  open(existing?: CustomSymbol, from?: SymbolDef): void {
    this.editing = existing ?? null;
    this.shapes = existing ? structuredClone(existing.shapes) : [];
    this.pts = [];
    this.selected = -1;
    this.drag = null;
    this.fillFromList();
    this.fill = false;
    $('seFill').setAttribute('aria-pressed', 'false');
    const symbols = this.store.doc.symbols ?? [];
    $<HTMLInputElement>('seCode').value = existing?.code ?? nextCode(symbols.map((s) => s.code));
    $<HTMLSelectElement>('seMount').value = existing?.mount ?? 'wall';
    const layerSel = $<HTMLSelectElement>('seLayer');
    layerSel.innerHTML = SYMBOL_LAYERS.map((id) => `<option value="${id}">${escapeHtml(layerName(id, id))}</option>`).join('');
    layerSel.value = existing?.layer ?? EDITION.layers[0];
    for (const l of ['sq', 'en', 'it', 'de'] as const) $<HTMLInputElement>(`seName_${l}`).value = existing?.names[l] ?? '';
    $<HTMLInputElement>('seHeight').value = existing?.height !== undefined ? String(existing.height) : '';
    $<HTMLInputElement>('sePower').value = existing?.power !== undefined ? String(existing.power) : '';
    $('seDelete').hidden = !existing;
    $('seTitle').textContent = t(existing ? 'seTitleEdit' : 'seTitle');
    this.setTool('line');
    this.modal.hidden = false;
    this.resize();
    $<HTMLInputElement>('seName_sq').focus();
    if (from) this.startFrom(from);
  }

  /** Lista "Nis nga simboli": të gjitha simbolet e librarisë, sipas kategorive. */
  private fillFromList(): void {
    const all = allSymbols();
    const groups = CATEGORIES.map((cat) => {
      const defs = all.filter((d) => d.category === cat.id);
      if (!defs.length) return '';
      const opts = defs.map((d) => `<option value="${escapeHtml(d.id)}">${escapeHtml(`${d.code} · ${symbolName(d)}`)}</option>`).join('');
      return `<optgroup label="${escapeHtml(categoryName(cat))}">${opts}</optgroup>`;
    });
    $('seFrom').innerHTML = `<option value="">${escapeHtml(t('seFromPick'))}</option>${groups.join('')}`;
  }

  /** Merr format e një simboli gati: mund të zhvendosen, fshihen ose të shtohen të reja. */
  private startFrom(def: SymbolDef): void {
    if (this.shapes.length && !confirm(t('seFromReplace'))) return;
    this.shapes = shapesFromDef(def);
    this.selected = -1;
    $<HTMLSelectElement>('seMount').value = def.mount === 'wall' ? 'wall' : 'center';
    const layerSel = $<HTMLSelectElement>('seLayer');
    if ([...layerSel.options].some((o) => o.value === def.layer)) layerSel.value = def.layer;
    for (const l of ['sq', 'en', 'it', 'de'] as const) {
      const input = $<HTMLInputElement>(`seName_${l}`);
      if (!input.value.trim()) input.value = def.names[l];
    }
    if (def.height !== undefined && $<HTMLInputElement>('seHeight').value === '') $<HTMLInputElement>('seHeight').value = String(def.height);
    if (def.power !== undefined && $<HTMLInputElement>('sePower').value === '') $<HTMLInputElement>('sePower').value = String(def.power);
    this.setTool('select');
    this.toast(t('seFromDone', { code: def.code }));
  }

  private deleteSelected(): void {
    if (this.selected < 0) return;
    this.shapes.splice(this.selected, 1);
    this.selected = -1;
    this.redraw();
  }

  /** Mbyll shumëkëndëshin që po vizatohet; me më pak se dy pika nuk shtohet. */
  private finishPoly(closed: boolean): void {
    if (this.tool !== 'poly') return;
    const pts = this.pts.filter((q, i, a) => i === 0 || q.x !== a[i - 1].x || q.y !== a[i - 1].y);
    if (pts.length >= (closed ? 3 : 2)) this.shapes.push({ kind: 'poly', pts, closed, ...(closed && this.fill ? { fill: true } : {}) });
    this.pts = [];
  }

  /** Forma më e sipërme nën pikën e ekranit, ose -1. */
  private hit(e: PointerEvent): number {
    const r = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const b = this.bounds;
    const k = this.k;
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(dpr * k, 0, 0, dpr * k, -b.minX * k * dpr, -b.minY * k * dpr);
    ctx.lineWidth = 10 / k;
    const x = (e.clientX - r.left) * dpr;
    const y = (e.clientY - r.top) * dpr;
    let found = -1;
    for (let i = this.shapes.length - 1; i >= 0 && found < 0; i--) {
      const part = shapeToPart(this.shapes[i]);
      if (!part) continue;
      const path = new Path2D(part.d);
      if (ctx.isPointInStroke(path, x, y) || (part.fill && ctx.isPointInPath(path, x, y))) found = i;
    }
    ctx.restore();
    return found;
  }

  private up(_e: PointerEvent): void {
    const d = this.drag;
    this.drag = null;
    if (d && this.selected >= 0 && (d.delta.x || d.delta.y)) {
      this.shapes[this.selected] = translateShape(this.shapes[this.selected], d.delta.x, d.delta.y);
    }
    this.redraw();
  }

  close(): void {
    this.modal.hidden = true;
  }

  private setTool(tool: ShapeTool): void {
    this.tool = tool;
    this.pts = [];
    if (tool !== 'select') this.selected = -1;
    $('seDeleteShape').hidden = tool !== 'select';
    this.modal.querySelectorAll<HTMLButtonElement>('[data-shape]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.shape === tool)),
    );
    $('seTextRow').hidden = tool !== 'text';
    this.redraw();
  }

  private undo(): void {
    if (this.pts.length) this.pts = [];
    else this.shapes.pop();
    this.redraw();
  }

  // ---- koordinatat ----

  private get bounds() {
    return CANVAS_BOUNDS[$<HTMLSelectElement>('seMount').value === 'center' ? 'center' : 'wall'];
  }

  /** Piksela për njësi lokale. */
  private get k(): number {
    const b = this.bounds;
    return Math.min(this.cssW / (b.maxX - b.minX), this.cssH / (b.maxY - b.minY));
  }

  private cssW = 480;
  private cssH = 360;

  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(200, r.width);
    this.cssH = this.cssW * 0.75;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
    this.canvas.style.height = `${this.cssH}px`;
    this.redraw();
  }

  private toLocal(e: PointerEvent): Pt {
    const r = this.canvas.getBoundingClientRect();
    const b = this.bounds;
    const x = b.minX + (e.clientX - r.left) / this.k;
    const y = b.minY + (e.clientY - r.top) / this.k;
    return { x: Math.round(x / SNAP) * SNAP, y: Math.round(y / SNAP) * SNAP };
  }

  // ---- vizatimi i formave ----

  private down(e: PointerEvent): void {
    if (e.button !== 0) return;
    const p = this.toLocal(e);
    if (this.tool === 'select') {
      this.selected = this.hit(e);
      if (this.selected >= 0) {
        this.drag = { start: p, delta: { x: 0, y: 0 } };
        this.canvas.setPointerCapture(e.pointerId);
      }
      this.redraw();
      return;
    }
    if (this.tool === 'poly' && this.pts.length >= 3 && this.pts[0].x === p.x && this.pts[0].y === p.y) {
      // klik mbi pikën e parë: shumëkëndëshi mbyllet
      this.finishPoly(true);
      this.redraw();
      return;
    }
    this.pts.push(p);
    const [a, b, c] = this.pts;
    switch (this.tool) {
      case 'poly':
        break;
      case 'semicircle':
        if (c) {
          if (a.x !== b.x || a.y !== b.y) this.shapes.push(semicircle(a, b, c, this.fill));
          this.pts = [];
        }
        break;
      case 'line':
        if (b) {
          if (a.x !== b.x || a.y !== b.y) this.shapes.push({ kind: 'line', a, b });
          this.pts = [b]; // vazhdo vijën nga pika e fundit; Esc ose klik djathtas e mbyll
        }
        break;
      case 'rect':
        if (b) {
          this.shapes.push({ kind: 'rect', a, b, ...(this.fill ? { fill: true } : {}) });
          this.pts = [];
        }
        break;
      case 'circle':
        if (b) {
          const r = Math.hypot(b.x - a.x, b.y - a.y);
          if (r > 0) this.shapes.push({ kind: 'circle', c: a, r, ...(this.fill ? { fill: true } : {}) });
          this.pts = [];
        }
        break;
      case 'arc':
        if (c) {
          this.shapes.push({ kind: 'arc', c: a, a: b, b: c, sweep: arcSweep(a, b, c) });
          this.pts = [];
        }
        break;
      case 'text': {
        const text = cleanText($<HTMLInputElement>('seText').value);
        if (!text) {
          this.toast(t('seNeedText'), true);
        } else {
          this.shapes.push({ kind: 'text', p: a, text, size: Number($<HTMLSelectElement>('seTextSize').value) || 6 });
        }
        this.pts = [];
        break;
      }
    }
    this.redraw();
  }

  /** Forma që po vizatohet, deri te kursori. */
  private pending(): Shape | null {
    const c = this.cursor;
    if (!c || this.pts.length === 0) {
      if (c && this.tool === 'text') {
        const text = cleanText($<HTMLInputElement>('seText').value);
        if (text) return { kind: 'text', p: c, text, size: Number($<HTMLSelectElement>('seTextSize').value) || 6 };
      }
      return null;
    }
    const [a, b] = this.pts;
    switch (this.tool) {
      case 'poly':
        return { kind: 'poly', pts: [...this.pts, c], closed: false };
      case 'semicircle':
        return b ? semicircle(a, b, c, this.fill) : { kind: 'line', a, b: c };
      case 'line':
        return { kind: 'line', a, b: c };
      case 'rect':
        return { kind: 'rect', a, b: c, fill: this.fill };
      case 'circle':
        return { kind: 'circle', c: a, r: Math.hypot(c.x - a.x, c.y - a.y), fill: this.fill };
      case 'arc':
        return b ? { kind: 'arc', c: a, a: b, b: c, sweep: arcSweep(a, b, c) } : { kind: 'line', a, b: c };
      default:
        return null;
    }
  }

  private redraw(): void {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const b = this.bounds;
    const k = this.k;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#F4F5F7';
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    const X = (x: number) => (x - b.minX) * k;
    const Y = (y: number) => (y - b.minY) * k;

    // rrjeta: çdo njësi, më e theksuar çdo 5
    for (let x = Math.ceil(b.minX); x <= b.maxX; x++) {
      ctx.strokeStyle = x % 5 === 0 ? '#D0D5DC' : '#E5E8EC';
      ctx.beginPath();
      ctx.moveTo(X(x) + 0.5, 0);
      ctx.lineTo(X(x) + 0.5, this.cssH);
      ctx.stroke();
    }
    for (let y = Math.ceil(b.minY); y <= b.maxY; y++) {
      ctx.strokeStyle = y % 5 === 0 ? '#D0D5DC' : '#E5E8EC';
      ctx.beginPath();
      ctx.moveTo(0, Y(y) + 0.5);
      ctx.lineTo(this.cssW, Y(y) + 0.5);
      ctx.stroke();
    }

    // muri (për simbolet e murit) dhe pika e vendosjes
    if ($<HTMLSelectElement>('seMount').value === 'wall') {
      ctx.fillStyle = 'rgba(42, 47, 55, 0.18)';
      ctx.fillRect(0, 0, this.cssW, Y(0));
      ctx.fillStyle = '#4B5563';
      ctx.font = '600 11px "IBM Plex Sans", system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(t('seWall'), 8, Y(b.minY / 2));
    }
    ctx.strokeStyle = '#E8780C';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(0) - 6, Y(0));
    ctx.lineTo(X(0) + 6, Y(0));
    ctx.moveTo(X(0), Y(0) - 6);
    ctx.lineTo(X(0), Y(0) + 6);
    ctx.stroke();

    // format
    ctx.save();
    ctx.translate(X(0), Y(0));
    ctx.scale(k, k);
    ctx.lineWidth = 2 / k;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const paint = (s: Shape, color: string) => {
      const part = shapeToPart(s);
      if (!part) return;
      const path = new Path2D(part.d);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      if (part.fill) ctx.fill(path);
      else ctx.stroke(path);
    };
    this.shapes.forEach((s, i) => {
      if (i !== this.selected) return paint(s, '#1F242B');
      const d = this.drag?.delta;
      paint(d ? translateShape(s, d.x, d.y) : s, '#E8780C');
    });
    const p = this.pending();
    if (p) paint(p, '#2F6FD6');
    ctx.restore();

    // pikat e klikuara dhe kursori
    ctx.fillStyle = '#2F6FD6';
    for (const q of this.pts) ctx.fillRect(X(q.x) - 3, Y(q.y) - 3, 6, 6);
    if (this.cursor) {
      ctx.strokeStyle = '#2F6FD6';
      ctx.lineWidth = 1;
      ctx.strokeRect(X(this.cursor.x) - 4 + 0.5, Y(this.cursor.y) - 4 + 0.5, 8, 8);
    }

    $('seHint').textContent = t(HINTS[this.tool][Math.min(this.pts.length, HINTS[this.tool].length - 1)]);
    this.updatePreview();
  }

  private current(): CustomSymbol {
    const names: CustomSymbol['names'] = {};
    for (const l of ['sq', 'en', 'it', 'de'] as const) {
      const v = $<HTMLInputElement>(`seName_${l}`).value.trim();
      if (v) names[l] = v;
    }
    const sym: CustomSymbol = {
      id: this.editing?.id ?? newId('u'),
      code: $<HTMLInputElement>('seCode').value.trim().toUpperCase(),
      names,
      layer: $<HTMLSelectElement>('seLayer').value,
      mount: $<HTMLSelectElement>('seMount').value === 'center' ? 'center' : 'wall',
      shapes: this.shapes,
    };
    const h = $<HTMLInputElement>('seHeight').value;
    const w = $<HTMLInputElement>('sePower').value;
    if (h !== '' && Number.isFinite(Number(h))) sym.height = Math.max(0, Math.round(Number(h)));
    if (w !== '' && Number.isFinite(Number(w))) sym.power = Math.max(0, Math.round(Number(w)));
    return sym;
  }

  private updatePreview(): void {
    const def = toSymbolDef(this.current());
    $('sePreview').innerHTML = symbolSvg(def);
  }

  private save(): void {
    const sym = this.current();
    if (!sym.code) return this.toast(t('seNeedCode'), true);
    const taken =
      SYMBOLS.some((s) => s.code === sym.code) || (this.store.doc.symbols ?? []).some((s) => s.code === sym.code && s.id !== sym.id);
    if (taken) return this.toast(t('seCodeTaken', { code: sym.code }), true);
    if (sym.shapes.length === 0) return this.toast(t('seNeedShape'), true);
    this.store.commit((d) => {
      const list = d.symbols ?? [];
      const i = list.findIndex((s) => s.id === sym.id);
      if (i >= 0) list[i] = sym;
      else list.push(sym);
      d.symbols = list;
      // simbolet e vendosura marrin shtresën e re
      for (const e of d.entities) if (e.kind === 'symbol' && e.symbol === sym.id) e.layer = sym.layer;
    });
    this.close();
    this.toast(t('seSaved', { code: sym.code }));
    this.onSaved(sym.id);
  }

  /** Fshin simbolin dhe të gjitha vendosjet e tij në plan (Ctrl+Z e kthen). */
  private remove(): void {
    const id = this.editing?.id;
    if (!id) return;
    this.store.commit((d) => {
      d.symbols = (d.symbols ?? []).filter((s) => s.id !== id);
      if (d.symbols.length === 0) delete d.symbols;
      d.entities = d.entities.filter((e) => !(e.kind === 'symbol' && e.symbol === id));
    });
    this.close();
    this.toast(t('seDeleted'));
  }
}

/** Harku i shkurtër nga a te b rreth c: drejtimi sipas anës nga është b. */
function arcSweep(c: Pt, a: Pt, b: Pt): 0 | 1 {
  const cross = (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x);
  return cross >= 0 ? 1 : 0;
}

const HINTS = {
  select: ['seHintSelect'],
  semicircle: ['seHintSemi0', 'seHintSemi1', 'seHintSemi2'],
  poly: ['seHintPoly0', 'seHintPoly1'],
  line: ['seHintLine0', 'seHintLine1'],
  rect: ['seHintRect0', 'seHintRect1'],
  circle: ['seHintCircle0', 'seHintCircle1'],
  arc: ['seHintArc0', 'seHintArc1', 'seHintArc2'],
  text: ['seHintText'],
} as const;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
