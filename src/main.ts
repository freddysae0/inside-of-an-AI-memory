import { Renderer } from './core/Renderer';
import { AnimationManager } from './core/AnimationManager';
import { Input } from './core/Input';
import { SceneManager } from './core/SceneManager';
import { EntryRoom } from './scenes/EntryRoom';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const input = new Input();
const scenes = new SceneManager();
const anim = new AnimationManager();

const entry = new EntryRoom();
scenes.register(entry);
scenes.goto('entry');
scenes.resize(renderer.size.x, renderer.size.y);

window.addEventListener('resize', () => scenes.resize(renderer.size.x, renderer.size.y));

anim.add((ctx) => {
  input.update(ctx.delta);
  scenes.update(ctx);
  const cur = scenes.current;
  if (cur) renderer.gl.render(cur.scene, cur.camera);
});

anim.start();
