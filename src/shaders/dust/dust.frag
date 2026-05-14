uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;
uniform float uForm;
uniform float uLostThreshold;  // matches the vert uniform

varying float vSeed;
varying float vDepth;

void main() {
  // Soft circular dot. gl_PointCoord is in [0,1] over the point sprite.
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;

  // Sharper edge when the swarm is forming — additive bloom on soft-edged
  // dots blurs letters into glow. At form=1 the dot is nearly a hard disc.
  float edgeIn  = mix(1.0, 0.55, uForm);
  float alpha = smoothstep(1.0, edgeIn, r);

  // Two-tone particles — random pick per seed.
  vec3 col = mix(uColorA, uColorB, step(0.5, vSeed));

  // Lost particles desaturate and dim — they read as 'the ones the AI
  // could not bring back'. Pulled toward luminance-grey so they don't
  // compete with the surviving silhouette for attention.
  float isLost = step(uLostThreshold, vSeed);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum * 0.55), isLost * 0.72);

  // Drop colour luminance while forming so dots fall under the bloom
  // luminance threshold (0.55). Drift state keeps full colour — the
  // data motes still glow when they're motes.
  col *= 1.0 - uForm * 0.38;

  // Fade by depth so the field reads as a deep volume, not a flat sheet.
  float depthFade = clamp(1.0 - vDepth * 0.06, 0.2, 1.0);

  // Dim alpha while forming so the bloom kernel doesn't smear letters
  // into a uniform blob. 60k dots still aggregate to readable text —
  // they don't need to be bright, they need to be many and crisp.
  float formDim = 1.0 - uForm * 0.32;

  gl_FragColor = vec4(col * depthFade, alpha * uOpacity * formDim);
}
