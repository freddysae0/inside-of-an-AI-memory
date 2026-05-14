import * as THREE from 'three';
import vert from './waterDrop.vert';
import frag from './waterDrop.frag';

export interface WaterDropUniforms {
  [k: string]: THREE.IUniform;
  uTime: { value: number };
  uOpacity: { value: number };
  uColorDeep: { value: THREE.Color };
  uColorEdge: { value: THREE.Color };
}

/**
 * Refractive water drop for the sad tear subsystem. Doesn't actually
 * refract anything (no environment to sample) — it fakes the read with
 * a thin fresnel rim, an internal hotspot, and a faint translucent
 * body. At the scale tears appear on screen, those three cues sell
 * 'wet' more honestly than a true refraction pass would cost.
 *
 * Fog injection is manual via #ifdef USE_FOG because we're outside the
 * standard MeshXxxMaterial onBeforeCompile path; pmndrs-style shader
 * authoring keeps every uniform visible.
 */
export class WaterDropMaterial extends THREE.ShaderMaterial {
  declare uniforms: WaterDropUniforms;
  constructor() {
    super({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uOpacity: { value: 1 },
          uColorDeep: { value: new THREE.Color('#1a2c54') },
          uColorEdge: { value: new THREE.Color('#9cc4ff') },
        },
      ]) as unknown as WaterDropUniforms,
    });
  }
}
