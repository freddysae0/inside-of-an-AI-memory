uniform vec3  uColorDeep;
uniform vec3  uColorSurface;
uniform vec3  uColorRim;
uniform float uRimPower;
uniform float uRimIntensity;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vDisplacement;

void main() {
  // Fresnel — bright at grazing angles, dark facing camera.
  float ndv = max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);
  float fresnel = pow(1.0 - ndv, uRimPower);

  // Body color modulated by local displacement — peaks read brighter.
  vec3 body = mix(uColorDeep, uColorSurface, smoothstep(-0.2, 0.6, vDisplacement));
  vec3 rim = uColorRim * fresnel * uRimIntensity;

  vec3 col = body + rim;

  gl_FragColor = vec4(col, 1.0);
}
