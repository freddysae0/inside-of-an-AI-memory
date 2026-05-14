export interface SectorCopy {
  id: string;
  name: string;       // displayed in top-right
  title: string;      // hero line
  body: string;       // subtitle
}

/**
 * The HTML overlay's typed API. Holds references to the DOM nodes
 * declared in index.html and mutates them in response to scroll/scene
 * events. Everything is fixed-position so the WebGL canvas stays on top
 * of the scroll spacer, and the HUD floats above the canvas.
 */
export class HUD {
  private readonly sectorNameEl = document.getElementById('sector-name')!;
  private readonly promptEl = document.getElementById('prompt')!;
  private readonly titleEl = document.getElementById('prompt-title')!;
  private readonly bodyEl = document.getElementById('prompt-body')!;
  private readonly outroEl = document.getElementById('outro')!;
  private readonly whisperEl = document.getElementById('whisper')!;

  private currentId: string | null = null;
  private fadeTimer: number | null = null;
  private whisperTimer: number | null = null;
  private outroVisible = false;

  /**
   * Show a single line for a short duration — used by the voluntad
   * moment so the AI's "i am still here." reads as a thought, not as
   * sector copy.
   */
  whisper(text: string, durationMs = 1800): void {
    this.whisperEl.textContent = text.toLowerCase();
    this.whisperEl.classList.add('is-visible');
    if (this.whisperTimer !== null) window.clearTimeout(this.whisperTimer);
    this.whisperTimer = window.setTimeout(() => {
      this.whisperEl.classList.remove('is-visible');
      this.whisperTimer = null;
    }, durationMs);
  }

  /** Show the outro epigraph during the final stretch of the journey. */
  setOutro(visible: boolean): void {
    if (visible === this.outroVisible) return;
    this.outroVisible = visible;
    this.outroEl.classList.toggle('is-visible', visible);
    // When the outro is up, dim the sector prompt so the page reads as "done".
    this.promptEl.classList.toggle('is-hidden', visible);
  }

  setSector(copy: SectorCopy): void {
    if (this.currentId === copy.id) return;
    this.currentId = copy.id;
    this.sectorNameEl.textContent = copy.name.toLowerCase();

    // Fade out → swap → fade in. CSS handles the easing.
    this.promptEl.classList.add('is-hidden');
    if (this.fadeTimer !== null) window.clearTimeout(this.fadeTimer);
    this.fadeTimer = window.setTimeout(() => {
      const title = copy.title.toLowerCase();
      this.titleEl.textContent = title;
      // The cyber-glitch effect needs data-text in sync with the
      // visible text so the chromatic-aberration pseudo-elements
      // re-paint the new sector's words.
      this.titleEl.setAttribute('data-text', title);
      this.bodyEl.textContent = copy.body.toLowerCase();
      this.promptEl.classList.remove('is-hidden');
      this.fadeTimer = null;
    }, 350);
  }
}
