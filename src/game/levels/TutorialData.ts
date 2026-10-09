import { ground, sides } from './LevelData';
import type { LevelDefinition } from './LevelDefinition';

export interface TutorialStep {
  level: LevelDefinition;
  title: string;
  body: string;
  /** Which controls are enabled in this step. */
  attract: boolean;
  repel: boolean;
  /** Step 5: the delivery must use at most this many impulses. */
  maxImpulses?: number;
}

const common = { index: -1, world: 0, magnetStrength: 1, timeLimit: 120, par: 2 } as const;

/** Five tiny playable lessons. Each one is a real level solved with the real physics. */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: '1. Attract',
    body: 'Hold the blue ATTRACT button to pull the parcel to the blue magnet.',
    attract: true,
    repel: false,
    level: {
      ...common, id: 'tutorial-1', name: 'Attract', parcel: 'envelope',
      start: { x: 140, y: 921 }, attractor: { x: 520, y: 520 }, repeller: { x: 60, y: 962 },
      mailbox: { x: 2000, y: 2000 }, goalZone: { x: 520, y: 520, w: 200, h: 200 },
      obstacles: [ground(), ...sides()],
    },
  },
  {
    title: '2. Repel',
    body: 'Tap the red REPEL button to push the parcel away from the red magnet.',
    attract: false,
    repel: true,
    level: {
      ...common, id: 'tutorial-2', name: 'Repel', parcel: 'envelope',
      start: { x: 160, y: 921 }, attractor: { x: 640, y: 200 }, repeller: { x: 100, y: 962 },
      mailbox: { x: 2000, y: 2000 }, goalZone: { x: 560, y: 860, w: 220, h: 200 },
      obstacles: [ground(), ...sides()],
    },
  },
  {
    title: '3. Avoid obstacles',
    body: 'Use both magnets to fly over the orange spikes.',
    attract: true,
    repel: true,
    level: {
      ...common, id: 'tutorial-3', name: 'Obstacles', parcel: 'envelope',
      start: { x: 130, y: 921 }, attractor: { x: 400, y: 460 }, repeller: { x: 70, y: 962 },
      mailbox: { x: 2000, y: 2000 }, goalZone: { x: 610, y: 860, w: 200, h: 200 },
      obstacles: [ground(), ...sides(), { type: 'spikes', x: 380, y: 926, w: 240, h: 24 }],
    },
  },
  {
    title: '4. Deliver gently',
    body: 'Drop the parcel into the yellow-glowing mailbox and let it settle.',
    attract: true,
    repel: true,
    level: {
      ...common, id: 'tutorial-4', name: 'Deliver', parcel: 'envelope',
      start: { x: 150, y: 921 }, attractor: { x: 540, y: 520 }, repeller: { x: 90, y: 962 },
      mailbox: { x: 560, y: 940, w: 170 },
      obstacles: [ground(), ...sides()],
    },
  },
  {
    title: '5. Fewer impulses, more stars',
    body: 'Every press counts as an impulse. Deliver using 3 impulses or fewer.',
    attract: true,
    repel: true,
    maxImpulses: 3,
    level: {
      ...common, id: 'tutorial-5', name: 'Efficiency', parcel: 'envelope', impulseLimit: 3,
      start: { x: 150, y: 921 }, attractor: { x: 400, y: 470 }, repeller: { x: 90, y: 962 },
      mailbox: { x: 580, y: 940, w: 160 },
      obstacles: [ground(), ...sides(), { type: 'wall', x: 370, y: 850, w: 30, h: 180, style: 'crate' }],
    },
  },
];
