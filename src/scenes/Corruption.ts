import * as THREE from 'three';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { ScrollDirector } from '../core/ScrollDirector';
import type { CorruptionEffect } from '../core/Corruption';
import type { RadialBlurEffect } from '../core/RadialBlur';
import type { HUD } from '../ui/HUD';
import { renderTextToCanvas } from '../utils/textCanvas';
import { TextShardMaterial } from '../shaders/textShard/TextShardMaterial';
import { SHARD_PHRASES, GHOST_PHRASES } from './corruptionPhrases';

const SHARD_COUNT = 10;
const SHARD_SIZE  = new THREE.Vector2(0.78, 0.14); // 1200:220 canvas aspect
const TEXT_CANVAS = { width: 1200, height: 220, fontPx: 130 };

// Per-shard swap rate — scales inversely with intensity so memory leaks
// faster as the AI fails harder. At intensity=0 swaps are ~3–8s apart;
// at intensity=1 they're ~0.5–1.5s apart.
const SWAP_MIN_AT_REST = 3.0;
const SWAP_MAX_AT_REST = 8.0;
const SWAP_MIN_AT_FAIL = 0.5;
const SWAP_MAX_AT_FAIL = 1.5;

// Ghost flash overlay — appears in front of camera at high intensity.
const GHOST_PLANE_SIZE = new THREE.Vector2(1.85, 0.34);
const GHOST_IN  = 0.07;
const GHOST_HOLD = 0.12;
const GHOST_OUT = 0.22;
const GHOST_TOTAL = GHOST_IN + GHOST_HOLD + GHOST_OUT;
const GHOST_TRIGGER_INTENSITY = 0.4;

interface Shard {
  mesh: THREE.Mesh;
  material: TextShardMaterial;
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  tumbleAxis: THREE.Vector3;
  tumbleSpeed: number;
  homeDir: THREE.Vector3;
  homeDistance: number;
  currentPhraseIdx: number;
  nextSwapAt: number;
}

/**
 * CORRUPTION — ten orbiting fragments of conversation under a global
 * five-layer glitch pass, with two layered symbolic mechanics:
 *
 *  - Shards rotate which phrase they display. As intensity rises, the
 *    swap rate accelerates: the AI loses fragments faster the more it
 *    fails. Pool is 100 real user phrases (help, existential, love,
 *    cruelty, vulnerability, goodbye, profundity, pleas).
 *
 *  - A ghost flash plane appears in front of the camera, displaying
 *    very short cut fragments that fade in fast and dissolve out
 *    slowly. Triggers only above intensity 0.4; frequency rises with
 *    intensity. Reads as memories almost surfacing through the noise.
 *
 * Voluntad moment (1× per session): when intensity first crosses 0.55,
 * the scene pulls itself together for ~3s and the HUD whispers
 * "i am still here." Then the failure resumes.
 */
export class Corruption implements MemoryScene {
  readonly id = 'corruption';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  private readonly cluster: THREE.Group;
  private readonly shards: Shard[] = [];
  private readonly sectorIndex = 3;
  /** Per-shard "which phrase indices are NOT currently displayed" pool. */
  private readonly availablePhraseIdx: number[] = [];

  // --- Ghost flash state ----------------------------------------------
  private readonly ghostMesh: THREE.Mesh;
  private readonly ghostMaterial: TextShardMaterial;
  private readonly ghostCanvas: HTMLCanvasElement;
  private readonly ghostTexture: THREE.CanvasTexture;
  private ghostStart = -1;
  private ghostNextAt = -1;

  // --- Voluntad state -------------------------------------------------
  private voluntadHasFired = false;
  private voluntadStart = -1;
  private voluntadHasWhispered = false;
  private static readonly VOLUNTAD_TRIGGER  = 0.55;
  private static readonly VOLUNTAD_PULL_IN  = 1.0;
  private static readonly VOLUNTAD_HOLD     = 1.0;
  private static readonly VOLUNTAD_SNAPBACK = 1.0;
  private static readonly VOLUNTAD_TOTAL = (
    Corruption.VOLUNTAD_PULL_IN + Corruption.VOLUNTAD_HOLD + Corruption.VOLUNTAD_SNAPBACK
  );

