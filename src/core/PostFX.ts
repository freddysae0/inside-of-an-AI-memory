import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ChromaticAberrationEffect,
  NoiseEffect,
  VignetteEffect,
  SMAAEffect,
  KernelSize,
  BlendFunction,
  Effect,
} from 'postprocessing';

export interface PostFXOptions {
  gl: THREE.WebGLRenderer;
}

/**
 * Single-fullscreen-draw postprocessing stack via pmndrs/postprocessing.
 * Ordering: SMAA (AA) -> Bloom (highlights) -> CA (RGB split) -> Noise (grain) -> Vignette.
 */
export class PostFX {
  readonly composer: EffectComposer;
  private renderPass: RenderPass;
  readonly bloom: BloomEffect;
  readonly chromaticAberration: ChromaticAberrationEffect;
  readonly noise: NoiseEffect;
  readonly vignette: VignetteEffect;

  constructor(opts: PostFXOptions) {
    this.composer = new EffectComposer(opts.gl, { multisampling: 0 });

    // RenderPass swapped per scene change via setScene().
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.composer.addPass(this.renderPass);

    this.bloom = new BloomEffect({
      intensity: 1.1,
      luminanceThreshold: 0.55,
      luminanceSmoothing: 0.25,
      kernelSize: KernelSize.LARGE,
      mipmapBlur: true,
    });

    this.chromaticAberration = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.0008, 0.0012),
      radialModulation: true,
      modulationOffset: 0.25,
    });

    this.noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
    this.noise.blendMode.opacity.value = 0.18;

    this.vignette = new VignetteEffect({ darkness: 0.6, offset: 0.35 });

    const smaa = new SMAAEffect();
    this.composer.addPass(new EffectPass(this.renderPass.mainCamera, smaa));
    this.composer.addPass(new EffectPass(this.renderPass.mainCamera, this.bloom));
    this.composer.addPass(new EffectPass(this.renderPass.mainCamera, this.chromaticAberration, this.noise, this.vignette));
  }

  /** Append a custom effect (e.g. dissolve transition) as the final pass. */
  appendEffect(effect: Effect): void {
    this.composer.addPass(new EffectPass(this.renderPass.mainCamera, effect));
  }

  setScene(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderPass.mainScene = scene;
    this.renderPass.mainCamera = camera;
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  render(delta: number): void {
    this.composer.render(delta);
  }
}
