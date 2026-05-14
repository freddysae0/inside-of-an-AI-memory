uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;
uniform float uForm;
uniform float uLostThreshold;

varying float vSeed;
varying float vDepth;

float hashSeed(float n) { return fract(sin(n * 91.345) * 43758.5453); }

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;

  // Per-particle edge softness — driven by an *uncorrelated* hash over
  // vSeed so it doesn't track the size variety. Drift covers everything
  // from 0.04 (very soft halo) to 0.92 (crisp dot). Form=1 collapses
  // to a single value so every letter pixel reads identically.
  float seedEdge  = hashSeed(vSeed * 23.0);
  float seedAlpha = hashSeed(vSeed * 37.0);
  float driftEdge = 0.04 + seedEdge * 0.88;
  float formEdge  = 0.55;
  float edgeIn = mix(driftEdge, formEdge, uForm);
  float alpha = smoothstep(1.0, edgeIn, r);

  // Per-particle alpha bias in drift — some pixels are bright, others
  // are faint mist. Uniform at form=1 so the text reads dense.
  float driftAlpha = 0.35 + seedAlpha * 0.95;
  float formAlpha  = 1.0;
  float alphaMult = mix(driftAlpha, formAlpha, uForm);

  // Two-tone palette — random pick per seed.
  vec3 col = mix(uColorA, uColorB, step(0.5, vSeed));

  // Lost particles desaturate and dim. RECONSTRUCTION uses this to
  // mark the ~25% that never reassemble.
  float isLost = step(uLostThreshold, vSeed);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum * 0.55), isLost * 0.72);

  // Form-time colour dim — keeps the swarm under the bloom luminance
  // threshold (0.55) while reading text, so letters don't smear into
  // glow. Drift keeps full colour so motes glow as motes.
  col *= 1.0 - uForm * 0.35;

  // Depth fade so the volume reads deep, not as a flat sheet.
  float depthFade = clamp(1.0 - vDepth * 0.06, 0.2, 1.0);

  gl_FragColor = vec4(col * depthFade, alpha * uOpacity * alphaMult);
}
