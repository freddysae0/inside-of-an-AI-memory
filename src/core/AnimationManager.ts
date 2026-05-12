import * as THREE from 'three';

export interface FrameContext {
  /** seconds since start */
  time: number;
  /** seconds since last frame, clamped */
  delta: number;
  /** monotonically increasing frame index */
  frame: number;
}

export type Updater = (ctx: FrameContext) => void;

export class AnimationManager {
  private readonly clock = new THREE.Clock();
  private readonly updaters = new Set<Updater>();
  private frame = 0;
  private rafId: number | null = null;
  private last = 0;

  add(u: Updater): () => void {
    this.updaters.add(u);
    return () => this.updaters.delete(u);
  }

  start(): void {
    if (this.rafId !== null) return;
    this.clock.start();
    this.last = this.clock.getElapsedTime();
    const tick = () => {
      const time = this.clock.getElapsedTime();
      const raw = time - this.last;
      this.last = time;
      // clamp delta to avoid huge jumps after tab visibility loss
      const delta = Math.min(raw, 1 / 30);
      const ctx: FrameContext = { time, delta, frame: this.frame++ };
      for (const u of this.updaters) u(ctx);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.clock.stop();
  }
}
