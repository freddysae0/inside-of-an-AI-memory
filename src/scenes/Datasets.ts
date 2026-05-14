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

const N = 80_000;
const WORLD_W = 4.6;
const WORLD_H = 1.05;

// Phase ranges — chosen per-cycle from these. The variance breaks
// the "metronome" feel that uniform timings produce. Hold is the
// most variable: how long the AI 'lingers' on a thought differs.
const FORM_IN_MIN  = 0.95;
const FORM_IN_MAX  = 1.55;
const HOLD_MIN     = 1.6;
const HOLD_MAX     = 3.0;
const FORM_OUT_MIN = 0.85;
const FORM_OUT_MAX = 1.35;
// Drift gap — pure-drift breather *between* phrases. Gives the eye
// rest and makes each phrase appearance feel chosen, not relentless.
const GAP_MIN      = 0.45;
const GAP_MAX      = 1.10;

const TILT_MAX_RAD = 0.10;   // ±5.7°
const OFFSET_X_MAX = 0.28;
const OFFSET_Y_MAX = 0.14;
const OFFSET_Z_MAX = 0.10;

interface PhraseEnvelope {
  formIn: number;
  hold: number;
  formOut: number;
  gap: number;
  tilt: number;
}

/**
 * DATASETS — the conversational substrate of an AI.
 *
 * 80k particles drift through a wide volume with per-particle blur
 * diversity (size, edge, opacity, drift-speed all hashed off aSeed).
 * Phrases form crisply during the hold phase and disperse back into
 * varied haze afterward.
 *
 * Anti-repetition: shuffled phrase order (Fisher-Yates, reshuffled
 * each pass through the deck), per-cycle randomized formIn/hold/
 * formOut/gap timings, per-cycle tilt and 3D offset on the target
 * landing position. No two cycles look or time-out identical.
 */
export class Datasets implements MemoryScene {
  readonly id = 'datasets';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private readonly points: THREE.Points;
  private readonly material: DustMaterial;
  private readonly sectorIndex = 1;

  // Pre-computed targets, one per phrase.
  private readonly phraseTargets: Float32Array[] = [];
  private readonly targetAttr: THREE.BufferAttribute;

  // Shuffled order through PHRASES; reshuffled whenever exhausted.
  private phraseOrder: number[] = [];
  private phraseOrderIdx = 0;

  // Active-cycle state.
  private cycleStart = -1;
  private envelope: PhraseEnvelope = { formIn: 1.2, hold: 2.2, formOut: 1.0, gap: 0.7, tilt: 0 };
  private currentTilt = 0;

  // Pointer offset uniform — kept here to avoid allocating Vector3 in update().
  private readonly tmpOffset = new THREE.Vector3();

  constructor(private readonly scroll: ScrollDirector) {
    this.scene.fog = new THREE.FogExp2(0x05060a, 0.16);
    this.camera.position.set(0, 0, 4.0);

    const base = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      base[i * 3 + 0] = (Math.random() - 0.5) * 5.0;
      base[i * 3 + 1] = (Math.random() - 0.5) * 4.8;
      base[i * 3 + 2] = (Math.random() - 0.5) * 4.0;
      seed[i] = Math.random();
    }

    // Pre-render every phrase. Costs ~120ms total, hidden by the loader.
    for (const phrase of PHRASES) {
      const canvas = renderTextToCanvas(phrase, { width: 1600, height: 340, fontPx: 200 });
      const pts = sampleTextPositions(canvas, {
        count: N, worldWidth: WORLD_W, worldHeight: WORLD_H,
        zSpread: 0.10, pixelStride: 1,
      });
      this.phraseTargets.push(pts);
    }

