#include "../lib/simplex3d.glsl"

attribute vec3 aBase;     // resting drift position
attribute vec3 aTarget;   // surface position to form on
attribute float aSeed;    // per-particle phase 0..1

uniform float uTime;
uniform float uForm;      // 0 = drifting, 1 = formed silhouette
uniform float uSize;
uniform float uDriftScale;

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
  float t = clamp(uForm + (aSeed - 0.5) * 0.25, 0.0, 1.0);
  t = smoothstep(0.0, 1.0, t);

  vec3 pos = mix(driftPos, aTarget, t);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // Perspective-correct point size, with a small breathing wobble.
  float wobble = 0.85 + 0.3 * sin(uTime * 1.5 + aSeed * 6.28);
  gl_PointSize = uSize * wobble * (300.0 / -mv.z);

  vSeed = aSeed;
  vDepth = -mv.z;
}
