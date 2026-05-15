# Inside an AI Memory Core

> A scroll-driven WebGL experience: descend through five sectors of an abandoned AI's memory core. Built as the final project for **Harbour.Space — WebGL in Practice** (instructor: Roberto Borghesi).

```
   ENTRY ──▶ DATASETS ──▶ EMOTIONS ──▶ CORRUPTION ──▶ RECONSTRUCTION
   alive       remembers     feels         breaks        reassembles
```

## Install & run

Requires **Node 22** (pinned via `.nvmrc`) and **pnpm**.

```bash
nvm use            # picks up .nvmrc → Node 22
pnpm install
pnpm dev           # http://localhost:5173
pnpm build         # type-check + production bundle in dist/
pnpm preview       # serve the built bundle locally
```

If you don't have `nvm`, any Node ≥ 20 should work; the lockfile is `pnpm-lock.yaml`.

## Decisions worth calling out (rubric)

A few of the brief's required checkpoints don't apply directly to this project — explanations below so nothing looks accidentally skipped.

### No glTF model
The experience is **100% procedural**. Every visible thing is either a `ShaderMaterial` on primitive geometry (icosahedron, plane) or a `Points` cloud driven by custom GLSL. Loading a Sketchfab model would have *cost* the project visual identity (PBR-lit props don't belong inside an abandoned AI), so the `AssetLoader` is shaped around staged geometry construction instead. It exposes the same async progress API a `GLTFLoader` would — the loading bar shows real work being done.

### No HDRI, no traditional lights
None of the materials in the scene are PBR. They are all custom `ShaderMaterial`s that compute their own lighting analytically (vertex breath + fresnel rim + emissive core for Living, additive `Points` for Dust, FBM-based color for Liquid). An HDRI or `DirectionalLight` would have **zero visible effect** because no shader samples an environment map or a light uniform. ACES Filmic tone mapping + sRGB output color space are still configured on the renderer so the emissive output grades cleanly.

### No shadow maps
Same reason: there are no `MeshStandardMaterial` receivers and no directional light. The "depth" of the scene comes from fresnel rims, fog-like falloff in shader, bloom, and parallax. Enabling `shadowMap` would add cost without changing a pixel.

### Antialiasing via post
`renderer.antialias = false` (`src/core/Renderer.ts:22`) — we use **SMAA** as the first pass of the composer instead, so AA cost is paid once on the final fullscreen draw alongside bloom, CA, grain, vignette, corruption, dissolve. DPR is capped (`min(devicePixelRatio, 2)`) and further auto-scaled by `PerfMonitor` if the frame budget slips.

### Comments
Each shader and each `core/` module has a header comment explaining its responsibility. Inline comments are reserved for non-obvious math (e.g. the `pow(sin)^6` heartbeat curve, the FBM octave weighting, the corruption escalation curve).

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
