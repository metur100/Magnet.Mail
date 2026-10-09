/** Layout is authored for a 720-unit-wide portrait screen; height adapts to the device (see DeviceUtils). */
export const DESIGN_WIDTH = 720;
export const MIN_DESIGN_HEIGHT = 1180;
export const MAX_DESIGN_HEIGHT = 1560;
export const DEFAULT_DESIGN_HEIGHT = 1280;

/** Levels are authored in a 720 × 960 arena (y down, floor near 940). */
export const ARENA_WIDTH = 720;
export const ARENA_HEIGHT = 960;

/** Fixed physics step (seconds). Rendering interpolates nothing – 120 Hz is smooth enough. */
export const PHYSICS_STEP = 1 / 120;
export const MAX_STEPS_PER_FRAME = 8;

/** HUD band at the top and the control pad at the bottom (design units, before safe-area insets). */
export const HUD_TOP = 140;
export const CONTROLS_HEIGHT = 230;

export const FONT_FAMILY = '"Fredoka", "Trebuchet MS", system-ui, sans-serif';

/**
 * Colour system: blue = attraction, red = repulsion, yellow = delivery goal, orange = danger,
 * green = successful route, purple = special magnetic effects.
 */
export const COLORS = {
  attract: 0x2f7ff0,
  attractDark: 0x1d5cb8,
  attractLight: 0x9cc6ff,
  repel: 0xec4b4b,
  repelDark: 0xb32d33,
  repelLight: 0xffa7a3,
  goal: 0xffc531,
  danger: 0xff8a1f,
  route: 0x2fbf71,
  special: 0x8e5cf7,
  ink: 0x24324a,
  inkText: '#24324a',
  cream: 0xfffaf0,
  creamText: '#fffaf0',
  panel: 0xffffff,
  accent: 0xff8a3d,
  accentDark: 0xd9652a,
  good: 0x2fbf71,
  goodText: '#24995a',
  warn: 0xf2b134,
  bad: 0xe0565b,
  badText: '#c8464b',
  star: 0xffc83d,
  starEmpty: 0xd6dbe4,
  muted: '#6b7890',
} as const;

export const STORAGE_KEY = 'magnet-mail/save';
