#include "../lib/simplex3d.glsl"

uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uEmotion;     // 0 sad, 0.5 joy, 1 wonder
uniform float uWetness;     // water look weight (sad)
uniform float uHeat;        // fire look weight (joy)

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec3 vLocalPos;
varying float vDisplacement;

// FBM — three octaves of simplex noise for a richer liquid surface.
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

// --- Emotion grammars -----------------------------------------------------
// Each emotion has its own *rhythm* of motion, not just its own colour.
// sad    : asymmetric heartbeat — long pause, single heavy thump
// joy    : ripples from the centre outward — multiple drops at once
// wonder : a slow inhale that holds, then releases — the form
//          wanting to escape itself

float sadPulse(float t) {
  // pow(sin, 6) gives a narrow spike + long quiet between beats.
  return pow(0.5 + 0.5 * sin(t * 0.55), 6.0);
}

float joyPulse(float t) {
  // Two close-frequency sines beat against each other — irregular,
  // overlapping like multiple raindrops.
  float v = 0.5 + 0.5 * sin(t * 2.8) + 0.25 * sin(t * 4.5 + 1.7);
  return clamp(v, 0.0, 1.0);
}

float wonderPulse(float t) {
  // Triangle envelope: 0 → 1 → 0 over a long period. The breath
  // wants to keep expanding past where the body lets it.
  float phase = fract(t * 0.16);
  return smoothstep(0.0, 0.5, phase) - smoothstep(0.5, 1.0, phase);
}

float emotionPulse(float t, float e) {
  float s = sadPulse(t);
  float j = joyPulse(t);
  float w = wonderPulse(t);
  // Piecewise blend: 0→0.5 sad→joy, 0.5→1 joy→wonder.
  float ab = mix(s, j, smoothstep(0.0, 0.5, e));
  float bc = mix(j, w, smoothstep(0.5, 1.0, e));
  return mix(ab, bc, step(0.5, e));
}

void main() {
  vec3 pos = position;

  // Base FBM surface — always present, but its amplitude breathes
  // with the active emotion's grammar.
  float n = fbm(pos * uFrequency + vec3(0.0, uTime * 0.18, 0.0));
  float pulse = emotionPulse(uTime, uEmotion);
  float displacement = n * uAmplitude * (0.55 + 0.75 * pulse);

  // Joy-only: radial ripples emit from the centre outward. Sin-cosine
  // standing wave on the radial coordinate; weighted on a tight bell
  // around emotion=0.5 so sad/wonder don't catch it.
  float r = length(pos);
  float ripple = sin(r * 9.0 - uTime * 4.2) * exp(-r * 0.55);
  float joyW = smoothstep(0.18, 0.5, uEmotion) * (1.0 - smoothstep(0.5, 0.82, uEmotion));
  displacement += ripple * 0.12 * joyW;

  // Wonder-only: a slow body-wide bulge — the surface inflating past
  // its rest state. Decays back through sad/joy via smoothstep weight.
  float wonderW = smoothstep(0.55, 0.95, uEmotion);
  float wonderBulge = sin(uTime * 0.4) * 0.5 + 0.5;
  displacement += wonderBulge * 0.10 * wonderW;

  // --- Water ripples (sad) ---
  // High-frequency ripples on the surface so the silhouette reads as
  // restless water, not just blue gel. Small amplitude so the blob
  // shape stays recognisable.
  if (uWetness > 0.001) {
    float waterRipple = snoise(pos * 12.0 + vec3(0.0, uTime * 0.45, 0.0)) * 0.5
                      + snoise(pos * 22.0 + vec3(uTime * 0.30, 0.0, 0.0)) * 0.25;
    displacement += waterRipple * 0.045 * uWetness;
  }

  // --- Fire turbulence (joy) ---
  // Strong upward-flowing displacement so the silhouette licks like
  // flame. Same noise direction as the fire fragment so vertex
  // displacement and surface colour ride the same field.
  if (uHeat > 0.001) {
    vec3 firePos = pos * 2.2 + vec3(0.0, -uTime * 1.9, 0.0);
    float fireN = snoise(firePos) + snoise(firePos * 2.1) * 0.5;
    displacement += fireN * 0.16 * uHeat;
  }

  pos += normal * displacement;

  vLocalPos = pos;
  vDisplacement = displacement;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
