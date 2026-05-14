/**
 * Sample 3D point positions from the non-transparent pixels of a
 * rendered text canvas. Output is a Float32Array of length count*3,
 * mapped to a world-space box centered on the origin.
 *
 * Pixels are scanned at a configurable stride to keep init time
 * bounded; if fewer pool entries are found than `count`, samples are
 * drawn with replacement (visually: strokes thicken, which reads
 * correctly for a 'dense data motes forming letters' aesthetic).
 *
 * Z is jittered by a small spread so the phrase has a hint of depth
 * and the particles don't all align on a perfect plane.
 */
export interface TextSamplerOptions {
  count: number;
  worldWidth: number;
  worldHeight: number;
  zSpread?: number;
  alphaThreshold?: number;
  pixelStride?: number;
}

export function sampleTextPositions(
  canvas: HTMLCanvasElement,
  opts: TextSamplerOptions,
): Float32Array {
  const { count, worldWidth, worldHeight } = opts;
  const zSpread       = opts.zSpread       ?? 0.10;
  const alphaThresh   = opts.alphaThreshold ?? 64;
  const stride        = opts.pixelStride   ?? 2;

  const ctx = canvas.getContext('2d');
  const out = new Float32Array(count * 3);

  if (!ctx) {
    // Fallback: small noise cloud — keeps the scene viable in obscure 2D-ctx failures.
    for (let i = 0; i < count; i++) {
      out[i * 3 + 0] = (Math.random() - 0.5) * worldWidth;
      out[i * 3 + 1] = (Math.random() - 0.5) * worldHeight;
      out[i * 3 + 2] = (Math.random() - 0.5) * zSpread;
    }
    return out;
  }

  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h).data;

  // First pass: collect (px, py) pool of opaque pixels.
  const pool: number[] = [];
  for (let py = 0; py < h; py += stride) {
    for (let px = 0; px < w; px += stride) {
      const a = img[(py * w + px) * 4 + 3] ?? 0;
      if (a > alphaThresh) {
        pool.push(px, py);
      }
    }
  }

  // Second pass: sample N points from the pool with replacement.
  const poolPairs = pool.length / 2;
  if (poolPairs === 0) return out;
  for (let i = 0; i < count; i++) {
    const idx = (Math.random() * poolPairs) | 0;
    const px = pool[idx * 2]!;
    const py = pool[idx * 2 + 1]!;
    out[i * 3 + 0] = (px / w - 0.5) * worldWidth;
    out[i * 3 + 1] = -(py / h - 0.5) * worldHeight; // flip: canvas y is down
    out[i * 3 + 2] = (Math.random() - 0.5) * zSpread;
  }
  return out;
}
