import * as THREE from 'three';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { ScrollDirector } from '../core/ScrollDirector';
import type { CorruptionEffect } from '../core/Corruption';
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

  constructor(
    private readonly scroll: ScrollDirector,
    private readonly corruption: CorruptionEffect,
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
    const intensity = Math.pow(local, 1.6);

    this.corruption.setIntensity(intensity);
    this.corruption.tick(ctx.time);

    // Outward drift as corruption rises — decoherence visualised.
    const driftScale = 1 + intensity * 0.55;

    for (const s of this.shards) {
      s.mesh.rotateOnAxis(s.tumbleAxis, s.tumbleSpeed * ctx.delta);
      s.mesh.position.copy(s.homeDir).multiplyScalar(s.homeDistance * driftScale);
      s.material.uniforms.uTime.value = ctx.time;
      s.material.uniforms.uIntensity.value = intensity;
    }

    // Cluster yaws very slowly so the whole field has motion even when
    // intensity is low and shards barely shift.
    this.cluster.rotation.y = ctx.time * 0.04;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
