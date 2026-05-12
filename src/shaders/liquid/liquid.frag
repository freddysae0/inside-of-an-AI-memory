// Emotion-graded liquid surface.
// Three palette anchors (sad, joy, wonder) are blended by uEmotion ∈ [0,1].
//   0.0 → sad      (deep ultramarine)
//   0.5 → joy      (warm magenta / amber)
//   1.0 → wonder   (cyan / pale green)
// Veins: a thin bright network from the local position field — reads as
// circulation under the surface.

#include "../lib/simplex3d.glsl"

uniform float uTime;
uniform float uEmotion;
uniform vec3 uSad;
uniform vec3 uJoy;
uniform vec3 uWonder;
uniform float uRimPower;
uniform float uRimIntensity;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec3 vLocalPos;
varying float vDisplacement;

vec3 palette(float t) {
  // Piecewise blend: 0→0.5 sad→joy, 0.5→1 joy→wonder.
  vec3 a = mix(uSad, uJoy,    smoothstep(0.0, 0.5, t));
  vec3 b = mix(uJoy, uWonder, smoothstep(0.5, 1.0, t));
  return mix(a, b, smoothstep(0.5, 0.5001, t));
}

void main() {
  vec3 base = palette(uEmotion);

  // Veins — thin bright stripes from noise field at a different scale.
  float v = snoise(vLocalPos * 3.5 + vec3(0.0, uTime * 0.12, 0.0));
  float veins = smoothstep(0.55, 0.62, v);
  vec3 veinCol = mix(vec3(1.0), base * 1.6, 0.4);

  // Body tint by local displacement — peaks read lighter.
  vec3 body = base * (0.55 + 0.45 * smoothstep(-0.4, 0.6, vDisplacement));

  // Fresnel rim.
  float ndv = max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);
  float fresnel = pow(1.0 - ndv, uRimPower);
  vec3 rim = base * fresnel * uRimIntensity;

  vec3 col = body + veinCol * veins * 0.8 + rim;

  gl_FragColor = vec4(col, 1.0);
}
