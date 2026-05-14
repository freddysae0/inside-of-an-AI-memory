// Refractive-looking tear drop. Tiny on screen so we lean on a strong
// fresnel rim + an internal hotspot near the top to sell 'water'.
// scene fog applies via the wrapper material (fog: true) so drops fade
// honestly into the volumetric distance.

uniform float uTime;
uniform float uOpacity;
uniform vec3  uColorDeep;
uniform vec3  uColorEdge;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec3 vLocalPos;

void main() {
  float ndv = max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);

  // Strong fresnel — water's high IOR brightens the silhouette edges
  // dramatically. pow(5) shapes a thin rim.
  float fresnel = pow(1.0 - ndv, 5.0);

  // Internal highlight near the upper-front pole — fakes a caustic
  // spot from a light source overhead. Drives most of the 'wet' read.
  vec2 hl = normalize(vLocalPos.xy) - vec2(0.0, 0.45);
  float dist = length(vec2(vLocalPos.x, vLocalPos.y - 0.45));
  float hotspot = 1.0 - smoothstep(0.0, 0.18, dist);
  hotspot = pow(hotspot, 3.0) * 0.85;

  // Body — darker indigo in the center, edge-tinted toward bright blue.
  vec3 body = mix(uColorDeep, uColorEdge, fresnel * 0.85);
  vec3 col = body + uColorEdge * hotspot;

  // Alpha is dominated by the fresnel + the hotspot, so the body
  // mid-section is faintly visible and the perimeter reads sharp.
  float alpha = (0.18 + fresnel * 0.80 + hotspot * 0.55) * uOpacity;

  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogFactor = 1.0 - exp(-fogDensity * fogDensity * gl_FragCoord.z * gl_FragCoord.z);
    #else
      float fogFactor = smoothstep(fogNear, fogFar, gl_FragCoord.z);
    #endif
    col = mix(col, fogColor, fogFactor);
  #endif

  gl_FragColor = vec4(col, alpha);
}
