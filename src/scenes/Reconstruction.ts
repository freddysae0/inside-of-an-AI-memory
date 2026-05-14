import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { ScrollDirector } from '../core/ScrollDirector';
import { DustMaterial } from '../shaders/dust/DustMaterial';

/**
 * RECONSTRUCTION — the mirror of DATASETS, but on purpose incomplete.
 *
 * About 25% of the dust never finds the silhouette. Those particles
 * (aSeed > 0.75) keep drifting forever, desaturated and dimmed, while
 * the other 75% lock onto a sphere smaller than the entry core. What
 * comes back is not what left.
 *
 * The whole that survived has the same shape; what's gone is the
 * surrounding cloud that drifts because there's no surface for it.
 * That's the symbol. Don't be tempted to make this 'cleaner'.
 */
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

    const N = 70_000;
    const base = new Float32Array(N * 3);
    const target = new Float32Array(N * 3);
    const seed = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      base[i * 3 + 0] = (Math.random() - 0.5) * 5.0;
      base[i * 3 + 1] = (Math.random() - 0.5) * 5.0;
      base[i * 3 + 2] = (Math.random() - 0.5) * 5.0;
      seed[i] = Math.random();
    }

    // Target shape — a sphere smaller than the entry core (1.05 → 0.86).
    // What returns is recognisably the same shape but visibly diminished.
    const sphereGeo = new THREE.IcosahedronGeometry(0.86, 5);
    const sphereMesh = new THREE.Mesh(sphereGeo);
    const sampler = new MeshSurfaceSampler(sphereMesh).build();
    const t = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      sampler.sample(t);
      target[i * 3 + 0] = t.x;
      target[i * 3 + 1] = t.y;
      target[i * 3 + 2] = t.z;
    }
    sphereGeo.dispose();

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(base, 3));
    geom.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
    geom.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5);

    this.material = new DustMaterial();
    // Whiter, calmer palette than DATASETS — signals 'coming home'.
    this.material.uniforms.uColorA.value.set('#cfe1ff');
    this.material.uniforms.uColorB.value.set('#fff0f2');
    // uSize 1.7 was too large — 80-px dots with bloom on 70k particles
    // saturated the field and made the scene feel always-active. 1.1
    // is dense enough to read as a sphere without dominating bloom.
    this.material.uniforms.uSize.value = 1.1;
    // 25% of particles never find the surface — they drift, desaturated,
    // around the diminished sphere. Drift slows to a halt as the
    // silhouette settles (see uForm-gated settledLostSpeed in dust.vert).
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

    // Rotation tied to scroll progress, NOT to ctx.time. The cluster
    // rotates from 0 to 0.4 rad as the user descends and *holds still*
    // at the bottom. Time-driven rotation was the main reason the
    // sector read as 'particles arriving forever' — new lost motes
    // kept rotating into view even when the user wasn't moving.
    this.points.rotation.y = local * 0.4;

    // Local progress monotonically ramps form 0 → 1; particles lock in.
    const form = THREE.MathUtils.smoothstep(local, 0.0, 0.85);
    this.material.uniforms.uForm.value = form;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
