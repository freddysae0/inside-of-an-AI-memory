import * as THREE from 'three';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { ScrollDirector } from '../core/ScrollDirector';
import { LiquidMaterial } from '../shaders/liquid/LiquidMaterial';
import { TearDrops } from './emotions/TearDrops';
import { JoyOrbs } from './emotions/JoyOrbs';
import { WonderHalo } from './emotions/WonderHalo';

/**
 * EMOTIONS — three discrete visual vocabularies, one per state, all
 * orbiting the same central blob.
 *
 *   sad     → gravity made visible. Drops fall from the blob's
 *             underside and fade into the fog.
 *   joy     → outward radiation. Bright warm orbs shoot from the
 *             centre in radial bursts.
 *   wonder  → continuous dilation. Translucent cyan halos perpetually
 *             expand around the blob.
 *
 * Earlier builds tried to communicate emotion through palette shifts
 * alone, which read as 'a blob changing colour'. Distinct visual
 * vocabularies per state let the meaning land in under two seconds of
 * looking — even without the copy, the user reads 'something is
 * falling here', 'something is leaving here', 'something is reaching
 * here'.
 */
export class Emotions implements MemoryScene {
  readonly id = 'emotions';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private readonly blob: THREE.Mesh;
  private readonly material: LiquidMaterial;
  private readonly fog: THREE.FogExp2;
  private readonly sectorIndex = 2;
  private readonly tint = new THREE.Color();

  // --- Per-emotion subsystems -----------------------------------------
  private readonly tears = new TearDrops();
  private readonly orbs  = new JoyOrbs();
  private readonly halo  = new WonderHalo();

  constructor(private readonly scroll: ScrollDirector) {
    // Denser fog than before — drops should *disappear into it*, not
    // fall offscreen still fully visible. Slightly warmer base hue so
    // joy can warm it further without looking radioactive.
    this.fog = new THREE.FogExp2(0x0b0a18, 0.17);
    this.scene.fog = this.fog;
    this.camera.position.set(0, 0, 3.6);

    this.material = new LiquidMaterial();
    this.blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 80), this.material);
    this.scene.add(this.blob);

    this.scene.add(this.tears.group);
    this.scene.add(this.orbs.group);
    this.scene.add(this.halo.group);
  }

  enter(): void {}
  exit(): void {}

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

    // --- Per-emotion weights ------------------------------------------
    // Triangle bells over [0, 0.5, 1]. Each subsystem's weight peaks at
    // its anchor, falls to 0 at the neighbouring anchors. Overlapping
    // regions let two vocabularies briefly coexist at transitions — sad
    // drops still falling as the first joy orb fires — which is the
    // right symbolic read for an emotional transition.
    const sadW    = 1 - THREE.MathUtils.smoothstep(local, 0.0, 0.5);
    const joyW    =
      THREE.MathUtils.smoothstep(local, 0.0, 0.5)
      * (1 - THREE.MathUtils.smoothstep(local, 0.5, 1.0));
    const wonderW = THREE.MathUtils.smoothstep(local, 0.5, 1.0);

    this.tears.weight = sadW;
    this.orbs.weight  = joyW;
    this.halo.weight  = wonderW;

    this.tears.update(ctx);
    this.orbs.update(ctx);
    this.halo.update(ctx);

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
