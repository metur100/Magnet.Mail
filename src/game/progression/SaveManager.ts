import { STORAGE_KEY } from '../utils/Constants';

/**
 * Versioned local save data.
 *
 * Every save carries a `version`. On load, older versions are migrated step by step (MIGRATIONS) and
 * every field is sanitised, so a damaged or hand-edited save can never crash the game – broken fields
 * fall back to defaults. Corrupted JSON is kept under `<key>.corrupt` and the game starts fresh.
 */
export const SAVE_VERSION = 2;

export interface LevelRecord {
  completed: boolean;
  stars: number;
  bestScore: number;
  /** Fewest impulses used in a successful delivery (0 = never delivered). */
  bestImpulses: number;
  plays: number;
}

export interface Settings {
  sound: boolean;
  music: boolean;
  vibration: boolean;
  reducedMotion: boolean;
  /** Swaps the ATTRACT / REPEL buttons and moves pause / restart to the other side. */
  leftHanded: boolean;
}

export interface DailyRecord {
  score: number;
  stars: number;
  impulses: number;
  attempts: number;
}

export interface SaveData {
  version: number;
  tutorialDone: boolean;
  levels: Record<string, LevelRecord>;
  /** Derived, persisted for quick reads. Recomputed on load. */
  totalStars: number;
  unlockedWorlds: number[];
  unlockedParcels: string[];
  unlockedMailboxes: string[];
  selectedParcel: string;
  selectedMailbox: string;
  settings: Settings;
  daily: { best: Record<string, DailyRecord>; streak: number; lastCompleted: string | null; completed: number };
  stats: { deliveries: number; impulses: number; playSeconds: number };
  /** Monetisation entitlements (see MonetizationManager). */
  entitlements: { removeAds: boolean; parcelPacks: string[]; mailboxPacks: string[]; bonusDaily: boolean };
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, music: true, vibration: true, reducedMotion: false, leftHanded: false };

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    tutorialDone: false,
    levels: {},
    totalStars: 0,
    unlockedWorlds: [0],
    unlockedParcels: ['classic-envelope'],
    unlockedMailboxes: ['red-mailbox'],
    selectedParcel: 'classic-envelope',
    selectedMailbox: 'red-mailbox',
    settings: { ...DEFAULT_SETTINGS },
    daily: { best: {}, streak: 0, lastCompleted: null, completed: 0 },
    stats: { deliveries: 0, impulses: 0, playSeconds: 0 },
    entitlements: { removeAds: false, parcelPacks: [], mailboxPacks: [], bonusDaily: false },
  };
}

type RawSave = Record<string, unknown>;

/**
 * Version 1 (pre-release build) had no cosmetics and stored left-handed mode at the top level:
 *   { version: 1, levels: {...}, settings: {...}, leftHanded: true }
 */
const MIGRATIONS: Record<number, (raw: RawSave) => RawSave> = {
  1: (raw) => {
    const settings = isRecord(raw.settings) ? raw.settings : {};
    return { ...raw, version: 2, settings: { ...settings, leftHanded: raw.leftHanded === true } };
  },
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const strings = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length < 64))].slice(0, 200) : []);

