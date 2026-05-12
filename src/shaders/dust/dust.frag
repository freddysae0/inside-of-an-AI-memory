uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;

varying float vSeed;
varying float vDepth;

void main() {
  // Soft circular dot. gl_PointCoord is in [0,1] over the point sprite.
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float alpha = smoothstep(1.0, 0.0, r);

  // Two-tone particles — random pick per seed.
  vec3 col = mix(uColorA, uColorB, step(0.5, vSeed));

  // Fade by depth so the field reads as a deep volume, not a flat sheet.
  float depthFade = clamp(1.0 - vDepth * 0.06, 0.2, 1.0);

  gl_FragColor = vec4(col * depthFade, alpha * uOpacity);
}
