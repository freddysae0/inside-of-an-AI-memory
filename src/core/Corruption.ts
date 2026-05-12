import * as THREE from 'three';
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';
import corruptionFrag from '../shaders/corruption/corruption.frag';

/**
 * Reality Corruption effect. CONVOLUTION attribute is required so the
 * fragment can sample `inputBuffer` at offset UVs (CA + block shift).
 * Idle blend is SKIP so the pass costs nothing outside the CORRUPTION
 * sector.
 */
export class CorruptionEffect extends Effect {
  constructor() {
    super('CorruptionEffect', corruptionFrag, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uTime', new THREE.Uniform(0)],
        ['uIntensity', new THREE.Uniform(0)],
      ]),
    });
  }

  setIntensity(v: number): void {
    const u = this.uniforms.get('uIntensity');
    if (u) u.value = v;
    this.blendMode.blendFunction = v <= 0.001 ? BlendFunction.SKIP : BlendFunction.NORMAL;
  }

  tick(time: number): void {
    const u = this.uniforms.get('uTime');
    if (u) u.value = time;
  }
}