/** Turns any parsed JSON into valid SaveData (migrating old versions first). */
export function migrateAndSanitize(input: unknown): SaveData {
  const base = createDefaultSave();
  if (!isRecord(input)) return base;
  let raw: RawSave = input;
  let version = num(raw.version, 1);
  while (version < SAVE_VERSION && MIGRATIONS[version]) {
    raw = MIGRATIONS[version](raw);
    version = num(raw.version, version + 1);
  }

  const levels: Record<string, LevelRecord> = {};
  if (isRecord(raw.levels)) {
    for (const [id, value] of Object.entries(raw.levels)) {
      if (!isRecord(value) || id.length > 64) continue;
      const stars = Math.round(num(value.stars, 0, 0, 3));
      levels[id] = {
        completed: bool(value.completed, stars > 0),
        stars,
        bestScore: Math.round(num(value.bestScore, 0, 0, 1000)),
        bestImpulses: Math.round(num(value.bestImpulses, 0, 0, 999)),
        plays: Math.round(num(value.plays, 0, 0, 1e7)),
      };
    }
  }
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const daily = isRecord(raw.daily) ? raw.daily : {};
  const dailyBest: Record<string, DailyRecord> = {};
  if (isRecord(daily.best)) {
    for (const [key, value] of Object.entries(daily.best)) {
      if (!/^\d{4}-\d{2}-\d{2}/.test(key) || !isRecord(value)) continue;
      dailyBest[key] = {
        score: Math.round(num(value.score, 0, 0, 1000)),
        stars: Math.round(num(value.stars, 0, 0, 3)),
        impulses: Math.round(num(value.impulses, 0, 0, 999)),
        attempts: Math.round(num(value.attempts, 0, 0, 1e6)),
      };
    }
  }
  const stats = isRecord(raw.stats) ? raw.stats : {};
  const ent = isRecord(raw.entitlements) ? raw.entitlements : {};
  const parcels = strings(raw.unlockedParcels);
  const mailboxes = strings(raw.unlockedMailboxes);
  const unlockedParcels = parcels.includes('classic-envelope') ? parcels : ['classic-envelope', ...parcels];
  const unlockedMailboxes = mailboxes.includes('red-mailbox') ? mailboxes : ['red-mailbox', ...mailboxes];
  const selectedParcel = typeof raw.selectedParcel === 'string' && unlockedParcels.includes(raw.selectedParcel) ? raw.selectedParcel : base.selectedParcel;
  const selectedMailbox =
    typeof raw.selectedMailbox === 'string' && unlockedMailboxes.includes(raw.selectedMailbox) ? raw.selectedMailbox : base.selectedMailbox;

  return {
    version: Math.max(SAVE_VERSION, version),
    tutorialDone: bool(raw.tutorialDone, false),
    levels,
    totalStars: 0,
    unlockedWorlds: Array.isArray(raw.unlockedWorlds)
      ? [...new Set(raw.unlockedWorlds.filter((w): w is number => Number.isInteger(w) && w >= 0 && w < 64))]
      : [0],
    unlockedParcels,
    unlockedMailboxes,
    selectedParcel,
    selectedMailbox,
    settings: {
      sound: bool(settings.sound, DEFAULT_SETTINGS.sound),
      music: bool(settings.music, DEFAULT_SETTINGS.music),
      vibration: bool(settings.vibration, DEFAULT_SETTINGS.vibration),
      reducedMotion: bool(settings.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
      leftHanded: bool(settings.leftHanded, DEFAULT_SETTINGS.leftHanded),
    },
    daily: {
      best: dailyBest,
      streak: Math.round(num(daily.streak, 0, 0, 100000)),
      lastCompleted: typeof daily.lastCompleted === 'string' ? daily.lastCompleted : null,
      completed: Math.round(num(daily.completed, 0, 0, 1e6)),
    },
    stats: {
      deliveries: Math.round(num(stats.deliveries, 0, 0)),
      impulses: Math.round(num(stats.impulses, 0, 0)),
      playSeconds: num(stats.playSeconds, 0, 0),
    },
    entitlements: {
      removeAds: bool(ent.removeAds, false),
      parcelPacks: strings(ent.parcelPacks),
      mailboxPacks: strings(ent.mailboxPacks),
      bonusDaily: bool(ent.bonusDaily, false),
    },
  };
}

/** In-memory storage – used in tests and when localStorage is unavailable. */
export class MemoryStorage implements StorageAdapter {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

export function browserStorage(): StorageAdapter {
  try {
    const probe = '__mm_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return new MemoryStorage();
  }
}

export class SaveManager {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly key = STORAGE_KEY,
  ) {}

  load(): SaveData {
    let text: string | null;
    try {
      text = this.storage.getItem(this.key);
    } catch {
      return createDefaultSave();
    }
    if (!text) return createDefaultSave();
    try {
      return migrateAndSanitize(JSON.parse(text));
    } catch {
      try {
        this.storage.setItem(`${this.key}.corrupt`, text);
      } catch {
        /* storage full – nothing else to do */
      }
      return createDefaultSave();
    }
  }

  save(data: SaveData): boolean {
    try {
      this.storage.setItem(this.key, JSON.stringify({ ...data, version: Math.max(SAVE_VERSION, data.version) }));
      return true;
    } catch {
      return false;
    }
  }

  reset(): SaveData {
    try {
      this.storage.removeItem(this.key);
    } catch {
      /* ignore */
    }
    return createDefaultSave();
  }
}
