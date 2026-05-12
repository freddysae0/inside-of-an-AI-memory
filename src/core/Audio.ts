/**
 * Audio engine — procedural ambient drone + analyser.
 *
 * No external audio files. A small choir of detuned oscillators plus a
 * filtered noise layer produces the bed; an LFO breathes the master
 * gain. The AnalyserNode feeds three smoothed values (level/bass/treble)
 * that scenes and shaders read each frame.
 *
 * Web Audio requires a user gesture to start. We expose start()
 * separately so main.ts can wire it to the first pointer/wheel input.
 */
export class Audio {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freq: Uint8Array<ArrayBuffer> | null = null;
  private started = false;

  /** smoothed [0, 1] values updated each frame */
  level = 0;
  bass = 0;
  treble = 0;

  start(): void {
    if (this.started) return;
    this.started = true;

    const Ctx = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.22;

    // Slow LFO breathing the master.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.08;
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start();

    // Three detuned sines + a triangle subharmonic — clean drone.
    [60, 60 * 1.005, 90, 150].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 3 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.18 / (i + 1);
      o.connect(g).connect(master);
      o.start();
    });

    // Filtered pink-ish noise for air.
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = b0 + b1 + b2 + white * 0.1848;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.04;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 900;
    noise.connect(lpf).connect(noiseGain).connect(master);
    noise.start();

    // Analyser.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;
    master.connect(analyser);
    master.connect(ctx.destination);

    this.analyser = analyser;
    this.freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

    // Resume — needed on Chrome even when constructed after a gesture.
    void ctx.resume();
  }

  update(): void {
    if (!this.analyser || !this.freq) return;
    this.analyser.getByteFrequencyData(this.freq);
    const n = this.freq.length;
    const splitLow = Math.floor(n * 0.12);
    const splitHigh = Math.floor(n * 0.6);
    let bassSum = 0, midSum = 0, trebleSum = 0;
    for (let i = 0; i < n; i++) {
      const v = (this.freq[i] ?? 0) / 255;
      if (i < splitLow) bassSum += v;
      else if (i < splitHigh) midSum += v;
      else trebleSum += v;
    }
    const bassAvg   = bassSum   / Math.max(1, splitLow);
    const midAvg    = midSum    / Math.max(1, splitHigh - splitLow);
    const trebleAvg = trebleSum / Math.max(1, n - splitHigh);

    // Heavy smoothing already in the analyser; light extra ease here.
    this.bass   = this.bass   * 0.6 + bassAvg   * 0.4;
    this.treble = this.treble * 0.6 + trebleAvg * 0.4;
    this.level  = this.level  * 0.6 + ((bassAvg + midAvg + trebleAvg) / 3) * 0.4;
  }
}
