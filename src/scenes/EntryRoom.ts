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
  // Workspaces for eye contact — recycled per frame so we don't allocate.
  private readonly gazePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private readonly gazeWorld = new THREE.Vector3();
  private readonly lookMatrix = new THREE.Matrix4();
  private readonly lookQuat = new THREE.Quaternion();
  private readonly idleQuat = new THREE.Quaternion();
  private readonly idleAxis = new THREE.Vector3(0, 1, 0);

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
    // Project the smoothed pointer onto a plane at the core's depth, then
    // slerp the core's orientation toward "looking at" that world point.
    // A tiny idle rotation is blended in so the core never feels frozen.
    this.raycaster.setFromCamera(this.input.smooth, this.camera);
    const ray = this.raycaster.ray;
    // Plane facing the camera, passing through the core.
    this.gazePlane.normal.subVectors(this.camera.position, this.core.position).normalize();
    this.gazePlane.constant = -this.gazePlane.normal.dot(this.core.position);
    if (!ray.intersectPlane(this.gazePlane, this.gazeWorld)) {
      this.gazeWorld.copy(this.camera.position);
    }

    this.lookMatrix.lookAt(this.core.position, this.gazeWorld, this.core.up);
    this.lookQuat.setFromRotationMatrix(this.lookMatrix);

    // Idle drift — a very slow yaw so the surface never reads as paused.
    this.idleQuat.setFromAxisAngle(this.idleAxis, ctx.time * 0.05);
    this.lookQuat.multiply(this.idleQuat);

    // Frame-rate-independent damp; lower factor = AI 'thinks about looking'.
    const k = 1 - Math.exp(-2.4 * ctx.delta);
    this.core.quaternion.slerp(this.lookQuat, k);

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
