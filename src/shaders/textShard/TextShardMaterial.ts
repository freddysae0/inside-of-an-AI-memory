import * as THREE from 'three';
import vert from './textShard.vert';
import frag from './textShard.frag';

export interface TextShardUniforms {
  [k: string]: THREE.IUniform;
  uText: { value: THREE.Texture };
  uTime: { value: number };
  uIntensity: { value: number };
  uOpacity: { value: number };
  uColor: { value: THREE.Color };
  uRimColor: { value: THREE.Color };
}

export class TextShardMaterial extends THREE.ShaderMaterial {
  declare uniforms: TextShardUniforms;
  constructor(textTexture: THREE.Texture) {
    super({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uText: { value: textTexture },
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uOpacity:  { value: 1 },
        uColor:    { value: new THREE.Color('#cfd8ff') },
        uRimColor: { value: new THREE.Color('#ff8aa6') },
      },
    });
  }
}
