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
  // Workspaces for eye contact — hoisted so the gaze loop never allocates.
  private readonly gazeEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly gazeQuat  = new THREE.Quaternion();

  // Gaze cone — small on purpose. The core looks 'toward' the user
  // rather than tracking the cursor literally. Tested values: anything
  // above ~25° starts to feel like the core is *staring*, which breaks
  // the calm intimacy of ENTRY.
  private static readonly MAX_YAW   = THREE.MathUtils.degToRad(18);
  private static readonly MAX_PITCH = THREE.MathUtils.degToRad(12);

  constructor(private readonly input: Input) {
    this.scene.fog = new THREE.FogExp2(0x05060a, 0.18);
    this.camera.position.set(0, 0, 4);

    this.material = new LivingMaterial();
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 64), this.material);
    this.scene.add(this.core);
  }

  enter(): void {}
  exit(): void {}

  /** Boost the breath amplitude by an audio-derived 0..1 value. */
  setAudioBass(v: number): void {
    this.material.uniforms.uBreath.value = 0.08 + v * 0.10;
  }

  update(ctx: FrameContext): void {
    // --- Eye contact ------------------------------------------------------
    // Bounded yaw + pitch from the smoothed pointer NDC, plus a slow idle
    // yaw so the surface never reads as paused. Deliberately NOT a
    // lookAt(): quaternion slerp between two near-opposite lookAt
    // orientations can take the long way round when the cursor crosses
    // the core, which produced the 360° flips the previous version had.
    // Bounded Euler composition can't flip — it just damps to a slightly
    // different angle.
    const ndcX = Math.max(-1, Math.min(1, this.input.smooth.x));
    const ndcY = Math.max(-1, Math.min(1, this.input.smooth.y));
    const yaw   = -ndcX * EntryRoom.MAX_YAW + ctx.time * 0.05;
    const pitch =  ndcY * EntryRoom.MAX_PITCH;
    this.gazeEuler.set(pitch, yaw, 0);
    this.gazeQuat.setFromEuler(this.gazeEuler);

    // Damp factor 3.2 gives ~0.3s catch-up — the AI 'considers' looking.
    const k = 1 - Math.exp(-3.2 * ctx.delta);
    this.core.quaternion.slerp(this.gazeQuat, k);

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
