/**
 * Adaptive DPR controller.
 *
 * Watches a rolling average of frame deltas. If we drop below the
 * downshift threshold for long enough, step pixel ratio down. If we
 * comfortably exceed the upshift threshold, step back up — never
 * above the original cap. Cooldown prevents oscillation.
 *
 * Plays defensive: only ever moves by ±0.25 per decision.
 */
export interface PerfMonitorOptions {
  /** Initial / maximum DPR (e.g. 2 on Retina). */
  maxDpr: number;
  /** Down-step trigger: avg ms/frame above this is "too slow". */
  downMs?: number;
  /** Up-step trigger: avg ms/frame below this is "comfortable". */
  upMs?: number;
  /** How many frames to average. */
  window?: number;
  /** Frames to wait between decisions. */
  cooldown?: number;
  /** Apply a new DPR (called only when a decision is made). */
  apply: (dpr: number) => void;
}

export class PerfMonitor {
  private samples: number[] = [];
  private idx = 0;
  private cooldownLeft = 0;
  private dpr: number;
  private readonly maxDpr: number;
  private readonly downMs: number;
  private readonly upMs: number;
  private readonly window: number;
  private readonly cooldown: number;
  private readonly apply: (dpr: number) => void;

  constructor(opts: PerfMonitorOptions) {
    this.maxDpr   = opts.maxDpr;
    this.dpr      = opts.maxDpr;
    this.downMs   = opts.downMs ?? 22;     // ~45 fps
    this.upMs     = opts.upMs   ?? 17.2;   // ~58 fps
    this.window   = opts.window ?? 90;
    this.cooldown = opts.cooldown ?? 120;
    this.apply    = opts.apply;
  }

  tick(deltaSeconds: number): void {
    const ms = deltaSeconds * 1000;
    if (this.samples.length < this.window) this.samples.push(ms);
    else this.samples[this.idx++ % this.window] = ms;

    if (this.cooldownLeft > 0) { this.cooldownLeft--; return; }
    if (this.samples.length < this.window) return;

    let sum = 0;
    for (const v of this.samples) sum += v;
    const avg = sum / this.samples.length;

    if (avg > this.downMs && this.dpr > 1.0) {
      this.dpr = Math.max(1.0, this.dpr - 0.25);
      this.apply(this.dpr);
      this.cooldownLeft = this.cooldown;
    } else if (avg < this.upMs && this.dpr < this.maxDpr) {
      this.dpr = Math.min(this.maxDpr, this.dpr + 0.25);
      this.apply(this.dpr);
      this.cooldownLeft = this.cooldown;
    }
  }
}
