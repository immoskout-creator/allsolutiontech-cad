import type { Vec } from '../core/types';

/** Sa piksela lëviz gishti para se prekja të quhet tërheqje dhe jo trokitje. */
const TAP_SLOP = 8;
/** Sa milisekonda mbahet gishti pa lëvizur që të vlejë si klik i djathtë. */
const LONG_PRESS_MS = 550;

/** Veprimet e redaktorit që thërret prekja; janë të njëjtat që thërret miu. */
export interface TouchTarget {
  down(p: Vec, button: number): void;
  move(p: Vec): void;
  up(p: Vec): void;
  /** Dy gishta: zhvendos pamjen me (dx, dy) dhe zmadho me `factor` rreth `center`. */
  pinch(center: Vec, factor: number, dx: number, dy: number): void;
}

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Prekja në tablet dhe telefon. Një gisht punon si miu, por klikimi niset vetëm kur dihet çfarë është:
 * trokitje (gishti ngrihet), tërheqje (gishti lëviz) ose klik i djathtë (gishti mbahet). Kështu, kur bie
 * gishti i dytë, nuk ka mbetur gjysmë muri i nisur: dy gishta zhvendosin dhe zmadhojnë pamjen.
 */
export class TouchGestures {
  private points = new Map<number, Vec>();
  /** Gishti i parë, para se të vendoset nëse është trokitje, tërheqje apo mbajtje. */
  private pending: { id: number; start: Vec; timer: ReturnType<typeof setTimeout> | null } | null = null;
  /** Gishti që po i dërgon redaktorit lëvizjet (si miu me butonin poshtë). */
  private active: number | null = null;
  /** Gishti i mbajtur gjatë, që u dërgua si klik i djathtë: ngritja e tij nuk dërgon më asgjë. */
  private held: number | null = null;
  private pinchLast: { center: Vec; d: number } | null = null;

  constructor(
    private target: TouchTarget,
    private setTimer: (f: () => void, ms: number) => ReturnType<typeof setTimeout> = (f, ms) => setTimeout(f, ms),
    private clearTimer: (t: ReturnType<typeof setTimeout>) => void = (t) => clearTimeout(t),
  ) {}

  get gesturing(): boolean {
    return this.pinchLast !== null;
  }

  down(id: number, p: Vec): void {
    this.points.set(id, p);
    if (this.points.size === 2 && this.active === null) {
      this.dropPending();
      const [a, b] = [...this.points.values()];
      this.pinchLast = { center: mid(a, b), d: Math.max(dist(a, b), 1) };
      return;
    }
    if (this.points.size !== 1) return;
    const timer = this.setTimer(() => this.longPress(id), LONG_PRESS_MS);
    this.pending = { id, start: p, timer };
    // pa miun nuk ka "hover": redaktori duhet ta dijë ku është gishti për kapjen (snap) dhe pamjen paraprake
    this.target.move(p);
  }

  move(id: number, p: Vec): void {
    if (!this.points.has(id)) return;
    this.points.set(id, p);
    if (this.pinchLast) {
      if (this.points.size < 2) return;
      const [a, b] = [...this.points.values()];
      const center = mid(a, b);
      const d = Math.max(dist(a, b), 1);
      this.target.pinch(center, d / this.pinchLast.d, center.x - this.pinchLast.center.x, center.y - this.pinchLast.center.y);
      this.pinchLast = { center, d };
      return;
    }
    if (this.pending?.id === id) {
      if (dist(p, this.pending.start) < TAP_SLOP) return;
      this.start();
    }
    if (this.active === id) this.target.move(p);
  }

  up(id: number, p: Vec): void {
    if (!this.points.delete(id)) return;
    if (this.pinchLast) {
      // gjesti mbaron kur ngrihen të dy gishtat; gishti që mbetet nuk vizaton
      if (this.points.size === 0) {
        this.pinchLast = null;
        this.held = null;
      }
      return;
    }
    if (this.held === id) {
      this.held = null;
      return;
    }
    if (this.pending?.id === id) this.start();
    if (this.active === id) {
      this.target.move(p);
      this.target.up(p);
      this.active = null;
    }
  }

  /** Prekja u ndërpre nga sistemi (p.sh. një njoftim): asgjë nuk niset. */
  cancel(id: number): void {
    if (this.pending?.id === id) this.dropPending();
    if (this.active === id) {
      const p = this.points.get(id);
      if (p) this.target.up(p);
      this.active = null;
    }
    if (this.held === id) this.held = null;
    this.points.delete(id);
    if (this.points.size === 0) this.pinchLast = null;
  }

  private start(): void {
    const pend = this.pending;
    if (!pend) return;
    this.dropPending();
    this.active = pend.id;
    this.target.down(pend.start, 0);
  }

  private longPress(id: number): void {
    if (this.pending?.id !== id) return;
    const start = this.pending.start;
    this.pending = null;
    this.held = id;
    this.target.down(start, 2);
  }

  private dropPending(): void {
    if (this.pending?.timer) this.clearTimer(this.pending.timer);
    this.pending = null;
  }
}
