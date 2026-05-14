import * as THREE from 'three';
import vert from './fireOrb.vert';
import frag from './fireOrb.frag';

export interface FireOrbUniforms {
  [k: string]: THREE.IUniform;
  uTime: { value: number };
  uSeed: { value: THREE.Vector3 };
  uLifeFade: { value: number };
}

export class FireOrbMaterial extends THREE.ShaderMaterial {
  declare uniforms: FireOrbUniforms;
  constructor() {
    super({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      // Fog off — orbs are foreground heat sources, they shouldn't be
      // absorbed by the scene fog.
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: new THREE.Vector3() },
        uLifeFade: { value: 1 },
      },
    });
  }
}
