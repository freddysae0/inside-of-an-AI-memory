// Radial blur — samples N points along the ray from the screen centre
// toward the current pixel and averages them. Strength scales how far
// apart the samples are.
//
// Used as the cinematic punch during the voluntad moment: the
// screen 'tunnels toward the centre' while the AI re-gathers, then
// releases as failure resumes.

uniform float uStrength;     // 0 = pass-through, ~0.18 = strong tunnel
uniform vec2  uCenter;       // typically (0.5, 0.5)

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 toCenter = uCenter - uv;

  // Eight samples is enough — the human eye reads the radial streak
  // long before the sample count would visibly limit it, and 8 keeps
  // the cost low on integrated GPUs.
  const int SAMPLES = 8;
  vec3 accum = inputColor.rgb;
  float weight = 1.0;

  for (int i = 1; i < SAMPLES; i++) {
    float t = float(i) / float(SAMPLES);
    vec2 sampleUv = uv + toCenter * t * uStrength;
    accum += texture2D(inputBuffer, sampleUv).rgb;
    weight += 1.0;
  }

  outputColor = vec4(accum / weight, inputColor.a);
}
