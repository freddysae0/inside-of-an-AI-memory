#include "../lib/simplex3d.glsl"

uniform float uTime;
uniform vec3  uSeed;     // per-orb offset so each flame has its own pattern

varying vec3  vLocalPos;
varying float vFacing;   // dot(normal, viewDir), [0..1]

void main() {
  vec3 pos = position;

  // Upward turbulence on the mesh surface. The noise field scrolls
  // *down* in time so the surface deformation reads as fire 'flowing up'
  // through a stationary medium. uSeed gives every orb its own pattern.
  vec3 nPos = position * 2.6 + vec3(0.0, -uTime * 2.4, 0.0) + uSeed;
  float n1 = snoise(nPos);
  float n2 = snoise(nPos * 2.3) * 0.5;
  float disp = n1 + n2;
  pos += normal * disp * 0.20;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vec3 worldN = normalize(mat3(modelMatrix) * normal);
  vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
  vFacing = max(dot(worldN, viewDir), 0.0);

  vLocalPos = pos;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
