import * as THREE from 'three';
import type { FrameContext } from './AnimationManager';

export interface MemoryScene {
  readonly id: string;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  enter(): void;
  exit(): void;
  update(ctx: FrameContext): void;
  resize(width: number, height: number): void;
}

/**
 * Holds the active "memory room" and orchestrates transitions.
 * For now: hard cut. Portal/dissolve transition lands in its own commit.
 */
export class SceneManager {
  private readonly registry = new Map<string, MemoryScene>();
  private active: MemoryScene | null = null;

  register(scene: MemoryScene): void {
    this.registry.set(scene.id, scene);
  }

  goto(id: string): void {
    const next = this.registry.get(id);
    if (!next) throw new Error(`SceneManager: unknown scene "${id}"`);
    if (this.active === next) return;
    this.active?.exit();
    this.active = next;
    this.active.enter();
  }

  get current(): MemoryScene | null {
    return this.active;
  }

  update(ctx: FrameContext): void {
    this.active?.update(ctx);
  }

  resize(width: number, height: number): void {
    for (const s of this.registry.values()) s.resize(width, height);
  }
}
