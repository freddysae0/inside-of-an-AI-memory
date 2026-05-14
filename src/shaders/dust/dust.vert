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

varying float vSeed;
varying float vDepth;

// Simple noise-based drift vector — three orthogonal snoise lookups.
vec3 drift(vec3 p, float t) {
  float n1 = snoise(p * 0.6 + vec3( 0.0, t * 0.12,  0.0));
  float n2 = snoise(p * 0.6 + vec3(31.0, t * 0.12, 17.0));
  float n3 = snoise(p * 0.6 + vec3( 0.0, 11.0,  t * 0.12));
  return vec3(n1, n2, n3);
}

void main() {
  vec3 driftPos = aBase + drift(aBase + aSeed * 7.0, uTime) * uDriftScale;

  // Per-particle ease — adds shape "swarming in" instead of all-at-once snap.
  // Stagger amplitude was 0.25 (12.5% drift remainder at form=1) which left
  // letters fuzzy. 0.08 still staggers visibly while letting every particle
  // converge onto the target at the moment of reading.
  float t = clamp(uForm + (aSeed - 0.5) * 0.08, 0.0, 1.0);
  t = smoothstep(0.0, 1.0, t);

  // Lost particles: forced to t=0, drifting forever. Used by RECONSTRUCTION
  // where the AI comes back partial — not everything reassembles.
  float isLost = step(uLostThreshold, aSeed);
  t = mix(t, 0.0, isLost);

  vec3 pos = mix(driftPos, aTarget, t);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // Point size composes three factors:
  //   uSize         — material-level base radius
  //   wobble        — breathing wobble that fades as the swarm forms
  //                   (uniform-sized dots at form=1 keep letters crisp)
  //   distance term — perspective-correct scaling (300 / -mv.z)
  //
  // Bloom on bright additive points blurs letters into mush if dots are
  // big; the sizeScale mix dims and shrinks dots when forming so text
  // reads as crisp text, not glow.
  float wobbleBase = 0.85 + 0.30 * sin(uTime * 1.5 + aSeed * 6.28);
  float wobble = mix(wobbleBase, 0.90, uForm);
  float sizeScale = mix(1.0, 0.62, uForm);
  gl_PointSize = uSize * wobble * sizeScale * (300.0 / -mv.z);

  vSeed = aSeed;
  vDepth = -mv.z;
}
