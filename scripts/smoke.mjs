/**
 * Browser smoke test (Playwright + the locally installed Microsoft Edge or Chrome).
 *
 *   npm run dev                       (or: npm run build && npm run preview)
 *   npm run smoke -- http://localhost:5173/
 *   npm run smoke -- "http://localhost:4173/?debug"
 *
 * Plays with real pointer events: menu → tutorial (attract + repel steps) → level 1 delivered with
 * the ATTRACT button → success screen → next level → REPEL → pause, in-game settings, left-handed
 * mode → restart → moving obstacles → a failure + hint route → reload (progress must persist) →
 * settings → collections → world / level select → daily → all 30 levels → narrow + desktop layouts.
 * Fails on console errors or on any request to another host. Screenshots go to test-results/.
 */
import fs from 'node:fs';
import path from 'node:path';

import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = path.resolve('test-results');
fs.mkdirSync(out, { recursive: true });
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      /* try the next browser */
    }
  }
  throw new Error('Neither Microsoft Edge nor Google Chrome is installed.');
}

const step = (name) => console.log(`\n▶ ${name}`);
const waitFor = (page, fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout, polling: 100 });

async function waitScene(page, key, timeout = 15000) {
  await waitFor(page, (k) => window.__MM__?.activeScenes().includes(k), key, timeout);
  await sleep(350);
}

async function find(page, label) {
  const list = await page.evaluate(() => window.__MM__.buttons());
  const hit = list.filter((b) => b.label === label).pop();
  if (!hit) throw new Error(`"${label}" not found. Visible: ${list.map((b) => b.label).join(', ')}`);
  return hit;
}

async function click(page, label) {
  const hit = await find(page, label);
  // Slightly off-centre on purpose: guards against hit areas shifted away from the drawn widget.
  await page.mouse.click(hit.x + 12, hit.y + 8);
  console.log(`  clicked "${label}"`);
  await sleep(250);
}

/** Holds a control button with the mouse for `ms`. */
async function hold(page, label, ms) {
  const hit = await find(page, label);
  await page.mouse.move(hit.x + 20, hit.y + 12);
  await page.mouse.down();
  await sleep(ms);
  await page.mouse.up();
  console.log(`  held "${label}" for ${ms} ms`);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log(`  screenshot ${name}.png`);
}

const state = (page) => page.evaluate(() => window.__MM__.gameplay());

async function newPage(browser, viewport, options = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, ...options });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[console] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith('data:') || u.startsWith('blob:')) return;
    if (!['localhost', '127.0.0.1'].includes(new URL(u).hostname)) errors.push(`[network] ${u}`);
  });
  return { context, page };
}

