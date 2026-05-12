# Roadmap — Inside an AI Memory Core

The deliverable is a single-page WebGL experience: the user descends through five sectors of an abandoned AI's memory core. Each sector demonstrates a different facet of the course rubric while serving the narrative.

> Reading this file: the **Narrative** column tells you why a sector exists; the **Technique** column tells the instructor what to look at; the **Status** column tracks build state. Every row maps to commits on `main`.

## Narrative arc

```
   ENTRY ──▶ DATASETS ──▶ EMOTIONS ──▶ CORRUPTION ──▶ RECONSTRUCTION
   alive       remembers     feels         breaks        reassembles
```

The journey is scroll-driven, with smooth Lenis-eased transitions. The HUD names the current sector and tracks journey progress (0..1). A single ambient drone runs throughout; its analyser feeds an `uAudio` uniform that every signature shader can sample.

## Sectors

| # | Sector          | Narrative beat                                                                 | Signature technique                                                       | Status |
|---|-----------------|--------------------------------------------------------------------------------|---------------------------------------------------------------------------|--------|
| 0 | ENTRY           | The user wakes inside the core. A single living object breathes in front of them. | **Living Material** (vertex simplex + heartbeat + fresnel + pointer bulge) | ✅ done |
| 1 | DATASETS        | Millions of data motes drift; they momentarily form objects, then dissolve.    | **Digital Dust** instanced particle field with flow-field motion          | ⏳ Phase D |
| 2 | EMOTIONS        | The AI remembers feeling. The volume of space distorts like a liquid surface.  | **Liquid distortion** + per-emotion LUT-style color grading shift         | ⏳ Phase F |
| 3 | CORRUPTION      | Memory is failing. Reality glitches harder the longer the user lingers.        | **Reality Corruption** custom postprocessing pass (UV warp + scanlines + RGB split) | ⏳ Phase E |
| 4 | RECONSTRUCTION  | The fragments find each other again.                                            | Dust reverses into a coherent silhouette; outro copy fades in             | ⏳ Phase G |

## Phases (in execution order)

| Phase | Goal                                                                 | Commits      | Status |
|-------|----------------------------------------------------------------------|--------------|--------|
| 0     | Charter + scaffold + core modules + PostFX + Living Material          | 15 commits   | ✅ done |
| A     | Scroll director (Lenis) — drives a single `journey` value in `[0, 1]` | ~3           | ⏳     |
| B     | HUD sync — HTML sector name, progress bar, per-sector copy reveal     | ~2           | ⏳     |
| C     | Dissolve transition — custom Effect crossfades scenes via simplex     | ~2           | ⏳     |
| D     | Digital Dust scene — GPU-instanced particle field                     | ~3           | ⏳     |
| E     | Reality Corruption — custom EffectPass with escalation driven by scroll | ~3         | ⏳     |
| F     | Emotions room — liquid distortion + LUT-style grading shift           | ~3           | ⏳     |
| G     | Reconstruction finale + outro reveal                                  | ~2           | ⏳     |
| H     | Audio analyser → `uAudio` uniform on signature shaders                | ~2           | ⏳     |
| I     | Loading screen tied to AssetLoader progress                           | ~2           | ⏳     |
| J     | Polish — adaptive DPR, manualChunks, perf pass, README + screenshots  | ~3           | ⏳     |

## Architecture additions (beyond Phase 0)

- `core/ScrollDirector.ts` — owns Lenis instance, exposes `journey ∈ [0,1]` and a `sector` index.
- `core/Transitions.ts` — orchestrates dissolve between SceneManager rooms.
- `core/Audio.ts` — Web Audio analyser, exposes `level`, `bass`, `treble`.
- `core/AssetLoader.ts` — already declared in CLAUDE.md; lands in Phase I.
- `ui/HUD.ts` — typed bridge between WebGL state and the HTML overlay.
- Shaders added: `shaders/dust/*`, `shaders/corruption/*`, `shaders/liquid/*`, `shaders/transition/*`.

## Rubric coverage map

| Rubric item            | Where it lives                                                  |
|------------------------|-----------------------------------------------------------------|
| Scene architecture     | `src/core/*` — separated Renderer/SceneManager/Animation/Input/PostFX/ScrollDirector/Audio/AssetLoader |
| Custom shaders         | `src/shaders/{living,dust,corruption,liquid,transition}/*`      |
| Post-processing        | `core/PostFX.ts` (SMAA + Bloom + CA + grain + vignette) + Reality Corruption EffectPass |
| Performance            | Capped DPR, instanced particles, adaptive DPR under load, single-draw PostFX |
| Interaction            | Smoothed pointer + velocity (Input), raycast pointer bulge (Living), magnetic camera, scroll |
| HTML + WebGL mix       | `ui/HUD.ts` — sector copy, progress bar, loading screen        |
| Storytelling           | Five-sector arc spelled out above                              |
| Optimisation           | Frustum culling defaults, mipmapped bloom, batched effect passes |
| Procedural animation   | Vertex simplex breath, flow-field dust, heartbeat pulse        |
| Custom materials       | LivingMaterial; DustMaterial; LiquidMaterial                   |
| GLB asset pipeline     | AssetLoader + loading screen (Phase I)                         |
| Art direction          | Dark blue/indigo core palette; sector-specific palette shifts in EMOTIONS |

## Out of scope

- Multiplayer / persistence.
- Mobile-first interaction (we target desktop with graceful resize).
- VR/XR.
- Real-world assets that require licensing.

## Definition of done

1. `pnpm build` succeeds with no TS errors.
2. The five sectors render in order, transition cleanly, and each demonstrates its signature technique.
3. The HUD reflects the active sector and journey progress.
4. The pipeline survives a continuous scroll from 0 to 1 and back without leaks or visible frame hitches on a 2021 MBP class machine.
5. README has a one-paragraph pitch, a single screenshot, and run instructions.
