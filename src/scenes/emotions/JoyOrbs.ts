import * as THREE from 'three';
import type { FrameContext } from '../../core/AnimationManager';
import { FireOrbMaterial } from '../../shaders/fire/FireOrbMaterial';

/**
 * Joy — outward radiation, embodied as flame balls.
 *
 * Each orb is a sphere driven by a custom fire shader: two-octave
 * simplex turbulence displaces the mesh upward, the fragment maps the
 * same noise to a four-stop heat ramp (black → red → yellow → white).
 * Per-orb seed uniforms guarantee no two flames look identical.
 *
 * The orb scale animation is replaced by a shader-side uLifeFade
 * uniform — the mesh stays at unit scale and only the rendered
 * brightness/alpha fades. This keeps the flame turbulence sharp at
 * spawn and silhouette-soft at death, instead of just shrinking.
 */
const POOL_SIZE = 48;
const SPAWN_RATE_AT_FULL = 14;
const LIFETIME_MIN = 0.7;
const LIFETIME_MAX = 1.15;
const SPEED_MIN = 1.6;
const SPEED_MAX = 2.8;
const ORB_RADIUS = 0.085;            // bigger than before (0.05) — flame
                                     // turbulence pushes silhouette outward
const OFFSCREEN_Y = -100;

interface OrbState {
  active: boolean;
  startTime: number;
  lifetime: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  speed: number;
}

export class JoyOrbs {
  readonly group = new THREE.Group();
  private readonly meshes: THREE.Mesh[] = [];
  private readonly state: OrbState[] = [];
  private spawnAccumulator = 0;

  /** 0..1 — driven by the joy emotion weight. */
  weight = 0;

  constructor() {
    // 16×12 is enough — the displacement shader makes a smoother sphere
    // look bumpier than its tessellation suggests.
    const geom = new THREE.SphereGeometry(ORB_RADIUS, 16, 12);

    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new FireOrbMaterial();
      // Per-orb seed offset — unique fire pattern per flame. The 47.13
      // multiplier is arbitrary, just spreads the seeds across the
      // noise field so neighbours don't share a pattern by accident.
      mat.uniforms.uSeed.value.set(
        Math.random() * 47.13,
        Math.random() * 31.71,
        Math.random() * 23.49,
      );
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(0, OFFSCREEN_Y, 0);
      this.group.add(mesh);
      this.meshes.push(mesh);
      this.state.push({
        active: false, startTime: 0, lifetime: 0,
        dirX: 0, dirY: 0, dirZ: 0, speed: 0,
      });
    }
  }

  update(ctx: FrameContext): void {
    if (this.weight > 0.03) {
      this.spawnAccumulator += this.weight * SPAWN_RATE_AT_FULL * ctx.delta;
      while (this.spawnAccumulator >= 1) {
        this.spawnAccumulator -= 1;
        this.spawnOne(ctx.time);
      }
    } else {
      this.spawnAccumulator = 0;
    }

    for (let i = 0; i < POOL_SIZE; i++) {
      const s = this.state[i]!;
      if (!s.active) continue;
      const mesh = this.meshes[i]!;
      const mat = mesh.material as FireOrbMaterial;
      const elapsed = ctx.time - s.startTime;
      const t = elapsed / s.lifetime;
      if (t >= 1) {
        s.active = false;
        mesh.position.set(0, OFFSCREEN_Y, 0);
        mat.uniforms.uLifeFade.value = 0;
        continue;
      }

      // Linear outward — keeping the 'shoot' gesture sharp.
      const dist = s.speed * elapsed;
      mesh.position.set(s.dirX * dist, s.dirY * dist, s.dirZ * dist);

      // Lifetime envelope: quick brighten, long sustain, slow fade.
      const fadeIn  = THREE.MathUtils.smoothstep(t, 0, 0.12);
      const fadeOut = 1 - t;
      mat.uniforms.uTime.value = ctx.time;
      mat.uniforms.uLifeFade.value = fadeIn * fadeOut;
    }
  }

  private spawnOne(time: number): void {
    let slot = -1;
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!this.state[i]!.active) { slot = i; break; }
    }
    if (slot < 0) return;

    // Uniform direction on the unit sphere — polar/azimuthal sampling
    // with cos(phi) so up/down aren't biased.
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const sinPhi = Math.sin(phi);
    const s = this.state[slot]!;
    s.active = true;
    s.startTime = time;
    s.lifetime = LIFETIME_MIN + Math.random() * (LIFETIME_MAX - LIFETIME_MIN);
    s.dirX = sinPhi * Math.cos(theta);
    s.dirY = sinPhi * Math.sin(theta);
    s.dirZ = Math.cos(phi);
    s.speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
  }
}
