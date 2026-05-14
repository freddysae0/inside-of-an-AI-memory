// Emotion-graded liquid surface.
//
// Base layer  : palette anchor blend (sad → joy → wonder) plus a vein
//               network and fresnel rim, scaled by overlay weight so it
//               fades when a substance-look takes over.
// Water layer : strong fresnel + procedural caustics + depth tint
//               (sad). Weighted by uWetness.
// Fire layer  : two-octave noise driving a four-stop heat ramp with a
//               vertical bias (joy). Weighted by uHeat.
// Glow layer  : near-white edge halo + warm core (wonder). Weighted by
//               uGlow.
//
// The three substance looks are added on top of a fading base so the
// blob reads as 'becoming water', 'becoming fire', 'becoming light'
// rather than 'painted with water', 'painted with fire'.

#include "../lib/simplex3d.glsl"

uniform float uTime;
uniform float uEmotion;
uniform vec3  uSad;
uniform vec3  uJoy;
uniform vec3  uWonder;
uniform float uRimPower;
uniform float uRimIntensity;
uniform float uWetness;     // sad weight, water look
uniform float uHeat;        // joy weight, fire look
uniform float uGlow;        // wonder weight, light look

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec3 vLocalPos;
varying float vDisplacement;

vec3 palette(float t) {
  vec3 a = mix(uSad, uJoy,    smoothstep(0.0, 0.5, t));
  vec3 b = mix(uJoy, uWonder, smoothstep(0.5, 1.0, t));
  return mix(a, b, step(0.5, t));
}

// ---- WATER ----
// Two scrolling simplex layers crossed together produce caustic-like
// pinpoints. pow(.,4) sharpens them. The result is added to a fresnel-
// modulated translucent blue body.
vec3 waterLook(float fresnel) {
  float c1 = snoise(vLocalPos *  8.0 + vec3(0.0, uTime * 0.40, 0.0));
  float c2 = snoise(vLocalPos * 14.0 + vec3(uTime * 0.55, 0.0, 0.0));
  float caustics = pow(max(c1 + c2 * 0.55, 0.0), 4.0);

  vec3 deep    = uSad * 0.45;
  vec3 surface = vec3(0.62, 0.86, 1.00);
  vec3 col = mix(deep, surface, fresnel * 0.85);
  col += vec3(0.55, 0.85, 1.00) * caustics * 0.95;
  return col;
}

// ---- FIRE ----
// Same noise field as the fire-orb shader so the look is consistent
// across joy elements. Y-bias makes hot pockets favour the upper
// hemisphere.
vec3 fireLook() {
  vec3 nPos = vLocalPos * 2.6 + vec3(0.0, -uTime * 1.7, 0.0);
  float n = snoise(nPos) * 0.5 + 0.5;
  n += snoise(nPos * 2.2) * 0.30;
  n = clamp(n, 0.0, 1.4);
  n *= smoothstep(-0.9, 0.6, vLocalPos.y);

  vec3 cBlack  = vec3(0.10, 0.04, 0.02);
  vec3 cRed    = vec3(0.95, 0.20, 0.05);
  vec3 cYellow = vec3(1.00, 0.78, 0.22);
  vec3 cWhite  = vec3(1.00, 0.96, 0.85);
  vec3 col;
  if (n < 0.35)      col = mix(cBlack,  cRed,    n / 0.35);
  else if (n < 0.75) col = mix(cRed,    cYellow, (n - 0.35) / 0.40);
  else               col = mix(cYellow, cWhite,  (n - 0.75) / 0.25);
  return col;
}

// ---- GLOW ----
// Wonder reads as a near-white edge halo over a warm-cyan core. The
// inner brightness pulses slowly so the form never feels frozen.
vec3 glowLook(float fresnel) {
  vec3 core = uWonder * 0.55;
  vec3 edge = vec3(0.95, 0.99, 1.00);
  float pulse = 0.85 + 0.15 * sin(uTime * 0.6);
  vec3 col = mix(core, edge, fresnel);
  col += edge * pow(fresnel, 0.45) * 0.55 * pulse;
  return col;
}

void main() {
  vec3 base = palette(uEmotion);

  // Veins — thin bright stripes from a different-scale noise field.
  float v = snoise(vLocalPos * 3.5 + vec3(0.0, uTime * 0.12, 0.0));
  float veins = smoothstep(0.55, 0.62, v);
  vec3 veinCol = mix(vec3(1.0), base * 1.6, 0.4);

  vec3 body = base * (0.55 + 0.45 * smoothstep(-0.4, 0.6, vDisplacement));

  float ndv = max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);
  float fresnel = pow(1.0 - ndv, uRimPower);
  vec3 rim = base * fresnel * uRimIntensity;

  // Overlay weight — at any anchor only ONE substance look is dominant,
  // but at transitions two coexist briefly.
  float overlayW = clamp(uWetness + uHeat + uGlow, 0.0, 1.0);
  vec3 baseCol = (body + veinCol * veins * 0.8 + rim) * (1.0 - overlayW * 0.85);

  vec3 col = baseCol
           + waterLook(fresnel) * uWetness
           + fireLook()         * uHeat
           + glowLook(fresnel)  * uGlow;

  gl_FragColor = vec4(col, 1.0);
}
