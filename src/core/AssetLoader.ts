/**
 * Tiny construction-staging loader.
 *
 * The project ships no external asset files — what's expensive is
 * scene construction (60–70k particle buffer geometry + surface
 * sampler builds). This loader runs registered factories sequentially,
 * yielding to the event loop between each so the loading overlay can
 * actually paint progress instead of freezing the main thread.
 *
 * Designed so a future GLBLoader / TextureLoader can be slotted in as
 * a factory without changing the orchestration shape.
 */
export type LoaderTask<T> = () => T | Promise<T>;

export interface LoaderProgress {
  loaded: number;       // count completed
  total: number;
  ratio: number;        // [0, 1]
  label: string;        // currently-running task
}

interface Entry { label: string; task: LoaderTask<unknown> }

export class AssetLoader {
  private entries: Entry[] = [];
  private listeners = new Set<(p: LoaderProgress) => void>();

  add<T>(label: string, task: LoaderTask<T>): () => T {
    const idx = this.entries.length;
    this.entries.push({ label, task });
    // Return a deferred getter the caller can use after run() resolves.
    return () => this.results[idx] as T;
  }

  onProgress(cb: (p: LoaderProgress) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private results: unknown[] = [];

  async run(): Promise<void> {
    const total = this.entries.length;
    for (let i = 0; i < total; i++) {
      const entry = this.entries[i]!;
      // Yield so the previous frame's progress paint can land before we
      // re-block the main thread on the next factory.
      await new Promise<void>((r) => setTimeout(r, 0));
      const out = await entry.task();
      this.results[i] = out;
      const loaded = i + 1;
      const p: LoaderProgress = {
        loaded, total, ratio: loaded / total, label: entry.label,
      };
      for (const cb of this.listeners) cb(p);
    }
  }
}
