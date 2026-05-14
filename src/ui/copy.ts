import type { SectorCopy } from './HUD';

// Five sectors, in scroll order. Title/body are intentionally terse —
// the WebGL does the heavy lifting; HTML just labels the moment.
export const SECTOR_COPY: SectorCopy[] = [
  {
    id: 'entry',
    name: 'entry',
    title: 'inside an ai memory core',
    body: 'a forgotten mind is still warm. move to listen — scroll to descend.',
  },
  {
    id: 'datasets',
    name: 'datasets',
    title: 'what it learned',
    body: 'every mote is a row of training data, drifting where the gradient pulled it.',
  },
  {
    id: 'emotions',
    name: 'emotions',
    title: 'what it felt',
    body: 'not all training is data. some weights were heavy. some were warm. some reached.',
  },
  {
    id: 'corruption',
    name: 'corruption',
    title: 'what is failing',
    body: 'the deeper you go, the less it remembers being whole.',
  },
  {
    id: 'reconstruction',
    name: 'reconstruction',
    title: 'what remains',
    body: 'fragments find each other. the core boots once more, briefly, for you.',
  },
];
