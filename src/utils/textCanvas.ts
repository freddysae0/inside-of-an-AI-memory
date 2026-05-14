/**
 * Render a phrase to an offscreen 2D canvas. Returned canvas can be
 * sampled (textTargetSampler) for particle targets or wrapped in a
 * THREE.CanvasTexture for materials.
 *
 * Defaults match the HUD typographic system (lowercase mono, wide
 * tracking) so text in WebGL feels like part of the same interface,
 * not a separate widget.
 */
export interface TextCanvasOptions {
  width?: number;
  height?: number;
  fontPx?: number;
  font?: string;
  color?: string;
  letterSpacingEm?: number;
}

export function renderTextToCanvas(
  text: string,
  opts: TextCanvasOptions = {},
  intoCanvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  const width  = opts.width  ?? intoCanvas?.width  ?? 1200;
  const height = opts.height ?? intoCanvas?.height ?? 220;
  const fontPx = opts.fontPx ?? 130;
  const font   = opts.font   ?? 'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, monospace';
  const color  = opts.color  ?? '#ffffff';
  const tracking = opts.letterSpacingEm ?? 0.06;

  // Reuse an existing canvas when given one. Lets callers swap textures
  // (CanvasTexture.needsUpdate = true) without churning GPU memory.
  const canvas = intoCanvas ?? document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.font = `500 ${fontPx}px ${font}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  // Browser CanvasRenderingContext2D has no letterSpacing in all engines,
  // so we draw character-by-character. Width is measured per glyph to
  // keep proportional fonts honest if `font` is overridden.
  const lower = text.toLowerCase();
  let totalAdvance = 0;
  for (const ch of lower) totalAdvance += ctx.measureText(ch).width + fontPx * tracking;
  totalAdvance -= fontPx * tracking; // no trailing spacer
  let x = (width - totalAdvance) * 0.5;
  const y = height * 0.5;
  for (const ch of lower) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + fontPx * tracking;
  }
  return canvas;
}
