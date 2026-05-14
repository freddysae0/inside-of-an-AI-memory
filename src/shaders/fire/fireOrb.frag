// Fire-ball shader for the joy orbs.
//
// Two-octave simplex turbulence drives a four-stop heat ramp:
//   black → red → yellow → white-hot
// vFacing-modulated alpha fades the silhouette so the orb dissolves
// into space at grazing angles instead of cutting off with a hard edge.
// Y-bias on the noise makes hot pockets favour the upper hemisphere —
// flames look like they 'rise' inside the orb instead of swirling
// symmetrically.

#include "../lib/simplex3d.glsl"

uniform float uTime;
uniform vec3  uSeed;
uniform float uLifeFade;   // 0..1 — set per frame from spawn lifetime

varying vec3  vLocalPos;
varying float vFacing;

void main() {
  // Same noise field as the vertex displacement, sampled at higher
  // frequency for color richness.
  vec3 nPos = vLocalPos * 3.4 + vec3(0.0, -uTime * 2.0, 0.0) + uSeed;
  float n  = snoise(nPos) * 0.5 + 0.5;
  n += snoise(nPos * 2.2) * 0.30;
  n = clamp(n, 0.0, 1.4);

  // Y-bias: hot pockets favour the top half. -0.9 .. 0.6 was tuned to
  // give a clear bottom-cool / top-hot read on the deformed sphere.
  n *= smoothstep(-0.9, 0.6, vLocalPos.y);

  // Heat ramp — four stops, each transition tuned by the bands below.
  // Bands aren't equal width on purpose: the warm→hot region is wider
  // than the hot→white region, so most of the orb reads as 'fire' and
  // only the small inner core reaches white-hot.
  vec3 cBlack  = vec3(0.10, 0.04, 0.02);
  vec3 cRed    = vec3(0.95, 0.20, 0.05);
  vec3 cYellow = vec3(1.00, 0.78, 0.22);
  vec3 cWhite  = vec3(1.00, 0.96, 0.85);

  vec3 col;
  if (n < 0.35)      col = mix(cBlack,  cRed,    n / 0.35);
  else if (n < 0.75) col = mix(cRed,    cYellow, (n - 0.35) / 0.40);
  else               col = mix(cYellow, cWhite,  (n - 0.75) / 0.25);

  // Alpha — fade by heat and by view facing. Soft silhouette read.
  float heatAlpha = smoothstep(0.05, 0.35, n);
  float rimAlpha  = smoothstep(0.0, 0.30, vFacing);
  float a = heatAlpha * rimAlpha * uLifeFade;

  gl_FragColor = vec4(col, a);
}
