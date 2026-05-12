// Reality Corruption — pmndrs/postprocessing Effect fragment.
//
// Five layered glitches, all driven by a single uIntensity ∈ [0,1]:
//   1. Sub-pixel sine warp  — soft wobble on X
//   2. Horizontal block slicing — bands occasionally jump sideways
//   3. RGB split (CA)         — channels diverge along X
//   4. Scanlines              — TV CRT vertical pattern
//   5. Loss-of-signal flicker — random dark bands at high intensity
//
// Effect uses EffectAttribute.CONVOLUTION on the TS side so we can
// sample `inputBuffer` at offset UVs.

uniform float uTime;
uniform float uIntensity;

float hash11(float n) { return fract(sin(n * 91.345) * 43758.5453123); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv;

  // (1) Sub-pixel sine warp.
  p.x += sin(uv.y * 60.0 + uTime * 4.0) * 0.003 * uIntensity;

  // (2) Block slicing — horizontal bands shift by a hashed amount.
  float blockY = floor(uv.y * 80.0);
  float blockHash = hash11(blockY + floor(uTime * 12.0));
  float doGlitch = step(0.86 - uIntensity * 0.30, blockHash);
  p.x += (blockHash - 0.5) * 0.10 * uIntensity * doGlitch;

  // (3) RGB split — sample inputBuffer three times.
  float ca = 0.005 * uIntensity * (1.0 + 0.5 * sin(uTime * 2.0));
  float r = texture2D(inputBuffer, p + vec2(ca,  0.0)).r;
  vec3  g = texture2D(inputBuffer, p).rgb;
  float b = texture2D(inputBuffer, p - vec2(ca,  0.0)).b;
  vec3 col = vec3(r, g.g, b);

  // (4) Scanlines — heavier at higher intensity.
  float scan = sin(uv.y * 900.0) * 0.5 + 0.5;
  col *= mix(1.0, 0.65 + 0.35 * scan, uIntensity * 0.7);

  // (5) Loss-of-signal band — very rare flicker that knocks brightness out.
  float lossHash = hash11(blockY * 0.13 + floor(uTime * 16.0));
  float loss = step(0.985 - uIntensity * 0.04, lossHash);
  col *= 1.0 - loss * uIntensity * 0.6;

  outputColor = vec4(col, inputColor.a);
}
