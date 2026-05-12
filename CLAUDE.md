# Inside an AI Memory Core

WebGL final project for **Harbour.Space — WebGL in Practice** (instructor: Roberto Borghesi).

> A narrative interactive experience set inside the abandoned memory core of an AI. The user navigates corrupted memories, emotions, datasets, and system failures across distinct "rooms," each with its own shaders, palette, and physics.

This file is the source of truth for any agent (Claude, subagent, or otherwise) working on this repo. Read it before making changes.

---

## North star

This is **not** a tech demo. It is an **artistic digital experience**.

Reference aesthetic: visionOS · *Control* (Remedy) · Awwwards SOTD · pmndrs concept demos.

If a change makes the project feel more like a "WebGL student demo," reject it. If it adds artistic identity, ship it.

## Anti-goals (do not build)

Solar system · shoe configurator · plain particle galaxy · galaxy generator · generic 3D portfolio · any "simple particles" showcase divorced from narrative.

## Architecture

Strict module separation under `src/`:

| Module | Responsibility |
|---|---|
| `core/Renderer.ts` | WebGLRenderer, resize, DPR cap |
| `core/SceneManager.ts` | Scene registry, transitions |
| `core/AssetLoader.ts` | GLTF/texture/audio loading + progress |
| `core/AnimationManager.ts` | Tick loop, registered updaters |
| `core/PostFX.ts` | EffectComposer + passes |
| `core/Input.ts` | Pointer, scroll, raycasting |
| `shaders/` | `.glsl` / `.vert` / `.frag` files |
| `scenes/` | One folder per memory/room |
| `audio/` | Web Audio analyser |

No god objects. Small surface per module.

## Stack

- Three.js · TypeScript · Vite
- `vite-plugin-glsl` for shader imports + HMR
- `postprocessing` (pmndrs) for batched post passes
- GSAP for tweens, Lenis for cinematic scroll
- Blender → glTF/GLB pipeline

## Signature shaders to deliver

- **Digital Dust** — particles assemble/break/reform objects
- **Reality Corruption** — escalating UV distortion, scanlines, RGB split, geometric deformation
- **Living Materials** — vertex simplex noise; breathe/pulse, cursor-reactive

Plus: dissolve, liquid distortion, fresnel rim, audio-reactive vertex, particle flow field, mouse ripple.

## Post-processing pipeline (required)

Bloom · DOF · Chromatic aberration · Grain · Vignette · LUT color grading · fake god rays · fake motion blur.

## Interaction (required)

Cinematic scroll · physical inertia camera · magnetic drag · raycasting · velocity-reactive objects · multilayer parallax · fluid scene transitions.

## Commit discipline

**Commit per feature / fix / shader / scene.** Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `style:`, `perf:`. Never batch unrelated changes. The commit log is part of the deliverable.

## Working agreement for agents

1. Read this file first.
2. Before adding a feature, ask: does it serve the narrative or the rubric? If neither, skip it.
3. Prefer custom GLSL over stock materials whenever the scene allows.
4. Stage only files related to the unit of work before each commit.
5. If you touch architecture, update the table above in the same commit.
