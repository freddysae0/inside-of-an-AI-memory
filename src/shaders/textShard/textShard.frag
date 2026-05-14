// Text shard — a plane showing one fragment of a remembered
// conversation. As uIntensity rises, simplex-noise threshold eats the
// letters away in chunks (not salt-and-pepper) so the failure reads as
// 'losing memory of this phrase', not as generic static.

#include "../lib/simplex3d.glsl"

uniform sampler2D uText;
uniform float uTime;
uniform float uIntensity;     // 0..1, shared with the global corruption pass
uniform vec3  uColor;
uniform vec3  uRimColor;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  vec4 t = texture2D(uText, vUv);
  if (t.a < 0.02) discard;

  // Per-pixel dissolve mask. Scale 4 keeps chunks letter-sized, not pixel-sized.
  // Time-evolved so the same letters don't fail in the same places frame after frame.
  float n = snoise(vec3(vUv * 4.0, uTime * 0.45)) * 0.5 + 0.5;
  float threshold = uIntensity * 0.95;
  float alive = smoothstep(threshold, threshold + 0.06, n);

  // Edge-of-failure hot rim — pixels right at the dissolve front glow,
  // so the eye reads each lost letter as 'burning out', not 'gone'.
  float front = 1.0 - abs(n - threshold) / 0.06;
  front = clamp(front, 0.0, 1.0) * step(0.001, uIntensity);
  vec3 hotEdge = uRimColor * pow(front, 6.0) * 1.4;

  vec3 col = uColor + hotEdge;
  float a = t.a * alive;

  gl_FragColor = vec4(col, a);
}
