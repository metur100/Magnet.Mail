/**
 * Captures the raw store screenshots from the real game (Playwright + local Edge/Chrome).
 *   store/raw/phone/NN-name.png  1080 × 1920 (Google Play, 9:16)
 *   store/raw/tall/NN-name.png   1320 × 2868 (App Store 6.9", the game adapts to the taller screen)
 *
 * Usage: npm run build && npx vite preview --port 4175   (in another terminal)
 *        node store/_tools/capture.mjs [http://localhost:4175/?debug]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

const STORE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.argv[2] ?? 'http://localhost:4175/?debug';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A save with progress, so menus, worlds and collections look like a real player's. */
function demoSave() {
  const levels = {};
  const stars = [3, 3, 3, 2, 3, 3, 2, 3, 3, 3, 3, 2, 3, 3, 3, 2, 3, 3, 3, 2, 3, 3, 2];
  stars.forEach((s, i) => {
    const id = `w${Math.floor(i / 5) + 1}-${(i % 5) + 1}`;
    levels[id] = { completed: true, stars: s, bestScore: 780 + ((i * 37) % 200), bestImpulses: 1 + (i % 3), plays: 2 };
  });
  return {
    version: 2,
    tutorialDone: true,
    levels,
    unlockedParcels: ['classic-envelope', 'air-mail', 'pizza-box', 'lunch-bag', 'ribbon-gift', 'polka-gift', 'neon-crate', 'snowy-package', 'pumpkin-parcel', 'magnetar'],
    unlockedMailboxes: ['red-mailbox', 'city-mailbox', 'station-box', 'industrial-box', 'airport-locker'],
    selectedParcel: 'ribbon-gift',
    selectedMailbox: 'red-mailbox',
    settings: { sound: false, music: false, vibration: false, reducedMotion: false, leftHanded: false },
    daily: { best: {}, streak: 4, lastCompleted: null, completed: 7 },
    stats: { deliveries: 41, impulses: 96, playSeconds: 3600 },
  };
}

/** Each shot: what to open and how to set up the moment. */
const SHOTS = [
  { name: '01-attract', level: 2, press: 'ATTRACT', hold: 380 },
  { name: '02-trains', level: 11, press: 'REPEL', hold: 140, after: 450 },
  { name: '03-industrial', level: 16, press: 'ATTRACT', hold: 480 },
  { name: '04-space', level: 29, press: 'ATTRACT', hold: 1200 },
  { name: '05-delivered', level: 0, press: 'ATTRACT', hold: 1400, waitScene: 'Result', after: 2600 },
  { name: '06-worlds', scene: 'WorldSelect' },
  { name: '07-collection', scene: 'Collection', data: { tab: 'parcels' } },
  { name: '08-menu', scene: 'Menu' },
];

async function capture(browser, set, viewport) {
  const dir = path.join(STORE, 'raw', set);
  fs.mkdirSync(dir, { recursive: true });
  for (const shot of SHOTS) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 3, hasTouch: true });
    await context.addInitScript((save) => {
      try {
        localStorage.setItem('magnet-mail/save', JSON.stringify(save));
      } catch {
        /* ignore */
      }
    }, demoSave());
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForFunction(() => window.__MM__?.activeScenes().includes('Menu'), null, { timeout: 30000 });
    if (shot.scene && shot.scene !== 'Menu') {
      await page.evaluate(([key, data]) => window.__MM__.start(key, data), [shot.scene, shot.data ?? {}]);
      await page.waitForFunction((k) => window.__MM__.activeScenes().includes(k), shot.scene);
      await sleep(1600);
    } else if (shot.level !== undefined) {
      await page.evaluate((i) => window.__MM__.start('Gameplay', { mode: 'campaign', index: i }), shot.level);
      await page.waitForFunction(() => window.__MM__.activeScenes().includes('Gameplay'));
      // Let the level-intro tip fade away first.
      await sleep(6200);
      const control = (await page.evaluate(() => window.__MM__.buttons())).find((b) => b.label === shot.press);
      await page.mouse.move(control.x, control.y);
      await page.mouse.down();
      await sleep(shot.hold);
      if (shot.waitScene) {
        await page.mouse.up();
        await page.waitForFunction((k) => window.__MM__.activeScenes().includes(k), shot.waitScene, { timeout: 15000 });
        await sleep(shot.after ?? 1000);
      } else if (shot.after) {
        await page.mouse.up();
        await sleep(shot.after);
      }
    } else {
      await sleep(1500);
    }
    await page.screenshot({ path: path.join(dir, `${shot.name}.png`) });
    await page.mouse.up();
    console.log(`${set}/${shot.name}.png`);
    await context.close();
  }
}

const browser = await (async () => {
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      /* next */
    }
  }
  throw new Error('Edge or Chrome is required');
})();
try {
  await capture(browser, 'phone', { width: 360, height: 640 });
  await capture(browser, 'tall', { width: 440, height: 956 });
} finally {
  await browser.close();
}
