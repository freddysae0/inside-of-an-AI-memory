import Lenis from 'lenis';

/**
 * One scroll bar to rule the whole experience.
 *
 * Exposes:
 *  - journey ∈ [0, 1] — global progress through the AI memory core
 *  - sector  ∈ [0, sectorCount-1] — current sector index
 *  - local   ∈ [0, 1] — progress *within* the current sector
 *
 * Smoothing is delegated to Lenis (RAF-driven, exponential ease).
 */
export class ScrollDirector {
  readonly lenis: Lenis;
  readonly sectorCount: number;

  /** Latest raw progress in [0, 1] after Lenis easing. */
  journey = 0;
  sector = 0;
  local = 0;

  private listeners = new Set<(prev: number, next: number) => void>();

  constructor(sectorCount: number) {
    this.sectorCount = sectorCount;
    this.lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.9,
      touchMultiplier: 1.2,
      smoothWheel: true,
    });
  }

  /** call from the rAF tick — Lenis needs a millisecond timestamp. */
  update(timeSeconds: number): void {
    this.lenis.raf(timeSeconds * 1000);

    const max = Math.max(1, this.lenis.limit);
    const next = Math.min(1, Math.max(0, this.lenis.scroll / max));
    const prevSector = this.sector;
    this.journey = next;

    const scaled = this.journey * this.sectorCount;
    const sector = Math.min(this.sectorCount - 1, Math.floor(scaled));
    this.sector = sector;
    this.local = Math.min(1, Math.max(0, scaled - sector));

    if (sector !== prevSector) {
      for (const cb of this.listeners) cb(prevSector, sector);
    }
  }

  onSectorChange(cb: (prev: number, next: number) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** programmatic jump (used by HUD links / debug). */
  goto(sectorIndex: number): void {
    const target = (sectorIndex / this.sectorCount) * this.lenis.limit;
    this.lenis.scrollTo(target, { immediate: false });
  }
}
