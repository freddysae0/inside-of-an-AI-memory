/**
 * Render a phrase to an offscreen 2D canvas. Returned canvas can be
 * sampled (textTargetSampler) for particle targets or wrapped in a
 * THREE.CanvasTexture for materials.
 *
 * Defaults match the HUD typographic system (lowercase mono, wide
 * tracking) so text in WebGL feels like part of the same interface,
 * not a separate widget.
 *
 * Auto-fit: when the rendered string would overflow the canvas width,
 * fontPx is scaled down to fit with a small horizontal margin. Web
 * fonts loading after construction (e.g. JetBrains Mono via Google)
 * have wider glyphs than system mono fallbacks and would otherwise
 * silently clip the first and last characters off the canvas.
 */
export interface TextCanvasOptions {
  width?: number;
  height?: number;
  fontPx?: number;
  font?: string;
  color?: string;
  letterSpacingEm?: number;
  /** Horizontal safety margin per side as fraction of width. Default 0.06. */
  marginFrac?: number;
}

export function renderTextToCanvas(
  text: string,
  opts: TextCanvasOptions = {},
  intoCanvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  const width  = opts.width  ?? intoCanvas?.width  ?? 1200;
  const height = opts.height ?? intoCanvas?.height ?? 220;
  let   fontPx = opts.fontPx ?? 130;
  const font   = opts.font   ?? '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';
  const color  = opts.color  ?? '#ffffff';
  const tracking = opts.letterSpacingEm ?? 0.06;
  const marginFrac = opts.marginFrac ?? 0.06;

  // Reuse an existing canvas when given one. Lets callers swap textures
  // (CanvasTexture.needsUpdate = true) without churning GPU memory.
  const canvas = intoCanvas ?? document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const lower = text.toLowerCase();
  const maxAdvance = width * (1 - marginFrac * 2);

  // Browser CanvasRenderingContext2D has no letterSpacing in all engines,
  // so we draw character-by-character and measure per glyph (mono fonts
  // are still slightly per-glyph variable depending on rendering hints).
  const measure = (px: number): number => {
    ctx.font = `500 ${px}px ${font}`;
    let total = 0;
    for (const ch of lower) total += ctx.measureText(ch).width + px * tracking;
    return total - px * tracking; // no trailing spacer
  };

  let totalAdvance = measure(fontPx);
  if (totalAdvance > maxAdvance) {
    // Scale fontPx down proportionally and re-measure. Mono fonts'
    // advance scales linearly with px so one pass is sufficient.
    fontPx = Math.floor(fontPx * (maxAdvance / totalAdvance));
    totalAdvance = measure(fontPx);
  }

  // measure() set the final font; just draw.
  let x = (width - totalAdvance) * 0.5;
  const y = height * 0.5;
  for (const ch of lower) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + fontPx * tracking;
  }
  return canvas;
}
