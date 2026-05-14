import * as THREE from 'three';
import type { FrameContext } from '../../core/AnimationManager';

/**
 * Wonder — continuous dilation.
 *
 * Three translucent concentric shells perpetually expanding around
 * the blob, staggered in phase so at any moment one is young, one
 * is at peak size, one is fading. Reads as 'the boundaries around
 * the self are growing larger' — the visual register of being
 * suspended in front of something you can't quite encompass.
 *
 * BackSide rendering so we look *through* the front of each shell at
 * the blob inside, no z-fighting with the blob's outer surface.
 */
const SHELL_COUNT = 3;
const SHELL_DURATION = 4.6;    // seconds for one young→peak→fade cycle
const SHELL_SCALE_MIN = 1.0;
const SHELL_SCALE_MAX = 2.55;
const MAX_OPACITY = 0.16;

interface ShellState {
  startTime: number; // negative = uninitialised
}

export class WonderHalo {
  readonly group = new THREE.Group();
  private readonly meshes: THREE.Mesh[] = [];
  private readonly state: ShellState[] = [];

  /** 0..1 — driven by the wonder emotion weight. */
  weight = 0;

  constructor() {
    const geom = new THREE.SphereGeometry(1.0, 32, 24);

    for (let i = 0; i < SHELL_COUNT; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x7af3d0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.BackSide,
        // Additive so the cyan glow stacks where shells overlap —
        // gives the dilation a subtle 'depth field' feel.
        blending: THREE.AdditiveBlending,
        fog: false,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.scale.setScalar(SHELL_SCALE_MIN);
      this.group.add(mesh);
      this.meshes.push(mesh);
      // Stagger the starts so cycles overlap evenly. Negative means
      // uninitialised — first update() will arm them properly.
      this.state.push({ startTime: -1 });
    }
  }

  update(ctx: FrameContext): void {
    // Lazy-init staggered starts on first update so cycles overlap
    // exactly 1/3 apart and we're not bound to game-clock 0 phase.
    for (let i = 0; i < SHELL_COUNT; i++) {
      const s = this.state[i]!;
      if (s.startTime < 0) {
        s.startTime = ctx.time - (i * SHELL_DURATION / SHELL_COUNT);
      }
    }

    for (let i = 0; i < SHELL_COUNT; i++) {
      const s = this.state[i]!;
      const mesh = this.meshes[i]!;
      const t = ((ctx.time - s.startTime) % SHELL_DURATION) / SHELL_DURATION;

      // Continuously expanding scale — eased so it accelerates a bit
      // toward the end (a 'reaching' feel, not a uniform inflation).
      const ease = THREE.MathUtils.smoothstep(t, 0, 1);
      const scale = SHELL_SCALE_MIN + (SHELL_SCALE_MAX - SHELL_SCALE_MIN) * ease;
      mesh.scale.setScalar(scale);

      // Opacity envelope: fade in fast, hold high, fade out before
      // recycle. Multiplied by weight so shells silently disappear
      // outside the wonder phase.
      const fadeIn  = THREE.MathUtils.smoothstep(t, 0.02, 0.18);
      const fadeOut = 1 - THREE.MathUtils.smoothstep(t, 0.6, 1.0);
      const opacity = fadeIn * fadeOut * MAX_OPACITY * this.weight;
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  }
}
