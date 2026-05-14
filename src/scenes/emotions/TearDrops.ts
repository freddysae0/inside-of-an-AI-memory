import * as THREE from 'three';
import type { FrameContext } from '../../core/AnimationManager';

/**
 * Sad — gravity made visible.
 *
 * Small drop-shaped meshes spawn from the underside of the blob and
 * fall through the camera frame, elongating as they accelerate, then
 * fade into the fog. What falls does not come back.
 *
 * Pool of 16 — at the spawn rate of ~1.6/s and lifetime ~2.2s there
 * are 3-4 active drops at any moment. Inactive meshes sit at far-y
 * (offscreen) with scale 0 so they cost no pixels.
 */
const POOL_SIZE = 16;
const SPAWN_RATE_AT_FULL = 1.6;     // drops per second at weight=1
const LIFETIME_MIN = 1.8;
const LIFETIME_MAX = 2.6;
const SPAWN_RING_Y = -0.88;          // just below the blob's lower surface
const SPAWN_RING_R = 0.65;
const FALL_DISTANCE = 2.6;           // how far before fade-out
const OFFSCREEN_Y = -100;

interface TearState {
  active: boolean;
  startX: number;
  startZ: number;
  startTime: number;
  lifetime: number;
  driftX: number;
}

export class TearDrops {
  readonly group = new THREE.Group();
  private readonly meshes: THREE.Mesh[] = [];
  private readonly state: TearState[] = [];
  private readonly material: THREE.MeshBasicMaterial;
  private spawnAccumulator = 0;

  /** 0..1 — driven by the sad emotion weight. 0 = no drops spawn. */
  weight = 0;

  constructor() {
    // BasicMaterial because we want bloom-tonable colour without
    // needing scene lighting; transparency is per-instance via
    // mesh.material clones (we share the geometry, not the material).
    this.material = new THREE.MeshBasicMaterial({
      color: 0x4a6fa5,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      fog: true,
    });
    // Sphere subdivided cheaply — drops are tiny on screen.
    const geom = new THREE.SphereGeometry(0.045, 10, 8);

    for (let i = 0; i < POOL_SIZE; i++) {
      // Each tear owns its own material clone so opacity is per-drop.
      const mat = this.material.clone();
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(0, OFFSCREEN_Y, 0);
      mesh.scale.set(0, 0, 0);
      this.group.add(mesh);
      this.meshes.push(mesh);
      this.state.push({
        active: false, startX: 0, startZ: 0,
        startTime: 0, lifetime: 0, driftX: 0,
      });
    }
  }

  update(ctx: FrameContext): void {
    // Spawn budget — only accumulates while weight > 0, so drops stop
    // appearing as soon as we leave the sad phase.
    if (this.weight > 0.02) {
      this.spawnAccumulator += this.weight * SPAWN_RATE_AT_FULL * ctx.delta;
      while (this.spawnAccumulator >= 1) {
        this.spawnAccumulator -= 1;
        this.spawnOne(ctx.time);
      }
    } else {
      this.spawnAccumulator = 0;
    }

    // Advance every active drop.
    for (let i = 0; i < POOL_SIZE; i++) {
      const s = this.state[i]!;
      if (!s.active) continue;
      const mesh = this.meshes[i]!;
      const t = (ctx.time - s.startTime) / s.lifetime;
      if (t >= 1) {
        s.active = false;
        mesh.position.set(0, OFFSCREEN_Y, 0);
        mesh.scale.setScalar(0);
        continue;
      }

      // Accelerating fall — y = start - 0.5 * a * t² but normalised
      // so end-of-life lands at fixed distance.
      const fallY = SPAWN_RING_Y - t * t * FALL_DISTANCE;
      mesh.position.set(s.startX + s.driftX * t, fallY, s.startZ);

      // Elongate vertically as it accelerates — reads as 'stretched
      // by gravity'.
      const stretch = 1.0 + t * 0.9;
      const width = 1.0 - t * 0.15;
      mesh.scale.set(width, stretch, width);

      // Opacity envelope: quick fade-in, long sustain, fade into fog.
      const fadeIn  = THREE.MathUtils.smoothstep(t, 0, 0.15);
      const fadeOut = 1 - THREE.MathUtils.smoothstep(t, 0.7, 1);
      const opacity = fadeIn * fadeOut * 0.78;
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  }

  private spawnOne(time: number): void {
    // Find an inactive slot.
    let slot = -1;
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!this.state[i]!.active) { slot = i; break; }
    }
    if (slot < 0) return; // pool exhausted — shouldn't happen at our rates

    const angle = Math.random() * Math.PI * 2;
    const r = SPAWN_RING_R * (0.55 + Math.random() * 0.45);
    const s = this.state[slot]!;
    s.active = true;
    s.startX = Math.cos(angle) * r;
    s.startZ = Math.sin(angle) * r;
    s.startTime = time;
    s.lifetime = LIFETIME_MIN + Math.random() * (LIFETIME_MAX - LIFETIME_MIN);
    // Small lateral drift so drops don't all fall in perfect parallel lines.
    s.driftX = (Math.random() - 0.5) * 0.18;
  }
}
