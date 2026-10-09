import type { LevelDefinition, WorldDefinition } from './LevelDefinition';
import type { ObstacleDef } from './ObstacleDefinitions';

export const WORLDS: WorldDefinition[] = [
  {
    id: 0, key: 'neighborhood', name: 'Local Neighborhood', tagline: 'Learn the magnets on a sunny street', starsRequired: 0, scenery: 'neighborhood',
    theme: { skyTop: 0xbfe6ff, skyBottom: 0xeaf7ff, far: 0xa7d8a0, near: 0x7fc47a, ground: 0x6aa85f, wall: 0xf3e3c8, wallEdge: 0xb79a6e, accent: 0x2f7ff0, text: '#1f3550' },
  },
  {
    id: 1, key: 'city', name: 'City Streets', tagline: 'Rooftops, alleys and busy roads', starsRequired: 4, scenery: 'city',
    theme: { skyTop: 0xffd9b8, skyBottom: 0xfff1e2, far: 0xc9b6d8, near: 0x9f8fb8, ground: 0x6d6f80, wall: 0xc7cfe0, wallEdge: 0x7e889e, accent: 0xff8a3d, text: '#3a2a4a' },
  },
  {
    id: 2, key: 'railway', name: 'Railway District', tagline: 'Heavy crates and fast trains', starsRequired: 10, scenery: 'railway',
    theme: { skyTop: 0xc7d6e8, skyBottom: 0xeef2f6, far: 0xa9b5c4, near: 0x7c8899, ground: 0x6b5a4a, wall: 0xb8a48a, wallEdge: 0x7a6650, accent: 0xd96a3a, text: '#2a3340' },
  },
  {
    id: 3, key: 'industrial', name: 'Industrial Zone', tagline: 'Conveyors, gears and fragile glass', starsRequired: 17, scenery: 'industrial',
    theme: { skyTop: 0xf3e2b8, skyBottom: 0xfff6df, far: 0xc8b991, near: 0x9c8f6e, ground: 0x5d5850, wall: 0xb9c2c9, wallEdge: 0x6f7a84, accent: 0xf2b134, text: '#3a3324' },
  },
  {
    id: 4, key: 'airport', name: 'Airport', tagline: 'Luggage belts, jet streams and gates', starsRequired: 24, scenery: 'airport',
    theme: { skyTop: 0x9fd4f5, skyBottom: 0xe6f6ff, far: 0xb7d3e6, near: 0x8fb3cc, ground: 0x7c8794, wall: 0xe5ecf2, wallEdge: 0x8a9aab, accent: 0x18a7a0, text: '#1d3446' },
  },
  {
    id: 5, key: 'space', name: 'Space Station', tagline: 'Low gravity, storms and wormholes', starsRequired: 31, scenery: 'space',
    theme: { skyTop: 0x101a3a, skyBottom: 0x2b2a5e, far: 0x3a3f7a, near: 0x23264f, ground: 0x4a4f78, wall: 0x6f76a8, wallEdge: 0x3c4170, accent: 0x8e5cf7, text: '#eef0ff' },
  },
];

export const LEVELS_PER_WORLD = 5;

// ------------------------------------------------------------------ building blocks

/** Ground with its top at `top`. */
export const ground = (top = 940): ObstacleDef => ({ type: 'wall', x: 360, y: top + 40, w: 800, h: 80, style: 'wall' });
/** Walls just inside the left and right screen edges. */
export const sides = (): ObstacleDef[] => [
  { type: 'wall', x: -8, y: 470, w: 28, h: 1060 },
  { type: 'wall', x: 728, y: 470, w: 28, h: 1060 },
];
/** Horizontal ledge from x1 to x2 with its top at y. */
export const ledge = (x1: number, x2: number, top: number, style: 'wall' | 'building' | 'crate' | 'pipe' = 'wall'): ObstacleDef => ({
  type: 'wall',
  x: (x1 + x2) / 2,
  y: top + 12,
  w: x2 - x1,
  h: 24,
  style,
});
/** Building block from x1 to x2 standing on the ground with its roof at `roof`. */
export const building = (x1: number, x2: number, roof: number, top = 940): ObstacleDef => ({
  type: 'wall',
  x: (x1 + x2) / 2,
  y: (roof + top) / 2,
  w: x2 - x1,
  h: top - roof,
  style: 'building',
});

