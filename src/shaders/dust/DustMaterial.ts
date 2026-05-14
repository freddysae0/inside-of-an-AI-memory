import * as THREE from 'three';
import vert from './dust.vert';
import frag from './dust.frag';

export interface DustUniforms {
  [k: string]: THREE.IUniform;
  uTime: { value: number };
  uForm: { value: number };
  uSize: { value: number };
  uDriftScale: { value: number };
  uOpacity: { value: number };
  uLostThreshold: { value: number };
  uTargetOffset: { value: THREE.Vector3 };
  uColorA: { value: THREE.Color };
  uColorB: { value: THREE.Color };
}

export class DustMaterial extends THREE.ShaderMaterial {
  declare uniforms: DustUniforms;
  constructor() {
    super({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uForm: { value: 0 },
        uSize: { value: 1.4 },
        uDriftScale: { value: 0.55 },
        uOpacity: { value: 0.95 },
        uLostThreshold: { value: 1.1 },        // > max seed → no lost particles
        uTargetOffset: { value: new THREE.Vector3() },
        uColorA: { value: new THREE.Color('#7ea8ff') },
        uColorB: { value: new THREE.Color('#c8b5ff') },
      },
    });
  }
}
