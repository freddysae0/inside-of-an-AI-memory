import * as THREE from 'three';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';

/**
 * Entry room — the user arrives here. Currently a placeholder
 * pulsing icosahedron + ambient hemisphere light. The Living
 * Material shader replaces this geometry's material next commit.
 */
export class EntryRoom implements MemoryScene {
  readonly id = 'entry';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  private readonly core: THREE.Mesh;

  constructor() {
    this.scene.fog = new THREE.FogExp2(0x05060a, 0.18);
    this.camera.position.set(0, 0, 5);

    const hemi = new THREE.HemisphereLight(0x88aaff, 0x0a0a14, 0.6);
    this.scene.add(hemi);
    const key = new THREE.PointLight(0x99bbff, 8, 12, 2);
    key.position.set(2, 1.5, 3);
    this.scene.add(key);

    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 4),
      new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.45, metalness: 0.2, wireframe: false }),
    );
    this.scene.add(this.core);
  }

  enter(): void { /* will fade-in via PostFX next */ }
  exit(): void { /* */ }

  update(ctx: FrameContext): void {
    this.core.rotation.y = ctx.time * 0.15;
    this.core.rotation.x = ctx.time * 0.08;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