const base = { magnetStrength: 1 };

/** All 30 campaign levels. */
export const LEVELS: LevelDefinition[] = [
  // ================================================================== World 1: Local Neighborhood (envelope)
  {
    ...base, id: 'w1-1', index: 0, world: 0, name: 'First Delivery', parcel: 'envelope',
    start: { x: 170, y: 921 }, attractor: { x: 520, y: 560 }, repeller: { x: 110, y: 962 },
    mailbox: { x: 520, y: 940, w: 170 }, obstacles: [ground(), ...sides()],
    timeLimit: 60, par: 2, tutorial: 'Hold ATTRACT (blue) to pull the parcel. Let go above the mailbox.',
  },
  {
    ...base, id: 'w1-2', index: 1, world: 0, name: 'Push Off', parcel: 'envelope',
    start: { x: 190, y: 921 }, attractor: { x: 640, y: 240 }, repeller: { x: 100, y: 965 },
    mailbox: { x: 530, y: 940, w: 170 }, obstacles: [ground(), ...sides()],
    timeLimit: 60, par: 3, tutorial: 'Tap REPEL (red) to push the parcel away from the red magnet.',
  },
  {
    ...base, id: 'w1-3', index: 2, world: 0, name: 'Garden Fence', parcel: 'envelope',
    start: { x: 170, y: 921 }, attractor: { x: 380, y: 480 }, repeller: { x: 110, y: 962 },
    mailbox: { x: 560, y: 940, w: 160 },
    obstacles: [ground(), ...sides(), { type: 'wall', x: 360, y: 830, w: 34, h: 220, style: 'crate' }],
    timeLimit: 60, par: 3, tutorial: 'Combine both magnets to lift the parcel over the fence.',
  },
  {
    ...base, id: 'w1-4', index: 3, world: 0, name: 'Balcony Box', parcel: 'envelope',
    start: { x: 200, y: 921 }, attractor: { x: 500, y: 300 }, repeller: { x: 140, y: 962 },
    mailbox: { x: 640, y: 600, w: 130 },
    obstacles: [ground(), ...sides(), ledge(560, 720, 600)],
    timeLimit: 60, par: 3, tutorial: 'Mailboxes can be high up. Pull it up, then tap REPEL to nudge it in.',
  },
  {
    ...base, id: 'w1-5', index: 4, world: 0, name: 'Under the Porch', parcel: 'envelope',
    start: { x: 150, y: 921 }, attractor: { x: 610, y: 430 }, repeller: { x: 90, y: 962 },
    mailbox: { x: 610, y: 710, w: 140 },
    obstacles: [ground(), ...sides(), ledge(0, 420, 770), ledge(500, 720, 710)],
    timeLimit: 70, par: 4, tutorial: 'Slide out from under the porch, then rise to the mailbox.',
  },

  // ================================================================== World 2: City Streets (box)
  {
    ...base, id: 'w2-1', index: 5, world: 1, name: 'Rooftop Hop', parcel: 'box',
    start: { x: 140, y: 636 }, attractor: { x: 470, y: 330 }, repeller: { x: 80, y: 682 },
    mailbox: { x: 570, y: 580, w: 150 },
    obstacles: [ground(), ...sides(), building(0, 260, 660), building(430, 720, 580)],
    timeLimit: 60, par: 3, tutorial: 'Standard boxes are heavier – give them a stronger push.',
  },
  {
    ...base, id: 'w2-2', index: 6, world: 1, name: 'Rush Hour', parcel: 'box',
    start: { x: 110, y: 724 }, attractor: { x: 400, y: 420 }, repeller: { x: 50, y: 770 },
    mailbox: { x: 610, y: 748, w: 150 },
    obstacles: [
      ground(), ...sides(), ledge(0, 230, 748), ledge(480, 720, 748),
      { type: 'train', kind: 'car', y: 912, w: 130, h: 56, from: -140, to: 860, speed: 300, period: 4.5 },
    ],
    timeLimit: 60, par: 2, tutorial: 'Cars! Fly over the road – do not land on it.',
  },
  {
    ...base, id: 'w2-3', index: 7, world: 1, name: 'Wrong Address', parcel: 'box',
    start: { x: 90, y: 916 }, attractor: { x: 590, y: 480 }, repeller: { x: 30, y: 962 },
    mailbox: { x: 600, y: 940, w: 140 }, decoys: [{ x: 330, y: 940, w: 140 }],
    obstacles: [ground(), ...sides()],
    timeLimit: 60, par: 3, tutorial: 'Only the yellow mailbox is yours. Grey ones bounce parcels back.',
  },
  {
    ...base, id: 'w2-4', index: 8, world: 1, name: 'Narrow Alley', parcel: 'box',
    start: { x: 150, y: 416 }, attractor: { x: 380, y: 760 }, repeller: { x: 90, y: 462 },
    mailbox: { x: 380, y: 940, w: 120 },
    obstacles: [ground(), ...sides(), building(0, 300, 440), building(460, 720, 320)],
    timeLimit: 60, par: 2,
  },
  {
    ...base, id: 'w2-5', index: 9, world: 1, name: 'Skyline', parcel: 'box',
    start: { x: 100, y: 736 }, attractor: { x: 610, y: 330 }, repeller: { x: 40, y: 782 },
    mailbox: { x: 610, y: 640, w: 140 },
    obstacles: [ground(), ...sides(), building(0, 200, 760), building(300, 420, 430), building(500, 720, 640),
      { type: 'train', kind: 'car', y: 912, w: 120, h: 56, from: 860, to: -140, speed: 260, period: 6 }],
    timeLimit: 80, par: 4, tutorial: 'Launch high with REPEL, then let ATTRACT carry it over the tower.',
  },

  // ================================================================== World 3: Railway District (crate)
  {
    id: 'w3-1', index: 10, world: 2, name: 'Freight Lift', parcel: 'crate', magnetStrength: 1.7,
    start: { x: 150, y: 911 }, attractor: { x: 420, y: 260 }, repeller: { x: 90, y: 962 },
    mailbox: { x: 620, y: 468, w: 140 },
    obstacles: [ground(), ...sides(), ledge(500, 720, 468),
      { type: 'platform', kind: 'elevator', x: 410, y: 952, w: 160, h: 24, dx: 0, dy: -484, period: 8, motion: 'hold' }],
    timeLimit: 75, par: 3, tutorial: 'Heavy crates need strong magnets. Ride the elevator up!',
  },
  {
    id: 'w3-2', index: 11, world: 2, name: 'Level Crossing', parcel: 'crate', magnetStrength: 1.7,
    start: { x: 110, y: 731 }, attractor: { x: 620, y: 430 }, repeller: { x: 50, y: 782 },
    mailbox: { x: 620, y: 760, w: 140 },
    obstacles: [ground(), ...sides(), ledge(0, 220, 760), ledge(500, 720, 760),
      { type: 'platform', kind: 'gate', x: 360, y: 630, w: 26, h: 300, dx: 0, dy: -330, period: 6, motion: 'hold' },
      { type: 'train', y: 900, w: 380, h: 70, from: -420, to: 1140, speed: 560, period: 6 }],
    timeLimit: 75, par: 2, tutorial: 'Wait for the railway gate to open, and stay off the tracks.',
  },
  {
    id: 'w3-3', index: 12, world: 2, name: 'Timed Crossing', parcel: 'crate', magnetStrength: 1.75,
    start: { x: 100, y: 771 }, attractor: { x: 360, y: 300 }, repeller: { x: 40, y: 822 },
    mailbox: { x: 630, y: 800, w: 130 },
    obstacles: [ground(), ...sides(), building(0, 200, 800), building(530, 720, 800),
      { type: 'wall', x: 360, y: 560, w: 30, h: 240, style: 'pipe' },
      { type: 'train', y: 900, w: 360, h: 70, from: 1100, to: -380, speed: 600, period: 5, phase: 0.3 }],
    timeLimit: 75, par: 3, impulseLimit: 9,
  },
  {
    id: 'w3-4', index: 13, world: 2, name: 'Signal Box', parcel: 'crate', magnetStrength: 1.75,
    start: { x: 120, y: 499 }, attractor: { x: 620, y: 260 }, repeller: { x: 60, y: 550 },
    mailbox: { x: 620, y: 528, w: 130 },
    obstacles: [ground(), ...sides(), ledge(0, 260, 528), ledge(490, 720, 528),
      { type: 'platform', kind: 'elevator', x: 375, y: 900, w: 150, h: 24, dx: 0, dy: -360, period: 7, motion: 'hold', phase: 0.5 },
      { type: 'train', y: 900, w: 320, h: 70, from: -340, to: 1060, speed: 520, period: 7, phase: 0.2 }],
    timeLimit: 80, par: 2, impulseLimit: 8,
  },
  {
    id: 'w3-5', index: 14, world: 2, name: 'Night Express', parcel: 'crate', magnetStrength: 1.8,
    start: { x: 110, y: 711 }, attractor: { x: 600, y: 360 }, repeller: { x: 50, y: 762 },
    mailbox: { x: 620, y: 600, w: 120 },
    obstacles: [ground(), ...sides(), ledge(0, 220, 740), ledge(500, 720, 600),
      { type: 'platform', kind: 'gate', x: 400, y: 520, w: 26, h: 260, dx: 0, dy: -280, period: 5, motion: 'hold', phase: 0.25 },
      { type: 'train', y: 900, w: 360, h: 70, from: -380, to: 1100, speed: 600, period: 5 },
      { type: 'train', y: 900, w: 300, h: 70, from: 1080, to: -340, speed: 500, period: 7, phase: 0.5 }],
    timeLimit: 80, par: 4, impulseLimit: 8,
  },

  // ================================================================== World 4: Industrial Zone (glass)
  {
    ...base, magnetStrength: 0.8, id: 'w4-1', index: 15, world: 3, name: 'Assembly Line', parcel: 'glass',
    start: { x: 80, y: 917 }, attractor: { x: 600, y: 640 }, repeller: { x: 300, y: 980 },
    mailbox: { x: 610, y: 940, w: 140 },
    obstacles: [ground(), ...sides(), { type: 'conveyor', x: 250, y: 946, w: 500, h: 24, speed: 150 }],
    timeLimit: 60, par: 2, tutorial: 'Glass is fragile – hard hits break it. Ride the conveyor.',
  },
  {
    ...base, magnetStrength: 0.8, id: 'w4-2', index: 16, world: 3, name: 'Gear Works', parcel: 'glass',
    start: { x: 110, y: 917 }, attractor: { x: 440, y: 400 }, repeller: { x: 50, y: 962 },
    mailbox: { x: 615, y: 680, w: 130 },
    obstacles: [ground(), ...sides(), ledge(510, 720, 680), { type: 'rotor', x: 270, y: 760, length: 220, speed: 1.1 }],
    timeLimit: 70, par: 6, maxCollisions: 12, tutorial: 'Time your move past the spinning gear.',
  },
  {
    ...base, magnetStrength: 0.8, id: 'w4-3', index: 17, world: 3, name: 'Shielded', parcel: 'glass',
    start: { x: 120, y: 917 }, attractor: { x: 420, y: 330 }, repeller: { x: 60, y: 962 },
    mailbox: { x: 610, y: 640, w: 130 },
    obstacles: [ground(), ...sides(), ledge(500, 720, 640), { type: 'barrier', x: 300, y: 620, w: 24, h: 560 },
      { type: 'conveyor', x: 330, y: 946, w: 380, h: 24, speed: 120 }],
    timeLimit: 70, par: 3, maxCollisions: 12, tutorial: 'Purple barriers block magnetic fields. Get past it first.',
  },
  {
    ...base, magnetStrength: 0.8, id: 'w4-4', index: 18, world: 3, name: 'Bumper Alley', parcel: 'glass',
    start: { x: 100, y: 917 }, attractor: { x: 360, y: 260 }, repeller: { x: 40, y: 962 },
    mailbox: { x: 620, y: 940, w: 120 },
    obstacles: [ground(), ...sides(), { type: 'bumper', x: 260, y: 700, r: 40 }, { type: 'bumper', x: 460, y: 620, r: 40 },
      { type: 'wall', x: 470, y: 860, w: 30, h: 160, style: 'pipe' }, { type: 'spikes', x: 360, y: 928, w: 160, h: 24 }],
    timeLimit: 70, par: 3, maxCollisions: 12,
  },
  {
    ...base, magnetStrength: 0.8, id: 'w4-5', index: 19, world: 3, name: 'Factory Floor', parcel: 'glass',
    start: { x: 90, y: 637 }, attractor: { x: 640, y: 300 }, repeller: { x: 30, y: 682 },
    mailbox: { x: 620, y: 560, w: 120 },
    obstacles: [ground(), ...sides(), ledge(0, 230, 660), ledge(500, 720, 560),
      { type: 'conveyor', x: 360, y: 946, w: 560, h: 24, speed: -110 }, { type: 'rotor', x: 380, y: 520, length: 220, speed: -1.0 },
      { type: 'barrier', x: 470, y: 320, w: 24, h: 240 }, { type: 'spikes', x: 360, y: 924, w: 200, h: 24 }],
    timeLimit: 80, par: 3, maxCollisions: 10, impulseLimit: 9,
  },

  // ================================================================== World 5: Airport (bouncy)
  {
    ...base, id: 'w5-1', index: 20, world: 4, name: 'Baggage Claim', parcel: 'bouncy',
    start: { x: 100, y: 727 }, attractor: { x: 600, y: 420 }, repeller: { x: 40, y: 772 },
    mailbox: { x: 610, y: 750, w: 130 },
    obstacles: [ground(), ...sides(), { type: 'conveyor', kind: 'luggage', x: 140, y: 762, w: 280, h: 24, speed: 160 },
      ledge(500, 720, 750), { type: 'conveyor', kind: 'luggage', x: 360, y: 946, w: 720, h: 24, speed: -140 }],
    timeLimit: 60, par: 2, tutorial: 'Bouncy parcels spring off everything. Soft touches!',
  },
  {
    ...base, id: 'w5-2', index: 21, world: 4, name: 'Jet Stream', parcel: 'bouncy',
    start: { x: 100, y: 917 }, attractor: { x: 620, y: 260 }, repeller: { x: 40, y: 962 },
    mailbox: { x: 610, y: 470, w: 130 },
    obstacles: [ground(), ...sides(), ledge(490, 720, 470), { type: 'wind', x: 330, y: 620, w: 160, h: 640, fx: 0, fy: -900 },
      { type: 'wall', x: 470, y: 760, w: 26, h: 360, style: 'pipe' }],
    timeLimit: 70, par: 3, tutorial: 'Airflow lifts parcels. Ride the jet stream up.',
  },
  {
    ...base, id: 'w5-3', index: 22, world: 4, name: 'Gate Change', parcel: 'bouncy',
    start: { x: 100, y: 917 }, attractor: { x: 600, y: 600 }, repeller: { x: 40, y: 962 },
    mailbox: { x: 610, y: 940, w: 120 },
    obstacles: [ground(), ...sides(), { type: 'wall', x: 360, y: 500, w: 26, h: 480, style: 'pipe' },
      { type: 'platform', kind: 'gate', x: 360, y: 860, w: 26, h: 160, dx: 0, dy: -170, period: 5, motion: 'hold' }],
    timeLimit: 70, par: 2, energy: 6, tutorial: 'Magnetic energy is limited now. Watch the meter!',
  },
  {
    ...base, id: 'w5-4', index: 23, world: 4, name: 'Security Doors', parcel: 'bouncy',
    start: { x: 90, y: 917 }, attractor: { x: 630, y: 560 }, repeller: { x: 30, y: 962 },
    mailbox: { x: 640, y: 940, w: 110 },
    obstacles: [ground(), ...sides(),
      { type: 'wall', x: 250, y: 560, w: 26, h: 560, style: 'pipe' }, { type: 'wall', x: 470, y: 560, w: 26, h: 560, style: 'pipe' },
      { type: 'platform', kind: 'door', x: 250, y: 880, w: 26, h: 120, dx: 0, dy: -130, period: 4, motion: 'hold' },
      { type: 'platform', kind: 'door', x: 470, y: 880, w: 26, h: 120, dx: 0, dy: -130, period: 4, motion: 'hold', phase: 0.5 }],
    timeLimit: 75, par: 2, energy: 7,
  },
  {
    ...base, id: 'w5-5', index: 24, world: 4, name: 'Terminal Rush', parcel: 'bouncy',
    start: { x: 360, y: 917 }, attractor: { x: 615, y: 250 }, repeller: { x: 300, y: 962 },
    mailbox: { x: 630, y: 520, w: 110 }, decoys: [{ x: 100, y: 520, w: 110 }, { x: 620, y: 940, w: 110 }],
    obstacles: [ground(), ...sides(), ledge(0, 200, 520), ledge(545, 720, 520),
      { type: 'wind', x: 110, y: 760, w: 200, h: 360, fx: 0, fy: -600 },
      { type: 'conveyor', kind: 'luggage', x: 360, y: 946, w: 300, h: 24, speed: -110 }],
    timeLimit: 75, par: 3, energy: 8, tutorial: 'Several routes – pick the one that ends at the yellow mailbox.',
  },

  // ================================================================== World 6: Space Station (magnetic)
  {
    ...base, id: 'w6-1', index: 25, world: 5, name: 'Zero-G Dock', parcel: 'magnetic', gravity: 160,
    start: { x: 120, y: 916 }, attractor: { x: 600, y: 300 }, repeller: { x: 60, y: 962 },
    mailbox: { x: 600, y: 600, w: 120 },
    obstacles: [ground(), ...sides(), ledge(480, 720, 600)],
    timeLimit: 60, par: 2, tutorial: 'Low gravity! Magnetic parcels drift towards the blue magnet.',
  },
  {
    ...base, id: 'w6-2', index: 26, world: 5, name: 'Gravity Well', parcel: 'magnetic', gravity: 180,
    start: { x: 110, y: 916 }, attractor: { x: 610, y: 280 }, repeller: { x: 50, y: 962 },
    mailbox: { x: 610, y: 520, w: 120 },
    obstacles: [ground(), ...sides(), ledge(490, 720, 520), { type: 'gravity', x: 330, y: 560, w: 200, h: 760, gx: 0, gy: 1500 },
      { type: 'spikes', x: 330, y: 924, w: 200, h: 24 }],
    timeLimit: 70, par: 5, tutorial: 'Glowing zones have heavy gravity. Do not fall onto the spikes.',
  },
  {
    ...base, id: 'w6-3', index: 27, world: 5, name: 'Asteroid Drift', parcel: 'magnetic', gravity: 160,
    start: { x: 110, y: 916 }, attractor: { x: 620, y: 340 }, repeller: { x: 50, y: 962 },
    mailbox: { x: 620, y: 620, w: 110 },
    obstacles: [ground(), ...sides(), ledge(510, 720, 620),
      { type: 'floater', x: 330, y: 700, r: 44, dx: 0, dy: 180, period: 4 },
      { type: 'floater', x: 450, y: 450, r: 36, dx: 90, dy: 0, period: 5, phase: 0.3 },
      { type: 'spikes', x: 330, y: 300, w: 220, h: 24, angle: Math.PI }],
    timeLimit: 70, par: 2, maxCollisions: 14,
  },
  {
    ...base, id: 'w6-4', index: 28, world: 5, name: 'Ion Storm', parcel: 'magnetic', gravity: 180,
    start: { x: 110, y: 916 }, attractor: { x: 610, y: 330 }, repeller: { x: 50, y: 962 },
    mailbox: { x: 610, y: 600, w: 110 }, storm: { strength: 420, period: 3.2 },
    obstacles: [ground(), ...sides(), ledge(500, 720, 600), { type: 'barrier', x: 330, y: 360, w: 24, h: 300 },
      { type: 'spikes', x: 300, y: 924, w: 260, h: 24 }],
    timeLimit: 75, par: 4, energy: 9, tutorial: 'Magnetic storms push your parcel around. Correct with short taps.',
  },
  {
    ...base, id: 'w6-5', index: 29, world: 5, name: 'Wormhole Express', parcel: 'magnetic', gravity: 200,
    start: { x: 110, y: 916 }, attractor: { x: 620, y: 220 }, repeller: { x: 50, y: 962 },
    mailbox: { x: 620, y: 420, w: 110 }, decoys: [{ x: 620, y: 940, w: 110 }], storm: { strength: 300, period: 4 },
    obstacles: [ground(), ...sides(), ledge(500, 720, 420), { type: 'wall', x: 300, y: 600, w: 30, h: 700, style: 'pipe' },
      { type: 'teleporter', ax: 200, ay: 700, bx: 420, by: 300 },
      { type: 'floater', x: 560, y: 650, r: 34, dx: 0, dy: 120, period: 3.5 }],
    timeLimit: 80, par: 2, energy: 10, maxCollisions: 14, tutorial: 'Teleporters connect distant places. Fly into the swirl!',
  },
];
