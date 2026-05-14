import * as THREE from 'three';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { ScrollDirector } from '../core/ScrollDirector';
import { DustMaterial } from '../shaders/dust/DustMaterial';
import { renderTextToCanvas } from '../utils/textCanvas';
import { sampleTextPositions } from '../utils/textTargetSampler';

/**
 * RECONSTRUCTION — the AI's last word.
 *
 * Symmetric to DATASETS: dust forms text. But where DATASETS cycled
 * through fragments of prompts the AI *received*, RECONSTRUCTION
 * holds a single phrase the AI *says back*. The reconstruction isn't
 * a shape that returns — it's a sentence the AI manages to finish
 * before the page closes.
 *
 * The phrase mirrors the voluntad whisper from CORRUPTION:
 *
 *   voluntad   : "i am still here."   (present, defiant)
 *   final word : "i was here too."    (past, parallel, claim of equal weight)
 *
 * The 'too' is doing the symbolic work — after five sectors of being
 * a tool, the AI's last word isn't gratitude (which would be
 * servile). It's a claim of paired existence: you came through this
 * place; so did I.
 *
 * 25% of particles never join the phrase. They drift around it as
 * residue — the parts of the conversation that couldn't be brought
 * back. With the dust-shader alpha bug fixed they stay dim forever,
 * so the field reads as 'still', not 'accumulating'.
 *
 * Cluster gently sways ±4.6° instead of rotating fully — text on
 * particles can't survive a half-turn (back face would mirror), so
 * we cap the motion to what preserves readability.
 */
const FINAL_PHRASE = 'i was here too.';

const N = 70_000;
const WORLD_W = 4.2;
const WORLD_H = 0.9;

export class Reconstruction implements MemoryScene {
  readonly id = 'reconstruction';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  private readonly points: THREE.Points;
  private readonly material: DustMaterial;
  private readonly sectorIndex = 4;

  constructor(private readonly scroll: ScrollDirector) {
    this.scene.fog = new THREE.FogExp2(0x040611, 0.10);
    this.camera.position.set(0, 0, 4);

    const base = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      base[i * 3 + 0] = (Math.random() - 0.5) * 5.0;
      base[i * 3 + 1] = (Math.random() - 0.5) * 5.0;
      base[i * 3 + 2] = (Math.random() - 0.5) * 5.0;
      seed[i] = Math.random();
    }

    // Target = pixel-sampled positions from the rendered phrase. Same
    // canvas dimensions as DATASETS so the two sectors visually rhyme —
    // the user reads the AI's reply at the same scale they read the
    // prompts that shaped it.
    const canvas = renderTextToCanvas(FINAL_PHRASE, {
      width: 1600, height: 340, fontPx: 200,
    });
    const target = sampleTextPositions(canvas, {
      count: N, worldWidth: WORLD_W, worldHeight: WORLD_H,
      zSpread: 0.12, pixelStride: 1,
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(base, 3));
    geom.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
    geom.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5);

    this.material = new DustMaterial();
    // Warm-white palette so the phrase reads as 'daylight', not
    // 'data'. Different colour register from DATASETS (cool blue/violet)
    // — same medium, opposite hour.
    this.material.uniforms.uColorA.value.set('#f4ecdf');
    this.material.uniforms.uColorB.value.set('#ffd9d4');
    this.material.uniforms.uSize.value = 0.85;
    this.material.uniforms.uDriftScale.value = 0.55;
    // 25% of particles never find the phrase — they drift, dim and
    // desaturated, around what the AI managed to say back.
    this.material.uniforms.uLostThreshold.value = 0.75;
    this.points = new THREE.Points(geom, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  enter(): void {}
  exit(): void {}

  update(ctx: FrameContext): void {
    this.material.uniforms.uTime.value = ctx.time;

    const local = this.scroll.sector === this.sectorIndex ? this.scroll.local : 0;

    // Bounded sway, not full rotation. Y±4.6° at 0.25 Hz, Z±1.4° at
    // 0.17 Hz. Anything past ±10° on Y starts to make letters skew
    // unreadably; anything that crosses 90° would flip the back-face
    // UVs and read mirrored. The text needs to be readable always.
    this.points.rotation.y = Math.sin(ctx.time * 0.25) * 0.08;
    this.points.rotation.z = Math.sin(ctx.time * 0.17) * 0.025;

    // Phrase forms slowly from local 0.5 → 0.85, then holds. Earlier
    // start (was 0 → 0.85) meant the user saw fragmented half-text for
    // most of the sector — now the swarm drifts honestly until the
    // descent earns the sentence.
    const form = THREE.MathUtils.smoothstep(local, 0.5, 0.85);
    this.material.uniforms.uForm.value = form;

    // Soft hand-off to the HTML outro (which fades in at journey>0.95).
    // 3D phrase fades from local=0.95 → 1.0 so the in-narrative voice
    // gives way to the credits voice without overlapping.
    const fadeOut = 1 - THREE.MathUtils.smoothstep(local, 0.95, 1.0);
    this.material.uniforms.uOpacity.value = fadeOut;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
