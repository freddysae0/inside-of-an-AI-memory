import { Renderer } from './core/Renderer';
import { AnimationManager } from './core/AnimationManager';
import { Input } from './core/Input';
import { SceneManager } from './core/SceneManager';
import { PostFX } from './core/PostFX';
import { EntryRoom } from './scenes/EntryRoom';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const input = new Input();
const scenes = new SceneManager();
const postfx = new PostFX({ gl: renderer.gl });
const anim = new AnimationManager();

const entry = new EntryRoom();
scenes.register(entry);
scenes.goto('entry');

const applyScene = () => {
  const cur = scenes.current;
  if (cur) postfx.setScene(cur.scene, cur.camera);
};
applyScene();

const applySize = () => {
  scenes.resize(renderer.size.x, renderer.size.y);
  postfx.setSize(renderer.size.x, renderer.size.y);
};
applySize();
window.addEventListener('resize', applySize);

anim.add((ctx) => {
  input.update(ctx.delta);
  scenes.update(ctx);
  postfx.render(ctx.delta);
});

anim.start();
