import * as THREE from 'three';
import vert from './living.vert';
import frag from './living.frag';

export interface LivingMaterialUniforms {
  [k: string]: THREE.IUniform;
  uTime: { value: number };
  uBreath: { value: number };
  uPulse: { value: number };
  uFrequency: { value: number };
  uPointer: { value: THREE.Vector3 };
  uPointerStrength: { value: number };
  uColorDeep: { value: THREE.Color };
  uColorSurface: { value: THREE.Color };
  uColorRim: { value: THREE.Color };
  uRimPower: { value: number };
  uRimIntensity: { value: number };
}

export class LivingMaterial extends THREE.ShaderMaterial {
  declare uniforms: LivingMaterialUniforms;

  constructor() {
    super({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uTime: { value: 0 },
        uBreath: { value: 0.08 },
        uPulse: { value: 0.04 },
        uFrequency: { value: 1.6 },
        uPointer: { value: new THREE.Vector3(10, 10, 10) },
        uPointerStrength: { value: 0.0 },
        uColorDeep: { value: new THREE.Color('#0a1424') },
        uColorSurface: { value: new THREE.Color('#5d8cff') },
        uColorRim: { value: new THREE.Color('#aac8ff') },
        uRimPower: { value: 2.4 },
        uRimIntensity: { value: 1.3 },
      },
    });
  }
}
