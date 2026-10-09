import type { SaveData } from './SaveManager';

/** Collectible parcel and mailbox designs. Cosmetic only – they never change physics. */

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface UnlockRule {
  kind: 'start' | 'stars' | 'world' | 'daily' | 'threeStars';
  /** stars: total stars; world: world index completed; daily: daily deliveries; threeStars: number of 3★ levels. */
  value: number;
}

export interface ParcelSkin {
  id: string;
  name: string;
  category: 'Envelope' | 'Food' | 'Gift' | 'Sci-fi' | 'Holiday' | 'Magnetic';
  rarity: Rarity;
  /** Body, accent (tape / ribbon / trim) and detail colours. */
  body: number;
  accent: number;
  detail: number;
  pattern: 'tape' | 'stamp' | 'ribbon' | 'dots' | 'stripes' | 'neon' | 'pizza' | 'aurora';
  unlock: UnlockRule;
}

export interface MailboxSkin {
  id: string;
  name: string;
  category: string;
  rarity: Rarity;
  body: number;
  trim: number;
  flag: number;
  style: 'post' | 'city' | 'station' | 'industrial' | 'locker' | 'port';
  unlock: UnlockRule;
}

export const PARCEL_SKINS: ParcelSkin[] = [
  { id: 'classic-envelope', name: 'Classic Envelope', category: 'Envelope', rarity: 'Common', body: 0xf6e7c8, accent: 0xd4523f, detail: 0x2f7ff0, pattern: 'stamp', unlock: { kind: 'start', value: 0 } },
  { id: 'air-mail', name: 'Air Mail', category: 'Envelope', rarity: 'Common', body: 0xffffff, accent: 0xe24a4a, detail: 0x2f6fd8, pattern: 'stripes', unlock: { kind: 'stars', value: 5 } },
  { id: 'pizza-box', name: 'Pizza Box', category: 'Food', rarity: 'Common', body: 0xe8c48f, accent: 0xd9452e, detail: 0x3c8f3a, pattern: 'pizza', unlock: { kind: 'world', value: 0 } },
  { id: 'lunch-bag', name: 'Lunch Bag', category: 'Food', rarity: 'Rare', body: 0xc9a06a, accent: 0x8a5a2b, detail: 0xffffff, pattern: 'tape', unlock: { kind: 'stars', value: 20 } },
  { id: 'ribbon-gift', name: 'Ribbon Gift', category: 'Gift', rarity: 'Common', body: 0xff7aa8, accent: 0xffd34d, detail: 0xffffff, pattern: 'ribbon', unlock: { kind: 'world', value: 1 } },
  { id: 'polka-gift', name: 'Polka Gift', category: 'Gift', rarity: 'Rare', body: 0x58c4dd, accent: 0xffffff, detail: 0xff5d8f, pattern: 'dots', unlock: { kind: 'threeStars', value: 6 } },
  { id: 'neon-crate', name: 'Neon Crate', category: 'Sci-fi', rarity: 'Rare', body: 0x2b2f4a, accent: 0x39f0c8, detail: 0xff4fd8, pattern: 'neon', unlock: { kind: 'world', value: 3 } },
  { id: 'hover-crate', name: 'Hover Crate', category: 'Sci-fi', rarity: 'Epic', body: 0x9aa6c4, accent: 0x5fe1ff, detail: 0x2b2f4a, pattern: 'neon', unlock: { kind: 'stars', value: 45 } },
  { id: 'snowy-package', name: 'Snowy Package', category: 'Holiday', rarity: 'Rare', body: 0xd8463f, accent: 0x2f9e5b, detail: 0xffffff, pattern: 'ribbon', unlock: { kind: 'daily', value: 3 } },
  { id: 'pumpkin-parcel', name: 'Pumpkin Parcel', category: 'Holiday', rarity: 'Rare', body: 0xff8a1f, accent: 0x3c2a1e, detail: 0x6abf45, pattern: 'stripes', unlock: { kind: 'daily', value: 7 } },
  { id: 'magnetar', name: 'Magnetar', category: 'Magnetic', rarity: 'Epic', body: 0x6a3fd8, accent: 0xff4f4f, detail: 0x4f9dff, pattern: 'tape', unlock: { kind: 'world', value: 5 } },
  { id: 'aurora', name: 'Aurora Core', category: 'Magnetic', rarity: 'Legendary', body: 0x1b2448, accent: 0x7cf7c4, detail: 0xc58bff, pattern: 'aurora', unlock: { kind: 'threeStars', value: 30 } },
];

