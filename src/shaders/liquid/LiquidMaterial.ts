import * as THREE from 'three';
import vert from './liquid.vert';
import frag from './liquid.frag';

export interface LiquidUniforms {
  [k: string]: THREE.IUniform;
  uTime: { value: number };
  uAmplitude: { value: number };
  uFrequency: { value: number };
  uEmotion: { value: number };
  uSad: { value: THREE.Color };
  uJoy: { value: THREE.Color };
  uWonder: { value: THREE.Color };
  uRimPower: { value: number };
  uRimIntensity: { value: number };
  uWetness: { value: number };
  uHeat: { value: number };
  uGlow: { value: number };
}

export class LiquidMaterial extends THREE.ShaderMaterial {
  declare uniforms: LiquidUniforms;
  constructor() {
    super({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: 0.22 },
        uFrequency: { value: 1.0 },
        uEmotion: { value: 0 },
        uSad:    { value: new THREE.Color('#162447') },
        uJoy:    { value: new THREE.Color('#ff6f8a') },
        uWonder: { value: new THREE.Color('#7af3d0') },
        uRimPower: { value: 2.2 },
        uRimIntensity: { value: 1.5 },
        uWetness: { value: 0 },
        uHeat:    { value: 0 },
        uGlow:    { value: 0 },
      },
    });
  }
}
