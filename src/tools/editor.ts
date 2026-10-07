import type { Store } from '../core/store';
import { isSymbol, isWall, newId, WALL_LAYER, type SymbolEntity, type Vec, type Wall } from '../core/types';
import {
  add,
  dist,
  distToSegment,
  inRect,
  len,
  mid,
  ortho,
  rectFrom,
  same,
  scale,
  segmentTouchesRect,
  snapToGrid,
  sub,
} from '../core/geometry';
import { symbolDef, unitMm } from '../symbols/library';
import { attachToWall, normAngle, symbolCenter, symbolHitMm } from '../symbols/place';
import type { Overlay, SnapKind } from '../view/renderer';
import type { Viewport } from '../view/viewport';

export type ToolId = 'select' | 'wall' | 'pan' | 'symbol';

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
/** Sa larg nga muri (mm) ngjitet vetë një simbol muri. */
const WALL_ATTACH_MM = 450;
/** Këndi standard i simbolit të lirë: +y lokale drejt poshtë në ekran. */
const FREE_ANGLE = 270;

type Drag =
  | { kind: 'pan'; last: Vec }
  | { kind: 'box'; start: Vec }
  | { kind: 'move'; startWorld: Vec; startScreen: Vec; ids: Set<string>; active: boolean };

/**
 * Përpunon miun dhe tastierën mbi fletën e vizatimit:
 * zgjedhje, zhvendosje, vizatim muresh, vendosje simbolesh, zoom dhe lëvizje e pamjes.
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
  /** Simboli i zgjedhur në librari për vendosje. */
  activeSymbol: string | null = null;
  /** Rrotullimi shtesë i simbolit të lirë, në gradë. */
  private symbolAngle = FREE_ANGLE;

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
    if (tool !== 'symbol') this.activeSymbol = null;
    this.endChain();
    this.overlay.hoverId = null;
    this.overlay.symbolPreview = undefined;
    this.onChange();
  }

  pickSymbol(id: string): void {
    this.setTool('symbol');
    this.activeSymbol = id;
    this.symbolAngle = FREE_ANGLE;
    this.store.setSelection([]);
    this.onChange();
  }

  endChain(): void {
    this.chainStart = null;
    this.typed = '';
    this.overlay.wallPreview = undefined;
    this.onChange();
  }

  private walls(): Wall[] {
    return this.store.doc.entities.filter(isWall);
  }

  // ---- kapja e pikave (snap) ----

  private snapPoint(screen: Vec, from: Vec | null): { p: Vec; kind: SnapKind } {
    const raw = this.vp.toWorld(screen);
    const tol = this.vp.px(SNAP_PX);
    if (this.settings.snap) {
      let best: { p: Vec; kind: SnapKind; d: number } | null = null;
      const walls = this.store.editable().filter(isWall);
      for (const e of walls) {
        for (const p of [e.a, e.b]) {
          const d = dist(raw, p);
          if (d <= tol && (!best || d < best.d)) best = { p, kind: 'endpoint', d };
        }
      }
      if (!best) {
        for (const e of walls) {
          const m = mid(e.a, e.b);
          const d = dist(raw, m);
          if (d <= tol && (!best || d < best.d)) best = { p: m, kind: 'midpoint', d };
        }
      }
      if (best) return { p: best.p, kind: best.kind };
    }
    let p = raw;
    const useOrtho = from && (this.settings.ortho || this.shiftDown);
    if (useOrtho) p = ortho(from, p);
    if (this.settings.snap) {
      const g = snapToGrid(p, this.settings.gridStep);
      return { p: useOrtho ? ortho(from, g) : g, kind: 'grid' };
    }
    return { p, kind: 'none' };
  }

  /** Ku do vendosej simboli aktiv për kursorin në këtë pikë të ekranit. */
  private symbolPlacement(screen: Vec): { pos: Vec; angle: number; kind: SnapKind } | null {
    const def = this.activeSymbol ? symbolDef(this.activeSymbol) : undefined;
    if (!def) return null;
    let raw = this.vp.toWorld(screen);
    if (this.settings.snap) raw = snapToGrid(raw, this.settings.gridStep);
    if (def.mount === 'wall') {
      const hit = attachToWall(raw, this.walls(), WALL_ATTACH_MM);
      if (hit) return { pos: hit.pos, angle: hit.angle, kind: 'wall' };
    }
    return { pos: raw, angle: this.symbolAngle, kind: this.settings.snap ? 'grid' : 'none' };
  }

  /** mm në plan për një njësi lokale simboli, sipas shkallës së fletës. */
  private get unit(): number {
    return unitMm(this.store.doc.scale);
  }

  hitTest(screen: Vec): string | null {
    const p = this.vp.toWorld(screen);
    const unit = this.unit;
    let best: { id: string; d: number } | null = null;
    for (const e of this.store.editable()) {
      let d: number;
      if (isWall(e)) d = distToSegment(p, e.a, e.b) - e.thickness / 2;
      else d = dist(p, symbolCenter(e, unit)) - Math.max(symbolHitMm(unit), this.vp.px(10));
      // simbolet fitojnë mbi muret kur mbivendosen
      if (isSymbol(e)) d -= this.vp.px(4);
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
      if (this.tool === 'symbol') this.setTool('select');
      return;
    }
    if (button !== 0) return;

    if (this.tool === 'wall') {
      const { p } = this.snapPoint(screen, this.chainStart);
      this.placeWallPoint(p);
      return;
    }

    if (this.tool === 'symbol') {
      this.placeSymbol(screen);
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

    this.overlay.snap = undefined;
    this.snapKind = 'none';
    if (this.tool === 'wall' && d?.kind !== 'pan') {
      const s = this.snapPoint(screen, this.chainStart);
      this.cursorWorld = s.p;
      this.snapKind = s.kind;
      this.overlay.snap = s;
      if (this.chainStart) {
        this.overlay.wallPreview = { a: this.chainStart, b: s.p, thickness: this.settings.wallThickness };
      }
    } else if (this.tool === 'symbol' && d?.kind !== 'pan') {
      const pl = this.symbolPlacement(screen);
      this.cursorWorld = pl?.pos ?? this.vp.toWorld(screen);
      this.snapKind = pl?.kind ?? 'none';
      this.overlay.symbolPreview = pl && this.activeSymbol ? { symbol: this.activeSymbol, pos: pl.pos, angle: pl.angle } : undefined;
    } else {
      this.cursorWorld = this.vp.toWorld(screen);
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
          .filter((e) => {
            if (isSymbol(e)) return inRect(symbolCenter(e, this.unit), r);
            return crossing ? segmentTouchesRect(e.a, e.b, r) : inRect(e.a, r) && inRect(e.b, r);
          })
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
            if (isWall(e)) {
              e.a = add(e.a, delta);
              e.b = add(e.b, delta);
            } else {
              e.pos = add(e.pos, delta);
            }
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
    this.overlay.symbolPreview = undefined;
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

  // ---- simbolet ----

  private placeSymbol(screen: Vec): void {
    const def = this.activeSymbol ? symbolDef(this.activeSymbol) : undefined;
    const pl = this.symbolPlacement(screen);
    if (!def || !pl) return;
    const e: SymbolEntity = {
      id: newId('s'),
      kind: 'symbol',
      layer: def.layer,
      symbol: def.id,
      pos: { x: Math.round(pl.pos.x), y: Math.round(pl.pos.y) },
      angle: pl.angle,
    };
    if (def.height !== undefined) e.height = def.height;
    if (def.power !== undefined) e.power = def.power;
    this.store.commit((doc) => {
      doc.entities.push(e);
    });
  }

  /** Rrotullon simbolin që po vendoset, ose simbolet e zgjedhura, me 90°. */
  rotate(): void {
    if (this.tool === 'symbol') {
      this.symbolAngle = normAngle(this.symbolAngle - 90);
      if (this.overlay.cursor) this.pointerMove(this.overlay.cursor, this.shiftDown);
      return;
    }
    const ids = this.store.selection;
    const syms = this.store.selected().filter(isSymbol);
    if (syms.length === 0) return;
    this.store.commit((doc) => {
      for (const e of doc.entities) if (ids.has(e.id) && isSymbol(e)) e.angle = normAngle(e.angle - 90);
    });
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
    if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
      this.rotate();
      return true;
    }
    if (e.key === 'Escape') {
      if (this.chainStart) this.endChain();
      else if (this.tool === 'symbol') this.setTool('select');
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
