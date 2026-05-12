import * as THREE from 'three';

/**
 * Pointer state in three useful spaces:
 *  - ndc    : (-1..1) normalised device coords, for raycasting
 *  - uv     : ( 0..1) for shader uniforms
 *  - smooth : ndc lerped over time, for inertia-driven camera/parallax
 *  - velocity: derivative of smooth, for velocity-reactive shaders
 */
export class Input {
  readonly ndc = new THREE.Vector2();
  readonly uv = new THREE.Vector2(0.5, 0.5);
  readonly smooth = new THREE.Vector2();
  readonly velocity = new THREE.Vector2();
  private readonly prevSmooth = new THREE.Vector2();
  /** 0..1 smoothing factor per second of catch-up */
  ease = 6;

  constructor(target: Window | HTMLElement = window) {
    const handler = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      this.uv.set(x, 1 - y);
      this.ndc.set(x * 2 - 1, -(y * 2 - 1));
    };
    target.addEventListener('pointermove', handler as EventListener, { passive: true });
  }

  /** call from AnimationManager update */
  update(delta: number): void {
    this.prevSmooth.copy(this.smooth);
    const k = 1 - Math.exp(-this.ease * delta);
    this.smooth.lerp(this.ndc, k);
    this.velocity.subVectors(this.smooth, this.prevSmooth).multiplyScalar(1 / Math.max(delta, 1e-4));
  }
}
