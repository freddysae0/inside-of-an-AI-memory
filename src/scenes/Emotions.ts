import * as THREE from 'three';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { ScrollDirector } from '../core/ScrollDirector';
import { LiquidMaterial } from '../shaders/liquid/LiquidMaterial';

/**
 * EMOTIONS — a large liquid blob whose surface color glides through
 * three emotion anchors (sad → joy → wonder) as the user descends the
 * sector. The scene's fog hue is tinted with the same blend so the
 * negative space participates in the mood.
 */
export class Emotions implements MemoryScene {
  readonly id = 'emotions';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private readonly blob: THREE.Mesh;
  private readonly material: LiquidMaterial;
  private readonly fog: THREE.FogExp2;
  private readonly sectorIndex = 2;
  // Workspace color reused per frame so we don't allocate during update.
  private readonly tint = new THREE.Color();

  constructor(private readonly scroll: ScrollDirector) {
    this.fog = new THREE.FogExp2(0x0a0a18, 0.15);
    this.scene.fog = this.fog;
    this.camera.position.set(0, 0, 3.6);

    this.material = new LiquidMaterial();
    // High subdivision = smooth liquid silhouette under vertex displacement.
    this.blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 80), this.material);
    this.scene.add(this.blob);
  }

  enter(): void {}
  exit(): void {}

  /** Boost the liquid amplitude by an audio-derived 0..1 value. */
  setAudioBass(v: number): void {
    this.material.uniforms.uAmplitude.value = 0.22 + v * 0.14;
  }

  update(ctx: FrameContext): void {
    this.blob.rotation.y = ctx.time * 0.05;
    this.blob.rotation.x = Math.sin(ctx.time * 0.13) * 0.2;

    const u = this.material.uniforms;
    u.uTime.value = ctx.time;
    const local = this.scroll.sector === this.sectorIndex ? this.scroll.local : 0;
    u.uEmotion.value = local;

    // Tint fog toward the active emotion — same palette logic as the shader.
    this.tint.copy(u.uSad.value).lerp(u.uJoy.value, Math.min(1, local * 2));
    if (local > 0.5) this.tint.lerp(u.uWonder.value, (local - 0.5) * 2);
    this.fog.color.copy(this.tint).multiplyScalar(0.25);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
