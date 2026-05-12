import { Renderer } from './core/Renderer';
import { AnimationManager } from './core/AnimationManager';
import { Input } from './core/Input';
import { SceneManager } from './core/SceneManager';
import { PostFX } from './core/PostFX';
import { ScrollDirector } from './core/ScrollDirector';
import { Transitions } from './core/Transitions';
import { HUD } from './ui/HUD';
import { SECTOR_COPY } from './ui/copy';
import { EntryRoom } from './scenes/EntryRoom';

const SECTORS = ['entry', 'datasets', 'emotions', 'corruption', 'reconstruction'] as const;

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const input = new Input();
const scenes = new SceneManager();
const postfx = new PostFX({ gl: renderer.gl });
const transitions = new Transitions(renderer.gl);
postfx.appendEffect(transitions.effect);
const scroll = new ScrollDirector(SECTORS.length);
const hud = new HUD();
const anim = new AnimationManager();

const initialCopy = SECTOR_COPY[0];
if (initialCopy) hud.setSector(initialCopy);

const entry = new EntryRoom(input);
scenes.register(entry);
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
  scenes.update(ctx);
  transitions.update(ctx.delta);
  postfx.render(ctx.delta);
  if (progressBar) progressBar.style.width = `${(scroll.journey * 100).toFixed(2)}%`;
});

anim.start();
