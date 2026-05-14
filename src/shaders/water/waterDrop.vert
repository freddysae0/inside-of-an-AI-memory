varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec3 vLocalPos;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  vLocalPos = position;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