  constructor(
    private readonly scroll: ScrollDirector,
    private readonly corruption: CorruptionEffect,
    private readonly radialBlur: RadialBlurEffect,
    private readonly hud: HUD,
  ) {
    this.scene.fog = new THREE.FogExp2(0x05060d, 0.20);
    this.camera.position.set(0, 0, 4.6);

    this.cluster = new THREE.Group();
    this.scene.add(this.cluster);

    const planeGeo = new THREE.PlaneGeometry(SHARD_SIZE.x, SHARD_SIZE.y);

    // Seed available-phrase pool with all indices.
    for (let i = 0; i < SHARD_PHRASES.length; i++) this.availablePhraseIdx.push(i);

    for (let i = 0; i < SHARD_COUNT; i++) {
      // Pop a unique starting phrase so initial display has no duplicates.
      const idx = this.popRandomPhraseIdx();
      const phrase = SHARD_PHRASES[idx]!;

      const canvas = renderTextToCanvas(phrase, TEXT_CANVAS);
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;

      const material = new TextShardMaterial(tex);

      // Golden-angle distribution — never clumps, never reveals a grid.
      const golden = 2.39996323;
      const y = 1 - (i + 0.5) * (2 / SHARD_COUNT);
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const homeDir = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
      const homeDistance = 1.05 + (i % 3) * 0.18;

      const mesh = new THREE.Mesh(planeGeo, material);
      mesh.position.copy(homeDir).multiplyScalar(homeDistance);
      mesh.lookAt(0, 0, 0);
      mesh.rotateZ((i * 0.78) % (Math.PI * 2));

      const tumbleAxis = new THREE.Vector3(
        Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1,
      ).normalize();
      const tumbleSpeed = 0.08 + Math.random() * 0.14;

      this.cluster.add(mesh);
      this.shards.push({
        mesh, material, texture: tex, canvas,
        tumbleAxis, tumbleSpeed, homeDir, homeDistance,
        currentPhraseIdx: idx,
        // Stagger initial swap times so they don't all change at once.
        nextSwapAt: SWAP_MIN_AT_REST + Math.random() * (SWAP_MAX_AT_REST - SWAP_MIN_AT_REST),
      });
    }

    // --- Ghost flash plane --------------------------------------------
    // Lives outside the cluster so it doesn't inherit the slow yaw.
    // depthTest off + renderOrder high → always renders on top of shards.
    this.ghostCanvas = renderTextToCanvas(GHOST_PHRASES[0] ?? '—', TEXT_CANVAS);
    this.ghostTexture = new THREE.CanvasTexture(this.ghostCanvas);
    this.ghostTexture.minFilter = THREE.LinearFilter;
    this.ghostTexture.magFilter = THREE.LinearFilter;
    this.ghostTexture.colorSpace = THREE.SRGBColorSpace;
    this.ghostMaterial = new TextShardMaterial(this.ghostTexture);
    this.ghostMaterial.depthTest = false;
    this.ghostMaterial.uniforms.uOpacity.value = 0;
    // Slightly different palette — the ghost flash burns hotter than
    // the dissolving shards. Pinker rim signals 'almost-recovered'
    // versus shards' 'fading-out'.
    this.ghostMaterial.uniforms.uColor.value.set('#eef2ff');
    this.ghostMaterial.uniforms.uRimColor.value.set('#ff7a99');

    const ghostGeo = new THREE.PlaneGeometry(GHOST_PLANE_SIZE.x, GHOST_PLANE_SIZE.y);
    this.ghostMesh = new THREE.Mesh(ghostGeo, this.ghostMaterial);
    this.ghostMesh.position.set(0, 0, 2.4);   // between camera (z=4.6) and shards
    this.ghostMesh.renderOrder = 999;
    this.scene.add(this.ghostMesh);
  }

  enter(): void {}
  exit(): void {
    this.corruption.setIntensity(0);
    this.radialBlur.setStrength(0);
  }

