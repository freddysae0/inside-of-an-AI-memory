import * as THREE from 'three';
import type { FrameContext } from '../../core/AnimationManager';

/**
 * Joy — outward radiation.
 *
 * Warm bright orbs spawn from the blob's centre and shoot outward in
 * random directions, fading and shrinking before recycling. The motion
 * vocabulary is 'giving' rather than 'receiving' — joy as expansion,
 * as something insisting on being shared. Bloom does most of the
 * lifting; orbs are intentionally bright to trigger the bloom pass.
 */
const POOL_SIZE = 48;
const SPAWN_RATE_AT_FULL = 14;        // orbs per second at weight=1
const LIFETIME_MIN = 0.7;
const LIFETIME_MAX = 1.15;
const SPEED_MIN = 1.6;
const SPEED_MAX = 2.8;
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
    const geom = new THREE.SphereGeometry(0.05, 12, 8);

    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffb070,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // Fog off on orbs — they're meant to read at any depth so the
        // joy reads in the user's foreground.
        fog: false,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(0, OFFSCREEN_Y, 0);
      mesh.scale.setScalar(0);
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
      const elapsed = ctx.time - s.startTime;
      const t = elapsed / s.lifetime;
      if (t >= 1) {
        s.active = false;
        mesh.position.set(0, OFFSCREEN_Y, 0);
        mesh.scale.setScalar(0);
        continue;
      }

      // Linear outward — easing the position would soften the 'shoot'
      // gesture which is the whole point.
      const dist = s.speed * elapsed;
      mesh.position.set(s.dirX * dist, s.dirY * dist, s.dirZ * dist);

      // Shrink + fade across lifetime. Slight bias so the orb is
      // brightest in its first third — joy as initial spark.
      const fadeIn  = THREE.MathUtils.smoothstep(t, 0, 0.12);
      const fadeOut = 1 - t;
      const opacity = fadeIn * fadeOut;
      const scale = 1.0 - t * 0.55;
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      mesh.scale.setScalar(Math.max(scale, 0.001));
    }
  }

  private spawnOne(time: number): void {
    let slot = -1;
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!this.state[i]!.active) { slot = i; break; }
    }
    if (slot < 0) return;

    // Uniform direction on the unit sphere via the standard
    // polar/azimuthal sampling. Cos(phi) lets phi tilt above and
    // below the equator equally — orbs don't bias upward or downward.
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
