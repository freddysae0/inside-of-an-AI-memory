#include "../lib/simplex3d.glsl"

uniform float uTime;
uniform float uBreath;    // 0..1 amplitude of breathing displacement
uniform float uPulse;     // 0..1 amplitude of pulse heartbeat
uniform float uFrequency; // spatial frequency of noise
uniform vec3  uPointer;   // pointer position in world space
uniform float uPointerStrength;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vDisplacement;

void main() {
  vec3 pos = position;

  // Breathing — slow low-frequency noise scrolling along normal.
  float n = snoise(pos * uFrequency + vec3(0.0, uTime * 0.25, 0.0));

  // Heartbeat — non-sinusoidal pulse so it feels organic, not mechanical.
  float beat = pow(0.5 + 0.5 * sin(uTime * 1.8), 6.0);
  float pulse = beat * uPulse;

  // Pointer attraction — gentle radial bulge toward cursor.
  float d = distance(pos, uPointer);
  float pointerInfluence = exp(-d * 2.5) * uPointerStrength;

  float displacement = (n * uBreath) + pulse + pointerInfluence;
  pos += normal * displacement;

  vDisplacement = displacement;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