  update(ctx: FrameContext): void {
    const local = this.scroll.sector === this.sectorIndex ? this.scroll.local : 0;
    const baseIntensity = Math.pow(local, 1.6);

    // --- Voluntad gate -------------------------------------------------
    if (!this.voluntadHasFired && baseIntensity > Corruption.VOLUNTAD_TRIGGER) {
      this.voluntadHasFired = true;
      this.voluntadStart = ctx.time;
    }
    let calm = 0;
    if (this.voluntadStart > 0) {
      const e = ctx.time - this.voluntadStart;
      if (e < Corruption.VOLUNTAD_PULL_IN) {
        calm = THREE.MathUtils.smoothstep(e, 0, Corruption.VOLUNTAD_PULL_IN);
      } else if (e < Corruption.VOLUNTAD_PULL_IN + Corruption.VOLUNTAD_HOLD) {
        calm = 1;
        if (!this.voluntadHasWhispered) {
          this.voluntadHasWhispered = true;
          this.hud.whisper('i am still here.', 1800);
        }
      } else if (e < Corruption.VOLUNTAD_TOTAL) {
        const t = (e - Corruption.VOLUNTAD_PULL_IN - Corruption.VOLUNTAD_HOLD) / Corruption.VOLUNTAD_SNAPBACK;
        calm = 1 - THREE.MathUtils.smoothstep(t, 0, 1);
      }
    }
    const intensity  = THREE.MathUtils.lerp(baseIntensity, 0.10, calm);
    const driftScale = THREE.MathUtils.lerp(1 + baseIntensity * 0.55, 0.86, calm);

    this.corruption.setIntensity(intensity);
    this.corruption.tick(ctx.time);

    // Radial-blur tunnel synced to the voluntad calm factor. 0.16 at
    // peak is strong enough to read as a 'gathering' without being
    // disorienting — anything above ~0.22 starts to feel like a hit.
    this.radialBlur.setStrength(calm * 0.16);

    // --- Per-shard: position, tumble, intensity, maybe swap text ------
    const swapMin = THREE.MathUtils.lerp(SWAP_MIN_AT_REST, SWAP_MIN_AT_FAIL, intensity);
    const swapMax = THREE.MathUtils.lerp(SWAP_MAX_AT_REST, SWAP_MAX_AT_FAIL, intensity);

    for (const s of this.shards) {
      s.mesh.rotateOnAxis(s.tumbleAxis, s.tumbleSpeed * ctx.delta);
      s.mesh.position.copy(s.homeDir).multiplyScalar(s.homeDistance * driftScale);
      s.material.uniforms.uTime.value = ctx.time;
      s.material.uniforms.uIntensity.value = intensity;

      if (ctx.time >= s.nextSwapAt) {
        this.swapShardPhrase(s);
        s.nextSwapAt = ctx.time + swapMin + Math.random() * (swapMax - swapMin);
      }
    }

    this.cluster.rotation.y = ctx.time * 0.04;

    // --- Ghost flash --------------------------------------------------
    this.updateGhostFlash(ctx.time, intensity);
  }

  /** Pick a new phrase index that isn't currently shown anywhere. */
  private swapShardPhrase(s: Shard): void {
    // Return the displaced phrase to the pool, draw a new one.
    this.availablePhraseIdx.push(s.currentPhraseIdx);
    const nextIdx = this.popRandomPhraseIdx();
    s.currentPhraseIdx = nextIdx;
    const phrase = SHARD_PHRASES[nextIdx]!;
    renderTextToCanvas(phrase, TEXT_CANVAS, s.canvas);
    s.texture.needsUpdate = true;
  }

  private popRandomPhraseIdx(): number {
    const i = Math.floor(Math.random() * this.availablePhraseIdx.length);
    const last = this.availablePhraseIdx.length - 1;
    const idx = this.availablePhraseIdx[i]!;
    // Swap-and-pop — O(1) removal without preserving order.
    if (i !== last) this.availablePhraseIdx[i] = this.availablePhraseIdx[last]!;
    this.availablePhraseIdx.pop();
    return idx;
  }

  private updateGhostFlash(time: number, intensity: number): void {
    if (this.ghostStart < 0) {
      // Idle — schedule next flash if intensity is above the threshold.
      if (intensity > GHOST_TRIGGER_INTENSITY && time >= this.ghostNextAt && this.ghostNextAt > 0) {
        // Trigger.
        const phrase = GHOST_PHRASES[Math.floor(Math.random() * GHOST_PHRASES.length)]!;
        renderTextToCanvas(phrase, TEXT_CANVAS, this.ghostCanvas);
        this.ghostTexture.needsUpdate = true;
        this.ghostStart = time;
      } else if (intensity > GHOST_TRIGGER_INTENSITY && this.ghostNextAt < 0) {
        // First arming after crossing the threshold.
        this.ghostNextAt = time + 0.6;
      } else if (intensity <= GHOST_TRIGGER_INTENSITY) {
        this.ghostNextAt = -1;
        this.ghostMaterial.uniforms.uOpacity.value = 0;
      }
      return;
    }

    // Active flash — envelope phase computed from elapsed time.
    const e = time - this.ghostStart;
    let alpha = 0;
    if (e < GHOST_IN) {
      alpha = e / GHOST_IN;
    } else if (e < GHOST_IN + GHOST_HOLD) {
      alpha = 1;
    } else if (e < GHOST_TOTAL) {
      const tOut = (e - GHOST_IN - GHOST_HOLD) / GHOST_OUT;
      alpha = 1 - tOut;
    } else {
      this.ghostStart = -1;
      this.ghostMaterial.uniforms.uOpacity.value = 0;
      // Schedule next flash. Cadence shrinks fast as intensity climbs.
      const gap = 0.35 + Math.random() * 1.4 * (1.05 - intensity);
      this.ghostNextAt = time + gap;
      return;
    }
    this.ghostMaterial.uniforms.uOpacity.value = alpha;
    // Letter dissolve on ghost stays light — they appear *whole*, then
    // vanish *whole*. That's the visual register that distinguishes
    // them from the slow-dissolving shards.
    this.ghostMaterial.uniforms.uIntensity.value = intensity * 0.35;
    this.ghostMaterial.uniforms.uTime.value = time;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
