import * as THREE from 'three';
import { Effect, BlendFunction } from 'postprocessing';
import dissolveFrag from '../shaders/transition/dissolve.frag';

/**
 * Dissolve transition between two SceneManager rooms.
 *
 * On begin(): snapshot the previous scene to an internal RenderTarget
 * and bind it as `tPrevious`. While active, progress ramps 0→1; the
 * dissolve fragment reveals the new scene under a simplex-noise mask.
 * When idle, the effect's blend function is set to SKIP so the composer
 * shortcircuits the pass entirely.
 */
export class DissolveEffect extends Effect {
  constructor(previousTexture: THREE.Texture | null) {
    super('DissolveEffect', dissolveFrag, {
      blendFunction: BlendFunction.SKIP,
      uniforms: new Map<string, THREE.Uniform>([
        ['tPrevious', new THREE.Uniform(previousTexture)],
        ['uProgress', new THREE.Uniform(1.0)],
        ['uScale', new THREE.Uniform(6.0)],
      ]),
    });
  }
}

export class Transitions {
  readonly effect: DissolveEffect;
  private readonly prevRT: THREE.WebGLRenderTarget;
  private active = false;
  private progress = 0;
  private duration = 1.2;

  constructor(private readonly gl: THREE.WebGLRenderer) {
    this.prevRT = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: false,
      stencilBuffer: false,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
    });
    this.effect = new DissolveEffect(this.prevRT.texture);
  }

  setSize(width: number, height: number): void {
    this.prevRT.setSize(width, height);
  }

  /** Snapshot the outgoing scene/camera pair, then arm the dissolve. */
  begin(outgoing: { scene: THREE.Scene; camera: THREE.Camera } | null, durationSeconds = 1.2): void {
    if (!outgoing) return;
    this.duration = durationSeconds;
    const prevTarget = this.gl.getRenderTarget();
    this.gl.setRenderTarget(this.prevRT);
    this.gl.clear();
    this.gl.render(outgoing.scene, outgoing.camera);
    this.gl.setRenderTarget(prevTarget);

    this.progress = 0;
    this.effect.uniforms.get('uProgress')!.value = 0;
    this.effect.blendMode.blendFunction = BlendFunction.NORMAL;
    this.active = true;
  }

  update(delta: number): void {
    if (!this.active) return;
    this.progress = Math.min(1, this.progress + delta / this.duration);
    this.effect.uniforms.get('uProgress')!.value = this.progress;
    if (this.progress >= 1) {
      this.active = false;
      this.effect.blendMode.blendFunction = BlendFunction.SKIP;
    }
  }

  get isActive(): boolean { return this.active; }
}
