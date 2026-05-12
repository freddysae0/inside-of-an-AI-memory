import * as THREE from 'three';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { Input } from '../core/Input';
import { LivingMaterial } from '../shaders/living/LivingMaterial';

/**
 * Entry room — the user arrives in front of the "memory core":
 * a breathing, fresnel-rimmed sphere whose surface reacts to the
 * cursor. First showcase of the Living Material shader.
 */
export class EntryRoom implements MemoryScene {
  readonly id = 'entry';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  private readonly core: THREE.Mesh;
  private readonly material: LivingMaterial;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerTarget = new THREE.Vector3(10, 10, 10);

  constructor(private readonly input: Input) {
    this.scene.fog = new THREE.FogExp2(0x05060a, 0.18);
    this.camera.position.set(0, 0, 4);

    this.material = new LivingMaterial();
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 64), this.material);
    this.scene.add(this.core);
  }

  enter(): void {}
  exit(): void {}

  update(ctx: FrameContext): void {
    this.core.rotation.y = ctx.time * 0.08;
    this.core.rotation.x = ctx.time * 0.04;

    const u = this.material.uniforms;
    u.uTime.value = ctx.time;

    // Raycast pointer onto the core; if it misses, decay pointer strength.
    this.raycaster.setFromCamera(this.input.smooth, this.camera);
    const hits = this.raycaster.intersectObject(this.core, false);
    const target = u.uPointerStrength.value;
    if (hits.length > 0 && hits[0]) {
      // Bring pointer into the mesh's local space so the vertex shader's
      // distance comparison is meaningful regardless of object rotation.
      this.pointerTarget.copy(hits[0].point);
      this.core.worldToLocal(this.pointerTarget);
      u.uPointer.value.copy(this.pointerTarget);
      u.uPointerStrength.value = THREE.MathUtils.damp(target, 0.18, 6, ctx.delta);
    } else {
      u.uPointerStrength.value = THREE.MathUtils.damp(target, 0.0, 4, ctx.delta);
    }

    // Velocity-reactive: cursor speed nudges breath frequency upward.
    const speed = Math.min(this.input.velocity.length(), 4);
    u.uFrequency.value = THREE.MathUtils.damp(u.uFrequency.value, 1.4 + speed * 0.25, 3, ctx.delta);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
