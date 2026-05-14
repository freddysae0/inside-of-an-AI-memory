#include "../lib/simplex3d.glsl"

attribute vec3 aBase;     // resting drift position
attribute vec3 aTarget;   // surface position to form on
attribute float aSeed;    // per-particle phase 0..1

uniform float uTime;
uniform float uForm;      // 0 = drifting, 1 = formed silhouette
uniform float uSize;
uniform float uDriftScale;
uniform float uLostThreshold;  // particles with aSeed > threshold never form
                               // (default 1.1 = no lost particles)
uniform vec3  uTargetOffset;   // per-phrase target displacement (DATASETS)

varying float vSeed;
varying float vDepth;

// Trio of pseudo-random hashes over aSeed → uncorrelated per-particle
// traits without needing extra vertex attributes.
float hashSeed(float n) { return fract(sin(n * 91.345) * 43758.5453); }

// Simple noise-based drift vector — three orthogonal snoise lookups.
vec3 drift(vec3 p, float t) {
  float n1 = snoise(p * 0.6 + vec3( 0.0, t * 0.12,  0.0));
  float n2 = snoise(p * 0.6 + vec3(31.0, t * 0.12, 17.0));
  float n3 = snoise(p * 0.6 + vec3( 0.0, 11.0,  t * 0.12));
  return vec3(n1, n2, n3);
}

void main() {
  // Per-particle traits.
  float seedSpeed = hashSeed(aSeed *  7.0);
  float seedSize  = hashSeed(aSeed * 11.0);

  // Per-particle drift speed multiplier (0.4 → 2.0). Breaks the
  // synchronized motion that made the field feel like a single fluid;
  // some particles drift slowly, others fast — the volume reads as
  // layered.
  float driftSpeed = 0.4 + seedSpeed * 1.6;
  vec3 driftPos = aBase + drift(aBase + aSeed * 7.0, uTime * driftSpeed) * uDriftScale;

  // Form ease — small per-particle stagger so the swarm doesn't snap.
  float t = clamp(uForm + (aSeed - 0.5) * 0.08, 0.0, 1.0);
  t = smoothstep(0.0, 1.0, t);

  // Lost particles: forced to t=0, drifting forever. RECONSTRUCTION
  // uses this to leave some of the swarm permanently scattered.
  float isLost = step(uLostThreshold, aSeed);
  t = mix(t, 0.0, isLost);

  // Target is the sampled position plus a per-phrase displacement so
  // phrases don't always land in the exact same spot.
  vec3 effectiveTarget = aTarget + uTargetOffset;
  vec3 pos = mix(driftPos, effectiveTarget, t);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // --- Size: per-particle variety in drift, uniform at form=1 -------
  // Drift sizes range 0.45 → 2.4 — tiny pixels to large halos coexist
  // in the same field. At form=1 every dot collapses to one small
  // size so letters read as crisp text, not as a glow field.
  float driftSizeMult = 0.45 + seedSize * 1.95;
  float formSizeMult  = 0.62;
  float sizeMult = mix(driftSizeMult, formSizeMult, uForm);

  // Wobble (breathing) is per-particle frequency in drift; it fades to
  // a steady 1.0 at form so text isn't shimmering while it's read.
  float wobbleBase = 0.85 + 0.30 * sin(uTime * (1.0 + seedSpeed * 1.4) + aSeed * 6.28);
  float wobble = mix(wobbleBase, 1.0, uForm);

  gl_PointSize = uSize * wobble * sizeMult * (300.0 / -mv.z);

  vSeed = aSeed;
  vDepth = -mv.z;
}