const browser = await launch();
try {
  const { context, page } = await newPage(browser, { width: 390, height: 844 });

  step('Main menu opens');
  await page.goto(url);
  await waitScene(page, 'Menu', 20000);
  await shot(page, '01-menu');

  step('Tutorial is playable');
  await click(page, 'Play');
  await waitScene(page, 'Tutorial');
  await shot(page, '02-tutorial-attract');
  for (let i = 0; i < 6 && (await page.evaluate(() => window.__MM__.tutorialStep())) === 0; i++) await hold(page, 'ATTRACT', 900);
  await waitFor(page, () => window.__MM__.tutorialStep() === 1, undefined, 8000);
  console.log('  step 1 (attract) completed');
  await sleep(500);
  await shot(page, '03-tutorial-repel');
  for (let i = 0; i < 4 && (await page.evaluate(() => window.__MM__.tutorialStep())) === 1; i++) {
    await hold(page, 'REPEL', 120);
    await sleep(1500);
  }
  await waitFor(page, () => window.__MM__.tutorialStep() === 2, undefined, 8000);
  console.log('  step 2 (repel) completed');
  await click(page, 'Skip');
  await waitScene(page, 'Menu');

  step('Level 1: attract, deliver, success screen');
  await click(page, 'Continue');
  await waitScene(page, 'Gameplay');
  await shot(page, '04-level1');
  await hold(page, 'ATTRACT', 1400);
  await sleep(200);
  await shot(page, '05-level1-flight');
  await waitScene(page, 'Result', 12000);
  await sleep(2500);
  await shot(page, '06-level1-success');
  const saved = await page.evaluate(() => window.__MM__.save().levels['w1-1']);
  console.log('  saved record', saved);
  if (!saved?.completed) throw new Error('Level 1 was not saved as delivered');
  await click(page, 'Next level');
  await waitFor(page, () => window.__MM__.gameplay()?.levelId === 'w1-2');

  step('Repel control, pause, in-game settings, left-handed mode, restart');
  const before = await state(page);
  await hold(page, 'REPEL', 120);
  await sleep(700);
  const after = await state(page);
  if (after.impulses !== 1 || after.x <= before.x + 20) throw new Error(`REPEL did not push the parcel: ${JSON.stringify(after)}`);
  console.log(`  parcel pushed from x=${before.x.toFixed(0)} to x=${after.x.toFixed(0)}`);
  const attractBefore = await find(page, 'ATTRACT');
  await click(page, 'pause');
  await shot(page, '07-pause');
  await click(page, 'Settings');
  await shot(page, '08-pause-settings');
  await click(page, 'Left-handed controls');
  await click(page, 'Done');
  await click(page, 'Resume');
  const attractAfter = await find(page, 'ATTRACT');
  if (!(attractAfter.x > attractBefore.x + 50)) throw new Error('Left-handed mode did not move the ATTRACT button');
  console.log('  ATTRACT moved to the right side');
  await shot(page, '09-left-handed');
  await click(page, 'pause');
  await click(page, 'Settings');
  await click(page, 'Left-handed controls');
  await click(page, 'Done');
  await click(page, 'Resume');
  await click(page, 'retry');
  await waitFor(page, () => window.__MM__.gameplay()?.impulses === 0);
  console.log('  restart reset the level');

  step('Moving obstacles, collisions and the failure screen');
  await page.evaluate(() => window.__MM__.start('Gameplay', { mode: 'campaign', index: 10 }));
  await waitScene(page, 'Gameplay');
  await hold(page, 'ATTRACT', 100);
  const m1 = (await state(page)).movers;
  // The elevator waits at the bottom for the first part of its cycle.
  await sleep(3800);
  const m2 = (await state(page)).movers;
  if (JSON.stringify(m1) === JSON.stringify(m2)) throw new Error('Moving obstacles did not move');
  console.log('  elevator moved', JSON.stringify(m1), '→', JSON.stringify(m2));
  await shot(page, '10-moving-elevator');
  await page.evaluate(() => window.__MM__.start('Gameplay', { mode: 'campaign', index: 9 }));
  await waitScene(page, 'Gameplay');
  await hold(page, 'ATTRACT', 500);
  await waitScene(page, 'Result', 12000);
  const failed = await page.evaluate(() => window.__MM__.save().levels['w2-5']);
  console.log('  failure recorded:', JSON.stringify(failed));
  await sleep(600);
  await shot(page, '11-failure');
  await click(page, 'Retry with a hint');
  await waitScene(page, 'Gameplay');
  await sleep(3500);
  await shot(page, '12-hint-route');

  step('Progress survives a reload');
  await page.reload();
  await waitScene(page, 'Menu', 20000);
  const reloaded = await page.evaluate(() => window.__MM__.save());
  if (!reloaded.levels['w1-1']?.completed || !reloaded.tutorialDone) throw new Error('Progress lost after reload');
  console.log(`  ok – ${reloaded.totalStars} star(s)`);

  step('Settings, collections, world and level select');
  await click(page, 'Settings');
  await waitScene(page, 'Settings');
  for (const toggle of ['Sound', 'Music', 'Vibration', 'Reduced motion']) {
    const was = await page.evaluate(() => JSON.stringify(window.__MM__.save().settings));
    await click(page, toggle);
    if ((await page.evaluate(() => JSON.stringify(window.__MM__.save().settings))) === was) throw new Error(`${toggle} did nothing`);
    await click(page, toggle);
  }
  await shot(page, '13-settings');
  await click(page, 'Reset progress');
  await click(page, 'Cancel');
  await click(page, 'back');
  await waitScene(page, 'Menu');
  await click(page, 'Parcels');
  await waitScene(page, 'Collection');
  await shot(page, '14-parcels');
  await click(page, 'Next');
  await click(page, 'Mailboxes');
  await shot(page, '15-mailboxes');
  await click(page, 'back');
  await waitScene(page, 'Menu');
  await click(page, 'Worlds');
  await waitScene(page, 'WorldSelect');
  await shot(page, '16-worlds');
  await click(page, 'Local Neighborhood');
  await waitScene(page, 'LevelSelect');
  await shot(page, '17-levels');
  await click(page, 'back');
  await waitScene(page, 'WorldSelect');
  await click(page, 'back');
  await waitScene(page, 'Menu');

  step('Daily delivery');
  await click(page, 'Daily Delivery');
  await waitScene(page, 'Gameplay');
  await sleep(600);
  await shot(page, '18-daily');

  step('All 30 levels load');
  for (let index = 0; index < 30; index++) {
    await page.evaluate((i) => window.__MM__.start('Gameplay', { mode: 'campaign', index: i }), index);
    await waitFor(page, (i) => window.__MM__.gameplay()?.levelId === `w${Math.floor(i / 5) + 1}-${(i % 5) + 1}`, index, 10000);
    await sleep(200);
    process.stdout.write(`  ${index + 1}✓`);
    if ([7, 13, 16, 21, 24, 29].includes(index)) await shot(page, `19-level-${String(index + 1).padStart(2, '0')}`);
  }
  console.log();

  step('Confirmed reset');
  await page.evaluate(() => window.__MM__.start('Settings'));
  await waitScene(page, 'Settings');
  await click(page, 'Reset progress');
  await click(page, 'Yes, reset everything');
  await waitScene(page, 'Menu');
  const reset = await page.evaluate(() => window.__MM__.save());
  if (Object.keys(reset.levels).length || reset.tutorialDone) throw new Error('Reset did not clear progress');
  console.log('  progress cleared');
  await context.close();

  step('Narrow phone and desktop layouts');
  for (const [name, viewport, opts] of [
    ['narrow-320x568', { width: 320, height: 568 }, {}],
    ['phone-360x780', { width: 360, height: 780 }, {}],
    ['desktop-1440x900', { width: 1440, height: 900 }, { hasTouch: false, deviceScaleFactor: 1 }],
  ]) {
    const { context: ctx, page: p } = await newPage(browser, viewport, opts);
    await p.goto(url);
    await waitScene(p, 'Menu', 20000);
    await shot(p, `20-${name}-menu`);
    await p.evaluate(() => window.__MM__.start('Gameplay', { mode: 'campaign', index: 13 }));
    await waitScene(p, 'Gameplay');
    await sleep(600);
    await shot(p, `20-${name}-gameplay`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(`\n✖ ${errors.length} browser error(s):\n${[...new Set(errors)].join('\n')}`);
  process.exit(1);
}
console.log('\n✔ Smoke test passed');
