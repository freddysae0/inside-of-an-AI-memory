import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { ScrollDirector } from '../core/ScrollDirector';
import { DustMaterial } from '../shaders/dust/DustMaterial';

/**
 * RECONSTRUCTION — the mirror of DATASETS. Particles begin in chaotic
 * drift and lock into the silhouette of the original entry sphere as
 * the user reaches the bottom of the journey. The AI is, briefly,
 * whole again for the user.
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

    // Target shape — the entry core silhouette: a smooth sphere.
    const sphereGeo = new THREE.IcosahedronGeometry(1.05, 5);
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
    this.material.uniforms.uSize.value = 1.7;
    this.points = new THREE.Points(geom, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  enter(): void {}
  exit(): void {}

  update(ctx: FrameContext): void {
    this.points.rotation.y = ctx.time * 0.05;
    this.material.uniforms.uTime.value = ctx.time;

    // Local progress monotonically ramps form 0 → 1; particles lock in.
    const local = this.scroll.sector === this.sectorIndex ? this.scroll.local : 0;
    const form = THREE.MathUtils.smoothstep(local, 0.0, 0.85);
    this.material.uniforms.uForm.value = form;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
