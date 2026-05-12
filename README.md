# Inside an AI Memory Core

> A scroll-driven WebGL experience: descend through five sectors of an abandoned AI's memory core. Built as the final project for **Harbour.Space — WebGL in Practice** (instructor: Roberto Borghesi).

```
   ENTRY ──▶ DATASETS ──▶ EMOTIONS ──▶ CORRUPTION ──▶ RECONSTRUCTION
   alive       remembers     feels         breaks        reassembles
```

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # production bundle in dist/
```

## What's in the box

| Domain | What it demonstrates |
|---|---|
| **Architecture** | Strict module separation under `src/core/` — Renderer, SceneManager, AnimationManager, Input, PostFX, ScrollDirector, Transitions, CorruptionEffect, AssetLoader, PerfMonitor, Audio. No god objects. |
| **Custom shaders** | Living Material (vertex simplex breath + heartbeat + fresnel + pointer bulge), Digital Dust (GPU points with flow drift + form snap), Liquid (3-octave FBM displacement + emotion palette), Reality Corruption (5 layered glitches), Dissolve transition. All in `src/shaders/`. |
| **Postprocessing** | Single-fullscreen-draw composer (pmndrs/postprocessing): SMAA + Bloom + Chromatic Aberration + Grain + Vignette, with custom CorruptionEffect (CONVOLUTION attribute) and DissolveEffect appended. |
| **Interaction** | Lenis-eased scroll drives a single `journey ∈ [0,1]` value; smoothed pointer with derived velocity (Input); raycast pointer bulge into the entry core; velocity-reactive shader frequency. |
| **HTML + WebGL** | Typed HUD bridge (`src/ui/HUD.ts`) syncs sector copy, progress bar, outro epigraph, audio toggle. |
| **Procedural animation** | Vertex simplex breath, non-sinusoidal `pow(sin)^6` heartbeat, per-particle stagger via `aSeed`, FBM liquid surface, escalating corruption curve. |
| **Performance** | Capped DPR, adaptive `PerfMonitor` that down-/up-scales pixel ratio under load, frustum-culled particles disabled (always on-screen), batched effect passes, `manualChunks` (three / postprocessing / motion / app). |
| **Pipeline** | `AssetLoader` stages expensive scene construction (60–70k particle BufferGeometries) and paints real progress in a loading overlay. Shaped so a future GLBLoader slots in as just another factory. |
| **Audio** | Procedural ambient drone (detuned sines + triangle subharmonic + pink-ish noise, breathed by an LFO) + AnalyserNode → bass/treble feed shader uniforms (Living `uBreath`, Liquid `uAmplitude`, Corruption `uIntensity` floor). |

## Project files

- `CLAUDE.md` — working agreement for any agent contributing to this repo (architecture, anti-goals, commit discipline).
- `ROADMAP.md` — narrative arc, sector table, phase plan, rubric coverage map.

## Stack

Three.js · TypeScript · Vite · `vite-plugin-glsl` · `postprocessing` (pmndrs) · GSAP · Lenis.

## Aesthetic reference

visionOS · *Control* (Remedy) · Awwwards SOTD · pmndrs concept demos.
