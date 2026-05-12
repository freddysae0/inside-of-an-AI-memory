import * as THREE from 'three';

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  clearColor?: number;
  maxPixelRatio?: number;
}

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly size = new THREE.Vector2();
  private dpr: number;
  private readonly maxDpr: number;
  private readonly onResize = () => this.resize();

  constructor(opts: RendererOptions) {
    this.maxDpr = opts.maxPixelRatio ?? 2;
    this.dpr = Math.min(window.devicePixelRatio, this.maxDpr);

    this.gl = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: false, // we lean on postprocessing for AA
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.gl.setPixelRatio(this.dpr);
    this.gl.setClearColor(opts.clearColor ?? 0x05060a, 1);
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.0;

    this.resize();
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.size.set(w, h);
    this.gl.setSize(w, h, false);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.gl.dispose();
  }
}
