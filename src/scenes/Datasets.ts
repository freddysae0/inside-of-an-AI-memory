import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { ScrollDirector } from '../core/ScrollDirector';
import { DustMaterial } from '../shaders/dust/DustMaterial';

/**
 * DATASETS — Digital Dust scene.
 *
 * 60k GPU points drift through a wide volume. As the user descends
 * through the sector, the particles smoothly snap onto a torus-knot
 * silhouette (the "compressed structure" of what the AI learned),
 * hold the shape briefly, then dissolve back into drift before the
 * next sector takes over.
 */
export class Datasets implements MemoryScene {
  readonly id = 'datasets';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private readonly points: THREE.Points;
  private readonly material: DustMaterial;

  constructor(private readonly scroll: ScrollDirector) {
    this.scene.fog = new THREE.FogExp2(0x05060a, 0.12);
    this.camera.position.set(0, 0, 4.5);

    const N = 60_000;
    const base = new Float32Array(N * 3);
    const target = new Float32Array(N * 3);
    const seed = new Float32Array(N);

    // Random drift cloud — roughly cube of side 4, slightly elongated on Y.
    for (let i = 0; i < N; i++) {
      base[i * 3 + 0] = (Math.random() - 0.5) * 4.0;
      base[i * 3 + 1] = (Math.random() - 0.5) * 4.8;
      base[i * 3 + 2] = (Math.random() - 0.5) * 4.0;
      seed[i] = Math.random();
    }

    // Targets sampled from the surface of a torus knot.
    const knotGeo = new THREE.TorusKnotGeometry(0.95, 0.28, 240, 32, 2, 3);
    const knotMesh = new THREE.Mesh(knotGeo);
    const sampler = new MeshSurfaceSampler(knotMesh).build();
    const t = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      sampler.sample(t);
      target[i * 3 + 0] = t.x;
      target[i * 3 + 1] = t.y;
      target[i * 3 + 2] = t.z;
    }
    knotGeo.dispose();

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(base, 3)); // overridden in vert
    geom.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
    geom.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
    geom.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);

    this.material = new DustMaterial();
    this.points = new THREE.Points(geom, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  enter(): void {}
  exit(): void {}

  update(ctx: FrameContext): void {
    this.points.rotation.y = ctx.time * 0.04;
    this.material.uniforms.uTime.value = ctx.time;

    // Local sector progress 0..1 — bell curve so particles
    // drift → form → drift again.
    const local = this.scroll.sector === this.indexInJourney() ? this.scroll.local : 0;
    const form = Math.sin(local * Math.PI); // 0 at edges, 1 at midpoint
    this.material.uniforms.uForm.value = form;
  }

  // Datasets is the 2nd sector (index 1). Hardcoded — keeps the scene
  // self-contained without leaking the SECTORS array import.
  private indexInJourney(): number { return 1; }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
