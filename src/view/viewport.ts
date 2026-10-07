import type { Vec } from '../core/types';
import type { Rect } from '../core/geometry';

const MIN_SCALE = 0.004; // px për mm
const MAX_SCALE = 4;

/** Kthen koordinatat e botës (mm, Y lart) në piksela ekrani dhe anasjelltas. */
export class Viewport {
  /** Piksela për milimetër. */
  scale = 0.06;
  /** Pozicioni në ekran i origjinës së botës. */
  ox = 0;
  oy = 0;
  width = 1;
  height = 1;

  toScreen(p: Vec): Vec {
    return { x: this.ox + p.x * this.scale, y: this.oy - p.y * this.scale };
  }

  toWorld(p: Vec): Vec {
    return { x: (p.x - this.ox) / this.scale, y: (this.oy - p.y) / this.scale };
  }

  /** Madhësia në mm e n pikselave. */
  px(n: number): number {
    return n / this.scale;
  }

  zoomAt(screen: Vec, factor: number): void {
    const world = this.toWorld(screen);
    this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.scale * factor));
    this.ox = screen.x - world.x * this.scale;
    this.oy = screen.y + world.y * this.scale;
  }

  pan(dx: number, dy: number): void {
    this.ox += dx;
    this.oy += dy;
  }

  /** Përshtat pamjen që drejtkëndëshi r të shihet i gjithi, me hapësirë anash. */
  fit(r: Rect, margin = 48): void {
    const w = Math.max(r.maxX - r.minX, 1000);
    const h = Math.max(r.maxY - r.minY, 1000);
    const s = Math.min((this.width - margin * 2) / w, (this.height - margin * 2) / h);
    this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
    const cx = (r.minX + r.maxX) / 2;
    const cy = (r.minY + r.maxY) / 2;
    this.ox = this.width / 2 - cx * this.scale;
    this.oy = this.height / 2 + cy * this.scale;
  }
}