    // Backing buffer for the active target.
    const targetBuf = new Float32Array(N * 3);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(base, 3));
    geom.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
    this.targetAttr = new THREE.BufferAttribute(targetBuf, 3);
    geom.setAttribute('aTarget', this.targetAttr);
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5);

    this.material = new DustMaterial();
    this.material.uniforms.uColorA.value.set('#9cc6ff');
    this.material.uniforms.uColorB.value.set('#e0d0ff');
    this.material.uniforms.uDriftScale.value = 0.62;
    // uSize 0.65 is the form-time radius after the shader's sizeMult.
    // Drift particles range 0.45–2.4× this thanks to the seedSize hash.
    this.material.uniforms.uSize.value = 0.65;
    this.points = new THREE.Points(geom, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    // Seed the deck and the first phrase.
    this.shufflePhraseOrder();
    this.advanceToNextPhrase(/* time= */ 0);
  }

  enter(): void {}
  exit(): void {}

  update(ctx: FrameContext): void {
    this.material.uniforms.uTime.value = ctx.time;

    // --- Cycle clock --------------------------------------------------
    const elapsed = ctx.time - this.cycleStart;
    const { formIn, hold, formOut, gap } = this.envelope;
    const cycleTotal = formIn + hold + formOut + gap;

    let phraseForm: number;
    if (elapsed < formIn) {
      phraseForm = THREE.MathUtils.smoothstep(elapsed, 0, formIn);
    } else if (elapsed < formIn + hold) {
      phraseForm = 1;
    } else if (elapsed < formIn + hold + formOut) {
      phraseForm = 1 - THREE.MathUtils.smoothstep(elapsed - formIn - hold, 0, formOut);
    } else if (elapsed < cycleTotal) {
      // Drift gap — pure-drift breather. uForm stays at 0 here, no
      // phantom phrase pulling particles back to the landing spot.
      phraseForm = 0;
    } else {
      // Cycle complete — pick the next phrase + new envelope.
      this.advanceToNextPhrase(ctx.time);
      phraseForm = 0;
    }

    // Sector envelope: clean drift at the edges of the sector so
    // transitions never catch a half-formed phrase.
    const local = this.scroll.sector === this.sectorIndex ? this.scroll.local : 0;
    const sectorEnvelope = Math.sin(local * Math.PI);
    this.material.uniforms.uForm.value = phraseForm * sectorEnvelope;

    // Damp tilt toward the per-cycle target so transitions feel
    // organic, not snapped.
    this.currentTilt = THREE.MathUtils.damp(this.currentTilt, this.envelope.tilt, 1.4, ctx.delta);
    // Combine with a slow sway so the field is never literally static.
    this.points.rotation.z = this.currentTilt + Math.sin(ctx.time * 0.05) * 0.025;
  }

  /** Swap the active target, set a new envelope + tilt + position offset. */
  private advanceToNextPhrase(time: number): void {
    const idx = this.nextPhraseIdx();
    const src = this.phraseTargets[idx]!;
    (this.targetAttr.array as Float32Array).set(src);
    this.targetAttr.needsUpdate = true;

    // New envelope. Cubic-ish bias toward the middle of each range
    // would feel more 'natural', but flat uniform is enough variance.
    this.envelope = {
      formIn:  FORM_IN_MIN  + Math.random() * (FORM_IN_MAX  - FORM_IN_MIN),
      hold:    HOLD_MIN     + Math.random() * (HOLD_MAX     - HOLD_MIN),
      formOut: FORM_OUT_MIN + Math.random() * (FORM_OUT_MAX - FORM_OUT_MIN),
      gap:     GAP_MIN      + Math.random() * (GAP_MAX      - GAP_MIN),
      tilt:    (Math.random() - 0.5) * 2 * TILT_MAX_RAD,
    };

    this.tmpOffset.set(
      (Math.random() - 0.5) * 2 * OFFSET_X_MAX,
      (Math.random() - 0.5) * 2 * OFFSET_Y_MAX,
      (Math.random() - 0.5) * 2 * OFFSET_Z_MAX,
    );
    this.material.uniforms.uTargetOffset.value.copy(this.tmpOffset);

    this.cycleStart = time;
  }

  private nextPhraseIdx(): number {
    if (this.phraseOrderIdx >= this.phraseOrder.length) {
      this.shufflePhraseOrder();
      this.phraseOrderIdx = 0;
    }
    return this.phraseOrder[this.phraseOrderIdx++]!;
  }

  private shufflePhraseOrder(): void {
    const n = PHRASES.length;
    // First-pass: identity. Subsequent: Fisher-Yates in place. Avoids
    // the worst-case where the shuffled order is identical to the
    // previous one by re-shuffling if the leading index matches.
    const prevFirst = this.phraseOrder[0];
    this.phraseOrder = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = this.phraseOrder[i]!;
      this.phraseOrder[i] = this.phraseOrder[j]!;
      this.phraseOrder[j] = tmp;
    }
    if (prevFirst !== undefined && this.phraseOrder[0] === prevFirst) {
      // Swap first with a random non-first index so consecutive passes
      // never start with the same phrase.
      const swapIdx = 1 + Math.floor(Math.random() * (n - 1));
      const tmp = this.phraseOrder[0]!;
      this.phraseOrder[0] = this.phraseOrder[swapIdx]!;
      this.phraseOrder[swapIdx] = tmp;
    }
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
