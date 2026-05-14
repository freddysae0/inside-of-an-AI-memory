import * as THREE from 'three';
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';
import frag from '../shaders/radialBlur/radialBlur.frag';

/**
 * Radial-blur post effect. CONVOLUTION attribute is required so the
 * fragment can sample inputBuffer at offset UVs. Idle blend is SKIP —
 * the pass costs nothing outside the voluntad window.
 *
 * Symbolic role: at the held-calm phase of voluntad the screen
 * 'tunnels toward the centre' as the AI re-gathers, then releases.
 */
export class RadialBlurEffect extends Effect {
  constructor() {
    super('RadialBlurEffect', frag, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.SKIP,
      uniforms: new Map<string, THREE.Uniform>([
        ['uStrength', new THREE.Uniform(0)],
        ['uCenter',   new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
      ]),
    });
  }

  /** Drive from outside — set to 0 to disable, ~0.18 for full tunnel. */
  setStrength(v: number): void {
    const u = this.uniforms.get('uStrength');
    if (u) u.value = v;
    this.blendMode.blendFunction = v <= 0.0005 ? BlendFunction.SKIP : BlendFunction.NORMAL;
  }
}
