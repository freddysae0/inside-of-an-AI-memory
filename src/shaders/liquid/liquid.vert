#include "../lib/simplex3d.glsl"

uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec3 vLocalPos;
varying float vDisplacement;

// FBM — three octaves of simplex noise for a richer "liquid surface" look.
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * snoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 pos = position;
  float n = fbm(pos * uFrequency + vec3(0.0, uTime * 0.18, 0.0));
  float displacement = n * uAmplitude;
  pos += normal * displacement;

  vLocalPos = pos;
  vDisplacement = displacement;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
