// Dissolve transition — pmndrs/postprocessing Effect fragment.
// Inputs provided by the wrapper: `inputColor` is the current composer
// pipeline's output; `uv` is the fullscreen UV. We mix with `tPrevious`
// (a snapshot of the previous scene) under a simplex-noise mask.

#include "../lib/simplex3d.glsl"

uniform sampler2D tPrevious;
uniform float uProgress;
uniform float uScale;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 prev = texture2D(tPrevious, uv);

  // Noise in [0, 1]. Two octaves for a richer dissolve edge.
  float n  = snoise(vec3(uv * uScale, 0.0)) * 0.5 + 0.5;
  float n2 = snoise(vec3(uv * uScale * 2.13 + 11.0, 0.0)) * 0.5 + 0.5;
  float mask = mix(n, n2, 0.35);

  // Soft threshold band — 0.18 wide so the dissolve has visible "front".
  float edge = 0.18;
  float t = smoothstep(uProgress - edge, uProgress + edge, mask);

  // t=1 → keep previous frame; t=0 → reveal current.
  vec3 col = mix(inputColor.rgb, prev.rgb, t);

  // Subtle hot rim along the dissolve front — visible "eat through" line.
  float rim = (1.0 - abs(mask - uProgress) / edge);
  rim = clamp(rim, 0.0, 1.0);
  rim = pow(rim, 8.0);
  col += vec3(0.45, 0.62, 1.0) * rim * 0.6;

  outputColor = vec4(col, inputColor.a);
}