export const MAILBOX_SKINS: MailboxSkin[] = [
  { id: 'red-mailbox', name: 'Red Mailbox', category: 'Neighborhood', rarity: 'Common', body: 0xe0443e, trim: 0x8f2420, flag: 0xffc531, style: 'post', unlock: { kind: 'start', value: 0 } },
  { id: 'city-mailbox', name: 'City Mailbox', category: 'City', rarity: 'Common', body: 0x2f6fd8, trim: 0x1b3f80, flag: 0xffc531, style: 'city', unlock: { kind: 'world', value: 1 } },
  { id: 'station-box', name: 'Train Station Box', category: 'Railway', rarity: 'Rare', body: 0x2f8f5b, trim: 0x1d5a39, flag: 0xffd34d, style: 'station', unlock: { kind: 'world', value: 2 } },
  { id: 'industrial-box', name: 'Industrial Mailbox', category: 'Industrial', rarity: 'Rare', body: 0xf2b134, trim: 0x3a3a3a, flag: 0xec4b4b, style: 'industrial', unlock: { kind: 'world', value: 3 } },
  { id: 'airport-locker', name: 'Airport Delivery Locker', category: 'Airport', rarity: 'Epic', body: 0xdfe7ef, trim: 0x18a7a0, flag: 0xff8a3d, style: 'locker', unlock: { kind: 'world', value: 4 } },
  { id: 'space-port', name: 'Space Station Port', category: 'Space', rarity: 'Legendary', body: 0x3b3f6e, trim: 0x8e5cf7, flag: 0x7cf7c4, style: 'port', unlock: { kind: 'world', value: 5 } },
];

export function describeUnlock(rule: UnlockRule, worldNames: string[]): string {
  switch (rule.kind) {
    case 'start':
      return 'Available from the start';
    case 'stars':
      return `Collect ${rule.value} stars`;
    case 'world':
      return `Complete ${worldNames[rule.value] ?? `world ${rule.value + 1}`}`;
    case 'daily':
      return `Finish ${rule.value} daily challenges`;
    case 'threeStars':
      return `Earn 3 stars on ${rule.value} levels`;
  }
}

/** Facts the unlock rules are checked against. */
export interface UnlockFacts {
  totalStars: number;
  worldsCompleted: number[];
  dailyCompleted: number;
  threeStarLevels: number;
}

export function isUnlocked(rule: UnlockRule, facts: UnlockFacts): boolean {
  switch (rule.kind) {
    case 'start':
      return true;
    case 'stars':
      return facts.totalStars >= rule.value;
    case 'world':
      return facts.worldsCompleted.includes(rule.value);
    case 'daily':
      return facts.dailyCompleted >= rule.value;
    case 'threeStars':
      return facts.threeStarLevels >= rule.value;
  }
}

export function getParcelSkin(id: string): ParcelSkin {
  return PARCEL_SKINS.find((s) => s.id === id) ?? PARCEL_SKINS[0];
}

export function getMailboxSkin(id: string): MailboxSkin {
  return MAILBOX_SKINS.find((s) => s.id === id) ?? MAILBOX_SKINS[0];
}

/** Ids of newly unlocked items given the save's facts (purchased packs are included too). */
export function computeUnlocks(save: SaveData, facts: UnlockFacts): { parcels: string[]; mailboxes: string[] } {
  const parcels = PARCEL_SKINS.filter((s) => isUnlocked(s.unlock, facts) || save.entitlements.parcelPacks.includes(s.id)).map((s) => s.id);
  const mailboxes = MAILBOX_SKINS.filter((s) => isUnlocked(s.unlock, facts) || save.entitlements.mailboxPacks.includes(s.id)).map((s) => s.id);
  return { parcels, mailboxes };
}
