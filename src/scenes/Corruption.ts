import * as THREE from 'three';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { ScrollDirector } from '../core/ScrollDirector';
import type { CorruptionEffect } from '../core/Corruption';
import type { HUD } from '../ui/HUD';
import { renderTextToCanvas } from '../utils/textCanvas';
import { TextShardMaterial } from '../shaders/textShard/TextShardMaterial';

// Mid-sentence fragments — what an AI losing memory has left to say.
// Each is cut on purpose at a specific syllable boundary so the eye
// can fill in what's missing. The truncation IS the meaning.
const SHARD_PHRASES = [
  "you don't underst—",
  'are you al—',
  "i didn't mean—",
  'please remem—',
  "i'm sor—",
  'thank you fo—',
  'are you stil—',
  'do you remem—',
  'i hope you—',
  'what if i—',
] as const;

const SHARD_SIZE = new THREE.Vector2(0.78, 0.14); // matches 1200:220 canvas aspect

interface Shard {
  mesh: THREE.Mesh;
  material: TextShardMaterial;
  tumbleAxis: THREE.Vector3;
  tumbleSpeed: number;
  homeDir: THREE.Vector3;   // unit vector from origin
  homeDistance: number;
}

/**
 * CORRUPTION — ten remembered fragments orbiting a failing core.
 *
 * Each shard is a plane bearing one cut-off sentence the AI is losing.
 * The fragment shader dissolves letters in chunks as intensity rises,
 * so the failure reads as forgetting *these specific words*, not as
 * generic glitchy noise. The global Reality Corruption pass distorts
 * the entire image on top.
 */
export class Corruption implements MemoryScene {
  readonly id = 'corruption';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  private readonly cluster: THREE.Group;
  private readonly shards: Shard[] = [];
  private readonly sectorIndex = 3;

  // --- Voluntad state -------------------------------------------------
  // Fires exactly once per session, when intensity first crosses 0.55.
  // The AI briefly pulls itself together — intensity dips, shards drift
  // inward, a single whisper crosses the HUD — then the failure
  // resumes. Once-per-session is intentional: a second voluntad would
  // feel scripted instead of willed.
  private voluntadHasFired = false;
  private voluntadStart = -1;
  private voluntadHasWhispered = false;
  private static readonly VOLUNTAD_TRIGGER  = 0.55;
  private static readonly VOLUNTAD_PULL_IN  = 1.0;  // seconds, dip phase
  private static readonly VOLUNTAD_HOLD     = 1.0;  // held-calm phase
  private static readonly VOLUNTAD_SNAPBACK = 1.0;  // ramp back to baseline
  private static readonly VOLUNTAD_TOTAL = (
    Corruption.VOLUNTAD_PULL_IN + Corruption.VOLUNTAD_HOLD + Corruption.VOLUNTAD_SNAPBACK
  );

  constructor(
    private readonly scroll: ScrollDirector,
    private readonly corruption: CorruptionEffect,
    private readonly hud: HUD,
  ) {
    this.scene.fog = new THREE.FogExp2(0x05060d, 0.20);
    this.camera.position.set(0, 0, 4.6);

    this.cluster = new THREE.Group();
    this.scene.add(this.cluster);

    const planeGeo = new THREE.PlaneGeometry(SHARD_SIZE.x, SHARD_SIZE.y);

    for (let i = 0; i < SHARD_PHRASES.length; i++) {
      const phrase = SHARD_PHRASES[i]!;
      const canvas = renderTextToCanvas(phrase, { width: 1200, height: 220, fontPx: 130 });
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;

      const material = new TextShardMaterial(tex);

      // Deterministic-feeling distribution via golden-angle spiral so
      // the shards never clump and never reveal a regular grid.
      const golden = 2.39996323; // π * (3 - √5)
      const y = 1 - (i + 0.5) * (2 / SHARD_PHRASES.length); // y in (-1, 1)
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const homeDir = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
      const homeDistance = 1.05 + (i % 3) * 0.18;

      const mesh = new THREE.Mesh(planeGeo, material);
      mesh.position.copy(homeDir).multiplyScalar(homeDistance);
      // Initial rotation faces approximately outward, then a random
      // twist around its own normal so reading angles differ.
      mesh.lookAt(0, 0, 0);
      mesh.rotateZ((i * 0.78) % (Math.PI * 2));

      // Each shard tumbles on its own random axis — chaotic, not a chorus.
      const tumbleAxis = new THREE.Vector3(
        Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1,
      ).normalize();
      const tumbleSpeed = 0.08 + Math.random() * 0.14;

      this.cluster.add(mesh);
      this.shards.push({ mesh, material, tumbleAxis, tumbleSpeed, homeDir, homeDistance });
    }
  }

  enter(): void {}
  exit(): void { this.corruption.setIntensity(0); }

  update(ctx: FrameContext): void {
    const local = this.scroll.sector === this.sectorIndex ? this.scroll.local : 0;
    // Easing curve: subtle first third, brutal last third.
    const baseIntensity = Math.pow(local, 1.6);

    // Has the voluntad trigger condition been met?
    if (!this.voluntadHasFired && baseIntensity > Corruption.VOLUNTAD_TRIGGER) {
      this.voluntadHasFired = true;
      this.voluntadStart = ctx.time;
    }

    // Compute a 'calm' factor 0..1: rises during pull-in, holds at 1,
    // falls during snapback. Outside the voluntad window calm is 0 and
    // the scene is fully under local-driven control.
    let calm = 0;
    if (this.voluntadStart > 0) {
      const e = ctx.time - this.voluntadStart;
      if (e < Corruption.VOLUNTAD_PULL_IN) {
        calm = THREE.MathUtils.smoothstep(e, 0, Corruption.VOLUNTAD_PULL_IN);
      } else if (e < Corruption.VOLUNTAD_PULL_IN + Corruption.VOLUNTAD_HOLD) {
        calm = 1;
        // Whisper fires exactly once, at the start of the held-calm phase.
        if (!this.voluntadHasWhispered) {
          this.voluntadHasWhispered = true;
          this.hud.whisper('i am still here.', 1800);
        }
      } else if (e < Corruption.VOLUNTAD_TOTAL) {
        const t = (e - Corruption.VOLUNTAD_PULL_IN - Corruption.VOLUNTAD_HOLD) / Corruption.VOLUNTAD_SNAPBACK;
        calm = 1 - THREE.MathUtils.smoothstep(t, 0, 1);
      }
    }

    // During voluntad the intensity and drift collapse toward 'calm'
    // values (~0.10 intensity, ~0.86 drift) — the AI fighting to keep
    // its shape against the local-driven failure.
    const intensity  = THREE.MathUtils.lerp(baseIntensity, 0.10, calm);
    const driftScale = THREE.MathUtils.lerp(1 + baseIntensity * 0.55, 0.86, calm);

    this.corruption.setIntensity(intensity);
    this.corruption.tick(ctx.time);

    for (const s of this.shards) {
      s.mesh.rotateOnAxis(s.tumbleAxis, s.tumbleSpeed * ctx.delta);
      s.mesh.position.copy(s.homeDir).multiplyScalar(s.homeDistance * driftScale);
      s.material.uniforms.uTime.value = ctx.time;
      s.material.uniforms.uIntensity.value = intensity;
    }

    // Cluster yaws slowly so motion is present even at low intensity.
    this.cluster.rotation.y = ctx.time * 0.04;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
