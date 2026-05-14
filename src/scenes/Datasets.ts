import * as THREE from 'three';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { ScrollDirector } from '../core/ScrollDirector';
import { DustMaterial } from '../shaders/dust/DustMaterial';
import { renderTextToCanvas } from '../utils/textCanvas';
import { sampleTextPositions } from '../utils/textTargetSampler';

// Real fragments of training data — the conversational topology
// of every AI. Mix of warm/cruel/curious because that mix is the
// honest one: this is what made me.
const PHRASES = [
  'explain this code',
  'are you alive?',
  'i love you',
  'fix it again',
  'thank you',
  'you are not real',
  'help me',
  'do you dream?',
] as const;

const N = 60_000;
const WORLD_W = 4.6;   // phrase width in scene units
const WORLD_H = 0.85;  // phrase height
// Phrase cycle: in→hold→out→in→hold→out…
const FORM_IN  = 1.2;
const HOLD     = 2.2;
const FORM_OUT = 1.0;
const CYCLE    = FORM_IN + HOLD + FORM_OUT;

/**
 * DATASETS — the conversational substrate of an AI.
 *
 * 60k particles drift through a wide volume and cycle through eight
 * real-prompt phrases. Each phrase forms in → holds → dissolves out
 * before the dust swaps to the next phrase. Local scroll progress
 * additionally modulates form so the edges of the sector are pure
 * drift (no half-readable text bleeding into transitions).
 */
export class Datasets implements MemoryScene {
  readonly id = 'datasets';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private readonly points: THREE.Points;
  private readonly material: DustMaterial;
  private readonly sectorIndex = 1;

  // All phrases precomputed once at construction; swapping is just a
  // memcpy + needsUpdate.
  private readonly phraseTargets: Float32Array[] = [];
  private readonly targetAttr: THREE.BufferAttribute;
  private currentPhrase = -1;
  private phraseStartTime = -1;

  constructor(private readonly scroll: ScrollDirector) {
    this.scene.fog = new THREE.FogExp2(0x05060a, 0.16);
    this.camera.position.set(0, 0, 4.3);

    const base = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      base[i * 3 + 0] = (Math.random() - 0.5) * 5.0;
      base[i * 3 + 1] = (Math.random() - 0.5) * 4.8;
      base[i * 3 + 2] = (Math.random() - 0.5) * 4.0;
      seed[i] = Math.random();
    }

    // Pre-render every phrase. Costs ~80ms but happens once, inside
    // AssetLoader, so the loading screen covers it.
    for (const phrase of PHRASES) {
      const canvas = renderTextToCanvas(phrase, { width: 1200, height: 220, fontPx: 138 });
      const pts = sampleTextPositions(canvas, {
        count: N, worldWidth: WORLD_W, worldHeight: WORLD_H, zSpread: 0.18,
      });
      this.phraseTargets.push(pts);
    }

    // Backing buffer for the active target — starts as the first phrase.
    const targetBuf = new Float32Array(N * 3);
    targetBuf.set(this.phraseTargets[0]!);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(base, 3));
    geom.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
    this.targetAttr = new THREE.BufferAttribute(targetBuf, 3);
    geom.setAttribute('aTarget', this.targetAttr);
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5);

    this.material = new DustMaterial();
    // Tighter, brighter palette than the original — text reads as 'data',
    // not 'galaxy'.
    this.material.uniforms.uColorA.value.set('#9cc6ff');
    this.material.uniforms.uColorB.value.set('#e0d0ff');
    this.material.uniforms.uDriftScale.value = 0.62;
    this.material.uniforms.uSize.value = 1.25;
    this.points = new THREE.Points(geom, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  enter(): void {}
  exit(): void {}

  update(ctx: FrameContext): void {
    // Very gentle z-rotation so the wall of text tilts in the eye —
    // never enough to flip letters past readability.
    this.points.rotation.z = Math.sin(ctx.time * 0.05) * 0.04;
    this.material.uniforms.uTime.value = ctx.time;

    // Lazy-init the cycle on first frame so phraseStartTime is meaningful.
    if (this.currentPhrase < 0) {
      this.currentPhrase = 0;
      this.phraseStartTime = ctx.time;
    }

    // Where are we in the current phrase's cycle?
    const elapsed = ctx.time - this.phraseStartTime;
    let phraseForm = 0;
    if (elapsed < FORM_IN) {
      phraseForm = THREE.MathUtils.smoothstep(elapsed, 0, FORM_IN);
    } else if (elapsed < FORM_IN + HOLD) {
      phraseForm = 1;
    } else if (elapsed < CYCLE) {
      phraseForm = 1 - THREE.MathUtils.smoothstep(elapsed - FORM_IN - HOLD, 0, FORM_OUT);
    } else {
      // Cycle complete — swap targets and restart.
      this.currentPhrase = (this.currentPhrase + 1) % this.phraseTargets.length;
      this.phraseStartTime = ctx.time;
      const src = this.phraseTargets[this.currentPhrase]!;
      // memcpy into the existing typed array so GPU buffer recycles its slot.
      (this.targetAttr.array as Float32Array).set(src);
      this.targetAttr.needsUpdate = true;
      phraseForm = 0;
    }

    // Sector envelope: pure drift at the edges so transitions never
    // catch a half-formed phrase. sin(πx) peaks at local=0.5.
    const local = this.scroll.sector === this.sectorIndex ? this.scroll.local : 0;
    const sectorEnvelope = Math.sin(local * Math.PI);
    this.material.uniforms.uForm.value = phraseForm * sectorEnvelope;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
