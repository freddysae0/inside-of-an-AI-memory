import * as THREE from 'three';
import type { MemoryScene } from '../core/SceneManager';
import type { FrameContext } from '../core/AnimationManager';
import type { ScrollDirector } from '../core/ScrollDirector';
import type { CorruptionEffect } from '../core/Corruption';

/**
 * CORRUPTION — a slowly tumbling cluster of fractured geometry under
 * the global Reality Corruption pass. The scene itself is austere on
 * purpose: the postprocessing pass carries the visual identity, and
 * the local scroll inside this sector escalates intensity 0 → 1.
 */
export class Corruption implements MemoryScene {
  readonly id = 'corruption';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  private readonly cluster: THREE.Group;
  private readonly sectorIndex = 3;

  constructor(
    private readonly scroll: ScrollDirector,
    private readonly corruption: CorruptionEffect,
  ) {
    this.scene.fog = new THREE.FogExp2(0x06070d, 0.22);
    this.camera.position.set(0, 0, 5);

    const hemi = new THREE.HemisphereLight(0x668cff, 0x0a0a14, 0.4);
    this.scene.add(hemi);
    const rim = new THREE.PointLight(0x88aaff, 6, 14, 2);
    rim.position.set(3, 2, 2);
    this.scene.add(rim);

    this.cluster = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x131b2c, roughness: 0.4, metalness: 0.55,
      emissive: 0x223355, emissiveIntensity: 0.15,
    });
    // 18 shards on a sphere — each rotated and scaled, reads as a
    // shattered core mid-fall-apart.
    for (let i = 0; i < 18; i++) {
      const g = new THREE.IcosahedronGeometry(0.18 + Math.random() * 0.22, 0);
      const m = new THREE.Mesh(g, mat);
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 0.9 + Math.random() * 0.5;
      m.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
      m.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
      this.cluster.add(m);
    }
    this.scene.add(this.cluster);
  }

  enter(): void {}
  exit(): void { this.corruption.setIntensity(0); }

  update(ctx: FrameContext): void {
    this.cluster.rotation.y = ctx.time * 0.06;
    this.cluster.rotation.x = ctx.time * 0.03;

    // Shards drift outward as corruption escalates — visualises decoherence.
    const local = this.scroll.sector === this.sectorIndex ? this.scroll.local : 0;
    const drift = 1 + local * 0.7;
    this.cluster.scale.setScalar(drift);

    // Easing curve so the first 30% is subtle and the last 30% is brutal.
    const intensity = Math.pow(local, 1.6);
    this.corruption.setIntensity(intensity);
    this.corruption.tick(ctx.time);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
