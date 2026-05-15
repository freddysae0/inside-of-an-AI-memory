import { Renderer } from './core/Renderer';
import { AnimationManager } from './core/AnimationManager';
import { Input } from './core/Input';
import { SceneManager } from './core/SceneManager';
import { PostFX } from './core/PostFX';
import { ScrollDirector } from './core/ScrollDirector';
import { Transitions } from './core/Transitions';
import { CorruptionEffect } from './core/Corruption';
import { RadialBlurEffect } from './core/RadialBlur';
import { AssetLoader } from './core/AssetLoader';
import { PerfMonitor } from './core/PerfMonitor';
import { HUD } from './ui/HUD';
import { SECTOR_COPY } from './ui/copy';
import { EntryRoom } from './scenes/EntryRoom';
import { Datasets } from './scenes/Datasets';
import { Emotions } from './scenes/Emotions';
import { Corruption } from './scenes/Corruption';
import { Reconstruction } from './scenes/Reconstruction';

const SECTORS = ['entry', 'datasets', 'emotions', 'corruption', 'reconstruction'] as const;

// --- Cheap singletons (no main-thread blocking) -------------------------
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const input = new Input();
const sceneMgr = new SceneManager();
const postfx = new PostFX({ gl: renderer.gl });
const corruption = new CorruptionEffect();
postfx.appendEffect(corruption);
const radialBlur = new RadialBlurEffect();
postfx.appendEffect(radialBlur);
const transitions = new Transitions(renderer.gl);
postfx.appendEffect(transitions.effect);
const scroll = new ScrollDirector(SECTORS.length);
const hud = new HUD();
const anim = new AnimationManager();

const initialCopy = SECTOR_COPY[0];
if (initialCopy) hud.setSector(initialCopy);

// --- Loader: stages the expensive scene constructions, paints progress -
const loaderEl = document.getElementById('loader');
const loaderFill = document.getElementById('loader-fill');
const loaderLabel = document.getElementById('loader-label');

const loader = new AssetLoader();
const getEntry = loader.add('entry sector',         () => new EntryRoom(input));
const getDatasets = loader.add('datasets sector',   () => new Datasets(scroll));
const getEmotions = loader.add('emotions sector',   () => new Emotions(scroll));
const getCorruptionScene = loader.add('corruption sector', () => new Corruption(scroll, corruption, radialBlur, hud));
const getReconstruction = loader.add('reconstruction sector', () => new Reconstruction(scroll));

loader.onProgress((p) => {
  if (loaderFill) loaderFill.style.width = `${(p.ratio * 100).toFixed(0)}%`;
  if (loaderLabel) loaderLabel.textContent = p.label;
});

void boot();

async function boot(): Promise<void> {
  await loader.run();
  const entry = getEntry();
  const datasets = getDatasets();
  const emotions = getEmotions();
  const corruptionScene = getCorruptionScene();
  const reconstruction = getReconstruction();

  sceneMgr.register(entry);
  sceneMgr.register(datasets);
  sceneMgr.register(emotions);
  sceneMgr.register(corruptionScene);
  sceneMgr.register(reconstruction);
  sceneMgr.goto('entry');

  const applyScene = () => {
    const cur = sceneMgr.current;
    if (cur) postfx.setScene(cur.scene, cur.camera);
  };
  applyScene();

  scroll.onSectorChange((_prev, next) => {
    const id = SECTORS[next];
    const copy = SECTOR_COPY[next];
    if (copy) hud.setSector(copy);
    if (id && sceneMgr.current?.id !== id) {
      const outgoing = sceneMgr.current;
      try {
        sceneMgr.goto(id);
        if (outgoing) transitions.begin({ scene: outgoing.scene, camera: outgoing.camera });
        applyScene();
      } catch { /* unknown sector */ }
    }
  });

  const applySize = () => {
    sceneMgr.resize(renderer.size.x, renderer.size.y);
    postfx.setSize(renderer.size.x, renderer.size.y);
    transitions.setSize(renderer.size.x, renderer.size.y);
  };
  applySize();
  window.addEventListener('resize', applySize);

  const progressBar    = document.getElementById('progress-bar');
  const progressReadout = document.getElementById('progress-readout');
  const depthReadout    = document.getElementById('depth-readout');

  const perf = new PerfMonitor({
    maxDpr: renderer.maxPixelRatio,
    apply: (dpr) => {
      renderer.setPixelRatio(dpr);
      postfx.setSize(renderer.size.x, renderer.size.y);
      transitions.setSize(renderer.size.x, renderer.size.y);
    },
  });

  anim.add((ctx) => {
    perf.tick(ctx.delta);
    input.update(ctx.delta);
    scroll.update(ctx.time);

    sceneMgr.update(ctx);

    transitions.update(ctx.delta);
    postfx.render(ctx.delta);
    // Depth readout: percent of journey, padded to 2 digits so the
    // HUD never reflows its width as the number grows.
    const pct = scroll.journey * 100;
    if (progressBar) progressBar.style.width = `${pct.toFixed(2)}%`;
    const pctStr = `${pct.toFixed(0).padStart(2, '0')}%`;
    if (progressReadout) progressReadout.textContent = pctStr;
    if (depthReadout)    depthReadout.textContent    = pctStr;
    hud.setOutro(scroll.journey > 0.95);
  });

  anim.start();

  // Hand-off — give one rAF for the first frame to paint, then fade.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => loaderEl?.classList.add('is-done'));
  });
}
