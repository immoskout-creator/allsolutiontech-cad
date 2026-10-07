import type { Store } from '../core/store';
import { newId, WALL_LAYER, type Vec, type Wall } from '../core/types';
import {
  dist,
  distToSegment,
  inRect,
  mid,
  ortho,
  rectFrom,
  same,
  segmentTouchesRect,
  snapToGrid,
  sub,
  add,
  len,
  scale,
} from '../core/geometry';
import type { Overlay, SnapKind } from '../view/renderer';
import type { Viewport } from '../view/viewport';

export type ToolId = 'select' | 'wall' | 'pan';

export interface Settings {
  snap: boolean;
  grid: boolean;
  ortho: boolean;
  /** Hapi i snap-it në rrjetë, mm. */
  gridStep: number;
  /** Trashësia e mureve të reja, mm. */
  wallThickness: number;
}

const SNAP_PX = 10;
const HIT_PX = 6;
const DRAG_PX = 4;

type Drag =
  | { kind: 'pan'; last: Vec }
  | { kind: 'box'; start: Vec }
  | { kind: 'move'; startWorld: Vec; startScreen: Vec; ids: Set<string>; active: boolean };

/**
 * Përpunon miun dhe tastierën mbi fletën e vizatimit:
 * zgjedhje, zhvendosje, vizatim muresh, zoom dhe lëvizje e pamjes.
 */
export class Editor {
  tool: ToolId = 'select';
  overlay: Overlay = {};
  /** Pika e fillimit të murit që po vizatohet. */
  chainStart: Vec | null = null;
  /** Gjatësia e shkruar me tastierë gjatë vizatimit (në cm). */
  typed = '';
  cursorWorld: Vec = { x: 0, y: 0 };
  snapKind: SnapKind = 'none';

  private drag: Drag | null = null;
  private spaceDown = false;
  private shiftDown = false;

  constructor(
    private store: Store,
    private vp: Viewport,
    public settings: Settings,
    private onChange: () => void,
  ) {}

  setTool(tool: ToolId): void {
    this.tool = tool;
    this.endChain();
    this.overlay.hoverId = null;
    this.onChange();
  }

  endChain(): void {
    this.chainStart = null;
    this.typed = '';
    this.overlay.wallPreview = undefined;
    this.onChange();
  }

  // ---- kapja e pikave (snap) ----

  private snapPoint(screen: Vec, from: Vec | null): { p: Vec; kind: SnapKind } {
    const raw = this.vp.toWorld(screen);
    const tol = this.vp.px(SNAP_PX);
    if (this.settings.snap) {
      let best: { p: Vec; kind: SnapKind; d: number } | null = null;
      for (const e of this.store.editable()) {
        for (const p of [e.a, e.b]) {
          const d = dist(raw, p);
          if (d <= tol && (!best || d < best.d)) best = { p, kind: 'endpoint', d };
        }
      }
      if (!best) {
        for (const e of this.store.editable()) {
          const m = mid(e.a, e.b);
          const d = dist(raw, m);
          if (d <= tol && (!best || d < best.d)) best = { p: m, kind: 'midpoint', d };
        }
      }
      if (best) return { p: best.p, kind: best.kind };
    }
    let p = raw;
    if (from && (this.settings.ortho || this.shiftDown)) p = ortho(from, p);
    if (this.settings.snap) {
      const g = snapToGrid(p, this.settings.gridStep);
      p = from && (this.settings.ortho || this.shiftDown) ? ortho(from, g) : g;
      return { p, kind: 'grid' };
    }
    return { p, kind: 'none' };
  }

  hitTest(screen: Vec): string | null {
    const p = this.vp.toWorld(screen);
    let best: { id: string; d: number } | null = null;
    for (const e of this.store.editable()) {
      const d = distToSegment(p, e.a, e.b) - e.thickness / 2;
      if (d <= this.vp.px(HIT_PX) && (!best || d < best.d)) best = { id: e.id, d };
    }
    return best?.id ?? null;
  }

  // ---- miu ----

  pointerDown(screen: Vec, button: number, shift: boolean): void {
    this.shiftDown = shift;
    if (button === 1 || this.spaceDown || this.tool === 'pan') {
      this.drag = { kind: 'pan', last: screen };
      return;
    }
    if (button === 2) {
      if (this.tool === 'wall') this.endChain();
      return;
    }
    if (button !== 0) return;

    if (this.tool === 'wall') {
      const { p } = this.snapPoint(screen, this.chainStart);
      this.placeWallPoint(p);
      return;
    }

    const hit = this.hitTest(screen);
    if (hit) {
      if (shift) {
        const sel = new Set(this.store.selection);
        if (sel.has(hit)) sel.delete(hit);
        else sel.add(hit);
        this.store.setSelection(sel);
        return;
      }
      if (!this.store.selection.has(hit)) this.store.setSelection([hit]);
      const { p } = this.snapPoint(screen, null);
      this.drag = { kind: 'move', startWorld: p, startScreen: screen, ids: new Set(this.store.selection), active: false };
    } else {
      if (!shift) this.store.setSelection([]);
      this.drag = { kind: 'box', start: screen };
    }
  }

