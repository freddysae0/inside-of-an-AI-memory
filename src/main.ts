import { Renderer } from './core/Renderer';
import { AnimationManager } from './core/AnimationManager';
import { Input } from './core/Input';
import { SceneManager } from './core/SceneManager';
import { PostFX } from './core/PostFX';
import { ScrollDirector } from './core/ScrollDirector';
import { Transitions } from './core/Transitions';
import { CorruptionEffect } from './core/Corruption';
import { Audio } from './core/Audio';
import { HUD } from './ui/HUD';
import { SECTOR_COPY } from './ui/copy';
import { EntryRoom } from './scenes/EntryRoom';
import { Datasets } from './scenes/Datasets';
import { Emotions } from './scenes/Emotions';
import { Corruption } from './scenes/Corruption';
import { Reconstruction } from './scenes/Reconstruction';

const SECTORS = ['entry', 'datasets', 'emotions', 'corruption', 'reconstruction'] as const;

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const input = new Input();
const scenes = new SceneManager();
const postfx = new PostFX({ gl: renderer.gl });
const corruption = new CorruptionEffect();
postfx.appendEffect(corruption);
const transitions = new Transitions(renderer.gl);
postfx.appendEffect(transitions.effect);
const scroll = new ScrollDirector(SECTORS.length);
const hud = new HUD();
const audio = new Audio();
const anim = new AnimationManager();

const audioToggle = document.getElementById('audio-toggle') as HTMLButtonElement | null;
audioToggle?.addEventListener('click', () => {
  audio.start();
  audioToggle.setAttribute('aria-pressed', 'true');
});

const initialCopy = SECTOR_COPY[0];
if (initialCopy) hud.setSector(initialCopy);

const entry = new EntryRoom(input);
const datasets = new Datasets(scroll);
const emotions = new Emotions(scroll);
const corruptionScene = new Corruption(scroll, corruption);
const reconstruction = new Reconstruction(scroll);
scenes.register(entry);
scenes.register(datasets);
scenes.register(emotions);
scenes.register(corruptionScene);
scenes.register(reconstruction);
scenes.goto('entry');

const applyScene = () => {
  const cur = scenes.current;
  if (cur) postfx.setScene(cur.scene, cur.camera);
};
applyScene();

scroll.onSectorChange((_prev, next) => {
  const id = SECTORS[next];
  const copy = SECTOR_COPY[next];
  if (copy) hud.setSector(copy);
  if (id && scenes.current?.id !== id) {
    const outgoing = scenes.current;
    try {
      scenes.goto(id);
      if (outgoing) transitions.begin({ scene: outgoing.scene, camera: outgoing.camera });
      applyScene();
    } catch { /* sector scene not yet implemented */ }
  }
});

const applySize = () => {
  scenes.resize(renderer.size.x, renderer.size.y);
  postfx.setSize(renderer.size.x, renderer.size.y);
  transitions.setSize(renderer.size.x, renderer.size.y);
};
applySize();
window.addEventListener('resize', applySize);

const progressBar = document.getElementById('progress-bar');

anim.add((ctx) => {
  input.update(ctx.delta);
  scroll.update(ctx.time);
  audio.update();

  // Audio → shader bridge. Bass thumps entry-core breath + emotions
  // amplitude, and (below) adds a corruption-intensity floor.
  const bassBoost = audio.bass;
  entry.setAudioBass(bassBoost);
  emotions.setAudioBass(bassBoost);

  scenes.update(ctx);

  // Add an audio-driven floor to corruption intensity but only inside that sector.
  if (scroll.sector === 3) {
    const cur = corruption.uniforms.get('uIntensity');
    if (cur) cur.value = Math.max(cur.value, bassBoost * 0.5);
  }

  transitions.update(ctx.delta);
  postfx.render(ctx.delta);
  if (progressBar) progressBar.style.width = `${(scroll.journey * 100).toFixed(2)}%`;
  hud.setOutro(scroll.journey > 0.95);
});

anim.start();
