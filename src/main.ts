import * as THREE from 'three';

// Bootstrap placeholder — real modules land in src/core/* in follow-up commits.
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0x05060a, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);

// Provisional sentinel — replaced by the entry-room scene next commit.
const sentinel = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1, 3),
  new THREE.MeshBasicMaterial({ color: 0x223040, wireframe: true }),
);
scene.add(sentinel);

addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

renderer.setAnimationLoop((t) => {
  sentinel.rotation.y = t * 0.0002;
  sentinel.rotation.x = t * 0.0001;
  renderer.render(scene, camera);
});