  pointerMove(screen: Vec, shift: boolean): void {
    this.shiftDown = shift;
    this.overlay.cursor = screen;
    const d = this.drag;

    if (d?.kind === 'pan') {
      this.vp.pan(screen.x - d.last.x, screen.y - d.last.y);
      d.last = screen;
    } else if (d?.kind === 'box') {
      this.overlay.box = { a: d.start, b: screen, crossing: screen.x < d.start.x };
    } else if (d?.kind === 'move') {
      if (!d.active && dist(screen, d.startScreen) > DRAG_PX) d.active = true;
      if (d.active) {
        const { p } = this.snapPoint(screen, null);
        this.overlay.moveIds = d.ids;
        this.overlay.moveDelta = sub(p, d.startWorld);
      }
    }

    if (this.tool === 'wall' && d?.kind !== 'pan') {
      const s = this.snapPoint(screen, this.chainStart);
      this.cursorWorld = s.p;
      this.snapKind = s.kind;
      this.overlay.snap = s;
      if (this.chainStart) {
        this.overlay.wallPreview = { a: this.chainStart, b: s.p, thickness: this.settings.wallThickness };
      }
    } else {
      this.cursorWorld = this.vp.toWorld(screen);
      this.snapKind = 'none';
      this.overlay.snap = undefined;
      if (this.tool === 'select' && !d) this.overlay.hoverId = this.hitTest(screen);
    }
    this.onChange();
  }

  pointerUp(screen: Vec): void {
    const d = this.drag;
    this.drag = null;
    if (d?.kind === 'box') {
      this.overlay.box = undefined;
      if (dist(screen, d.start) > DRAG_PX) {
        const r = rectFrom(this.vp.toWorld(d.start), this.vp.toWorld(screen));
        const crossing = screen.x < d.start.x;
        const ids = this.store
          .editable()
          .filter((e) => (crossing ? segmentTouchesRect(e.a, e.b, r) : inRect(e.a, r) && inRect(e.b, r)))
          .map((e) => e.id);
        this.store.setSelection([...this.store.selection, ...ids]);
      }
    } else if (d?.kind === 'move') {
      const delta = this.overlay.moveDelta;
      this.overlay.moveIds = undefined;
      this.overlay.moveDelta = undefined;
      if (d.active && delta && (delta.x !== 0 || delta.y !== 0)) {
        this.store.commit((doc) => {
          for (const e of doc.entities) {
            if (!d.ids.has(e.id)) continue;
            e.a = add(e.a, delta);
            e.b = add(e.b, delta);
          }
        });
      }
    }
    this.onChange();
  }

  pointerLeave(): void {
    this.overlay.cursor = undefined;
    this.overlay.snap = undefined;
    this.overlay.hoverId = null;
    this.onChange();
  }

  wheel(screen: Vec, deltaY: number): void {
    this.vp.zoomAt(screen, Math.exp(-deltaY * 0.0015));
    this.onChange();
  }

  doubleClick(): void {
    if (this.tool === 'wall') this.endChain();
  }

  // ---- muret ----

  private placeWallPoint(p: Vec): void {
    const start = this.chainStart;
    if (!start) {
      this.chainStart = p;
      this.overlay.wallPreview = { a: p, b: p, thickness: this.settings.wallThickness };
      this.onChange();
      return;
    }
    if (same(start, p)) {
      this.endChain();
      return;
    }
    this.addWall(start, p);
    this.chainStart = p;
    this.typed = '';
    this.overlay.wallPreview = { a: p, b: p, thickness: this.settings.wallThickness };
    this.onChange();
  }

  private addWall(a: Vec, b: Vec): void {
    const w: Wall = { id: newId('w'), kind: 'wall', layer: WALL_LAYER, a, b, thickness: this.settings.wallThickness };
    this.store.commit((doc) => {
      doc.entities.push(w);
    });
  }

  /** Mbyll murin me gjatësinë e shkruar (cm) në drejtimin aktual të kursorit. */
  private applyTyped(): void {
    const start = this.chainStart;
    const cm = parseFloat(this.typed.replace(',', '.'));
    this.typed = '';
    if (!start || !(cm > 0)) return;
    let dir = sub(this.cursorWorld, start);
    if (len(dir) === 0) dir = { x: 1, y: 0 };
    const end = add(start, scale(dir, (cm * 10) / len(dir)));
    this.placeWallPoint({ x: Math.round(end.x), y: Math.round(end.y) });
  }

  // ---- tastiera ----

  /** Kthen true kur tasti u përdor nga fleta e vizatimit. */
  keyDown(e: KeyboardEvent): boolean {
    this.shiftDown = e.shiftKey;
    if (e.key === ' ') {
      this.spaceDown = true;
      return true;
    }
    if (this.tool === 'wall' && this.chainStart) {
      if (/^[0-9.,]$/.test(e.key)) {
        this.typed += e.key;
        this.onChange();
        return true;
      }
      if (e.key === 'Backspace' && this.typed) {
        this.typed = this.typed.slice(0, -1);
        this.onChange();
        return true;
      }
      if (e.key === 'Enter') {
        if (this.typed) this.applyTyped();
        else this.endChain();
        return true;
      }
    }
    if (e.key === 'Escape') {
      if (this.chainStart) this.endChain();
      else this.store.setSelection([]);
      return true;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.deleteSelection();
      return true;
    }
    return false;
  }

  keyUp(e: KeyboardEvent): void {
    this.shiftDown = e.shiftKey;
    if (e.key === ' ') this.spaceDown = false;
  }

  deleteSelection(): void {
    const ids = this.store.selection;
    if (ids.size === 0) return;
    this.store.commit((doc) => {
      doc.entities = doc.entities.filter((x) => !ids.has(x.id));
    });
  }
}
