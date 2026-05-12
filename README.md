# Inside an AI Memory Core

WebGL final project for **Harbour.Space — WebGL in Practice** (instructor: Roberto Borghesi).

A narrative interactive experience set inside the abandoned memory core of an AI. The user navigates corrupted memories, emotions, datasets, and system failures across distinct rooms — each with its own shaders, palette, and physics.

> Reference aesthetic: visionOS · *Control* (Remedy) · Awwwards SOTD · pmndrs concept demos.

## Stack

Three.js · TypeScript · Vite · `vite-plugin-glsl` · `postprocessing` (pmndrs) · GSAP · Lenis · Blender → glTF.

## Run

```bash
pnpm install
pnpm dev
```

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the working agreement, module layout, and signature shaders.
