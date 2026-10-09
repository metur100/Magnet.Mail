/**
 * Renders every store image from the raw captures (see capture.mjs):
 *   play-store/screenshots/phone/NN.png          1080 × 1920
 *   play-store/graphics/icon-512.png              512 × 512
 *   play-store/graphics/feature-graphic.png       1024 × 500 (no alpha)
 *   app-store/screenshots/iphone-6.9/NN.png       1320 × 2868 (+ 6.5" 1284 × 2778, 6.3" 1206 × 2622)
 *   app-store/icon-1024.png                       1024 × 1024 (no alpha – App Store requirement)
 *   app-store/header/header-21x9.png              3840 × 1646 (product page header, no alpha)
 *   app-store/header/header-16x9.png              5244 × 2950 (header + search results, no alpha)
 * Uses headless Microsoft Edge for layout and ffmpeg for exact sizing.
 * Usage: node store/_tools/render.mjs            (everything)
 *        node store/_tools/render.mjs --header   (only the App Store header artwork)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { CAPTIONS } from './content.mjs';

const STORE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(STORE, '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-store-'));
const fontFile = (weight) => pathToFileURL(path.join(ROOT, 'node_modules', '@fontsource', 'fredoka', 'files', `fredoka-latin-${weight}-normal.woff2`)).href;
const ICON_SVG = pathToFileURL(path.join(ROOT, 'public', 'icon.svg')).href;

const CSS = `
@font-face { font-family: Fredoka; src: url('${fontFile(700)}'); font-weight: 700; }
@font-face { font-family: Fredoka; src: url('${fontFile(600)}'); font-weight: 600; }
* { margin: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; }
body { position: relative; color: #24324a; font-family: Fredoka, sans-serif; font-weight: 700;
  background: radial-gradient(70% 45% at 90% 5%, rgba(47,127,240,.30) 0%, transparent 70%),
              radial-gradient(60% 40% at 0% 100%, rgba(236,75,75,.28) 0%, transparent 70%),
              linear-gradient(175deg, #d9ecff 0%, #fff1e2 100%); }
.dots { position: absolute; inset: 0; background-image: radial-gradient(rgba(36,50,74,.9) 2.2px, transparent 3px); background-size: 64px 64px; opacity: .05; }
h1 { line-height: 1.02; letter-spacing: -.01em; }
.sub { font-weight: 600; color: #ec4b4b; }
.blue { color: #2f7ff0; }
.frame { position: absolute; left: 50%; transform: translateX(-50%); background: #24324a; box-shadow: 0 50px 100px rgba(36,50,74,.35); }
.frame img { display: block; width: 100%; }
`;

function render(html, width, height, out, scale = 1) {
  const name = `${path.basename(path.dirname(out))}-${path.basename(out, '.png')}`;
  const file = path.join(TMP, `${name}.html`);
  const raw = path.join(TMP, `${name}.raw.png`);
  fs.writeFileSync(file, html);
  for (let attempt = 1; ; attempt++) {
    try {
      execFileSync(EDGE, [
        '--headless=new', `--user-data-dir=${path.join(TMP, `profile-${name}-${attempt}`)}`, '--no-first-run', '--disable-gpu',
        '--allow-file-access-from-files', '--hide-scrollbars', `--force-device-scale-factor=${scale}`,
        `--window-size=${Math.ceil(width / scale)},${Math.ceil(height / scale)}`, `--screenshot=${raw}`, pathToFileURL(file).href,
      ], { stdio: 'ignore', timeout: 90000 });
      break;
    } catch (error) {
      if (attempt >= 3) throw error;
    }
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height}:0:0`, '-pix_fmt', 'rgb24', out]);
}

/** Caption on top, the game screen in a rounded phone frame below. Sizes are in output pixels. */
function screenshot(img, aspect, [title, sub], w, h) {
  const u = w / 1080;
  const top = Math.round(h * 0.19);
  const pad = Math.round(16 * u);
  const frameW = Math.round(Math.min(w * 0.82, (h - top - h * 0.035 - 2 * pad) / aspect + 2 * pad));
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
  .cap { position: absolute; left: 0; right: 0; top: ${Math.round(h * 0.04)}px; text-align: center; padding: 0 ${Math.round(56 * u)}px; }
  h1 { font-size: ${Math.round(92 * u)}px; } .sub { font-size: ${Math.round(46 * u)}px; margin-top: ${Math.round(14 * u)}px; }
  .frame { top: ${top}px; width: ${frameW}px; padding: ${pad}px; border-radius: ${Math.round(72 * u)}px; }
  .frame img { border-radius: ${Math.round(58 * u)}px; }
  </style></head><body><div class="dots"></div>
  <div class="cap"><h1>${title}</h1><div class="sub">${sub}</div></div>
  <div class="frame"><img src="${img}"></div></body></html>`;
}

function featureGraphic(shot) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
  .row { position: absolute; inset: 0; display: flex; align-items: center; padding: 0 0 0 60px; gap: 30px; }
  .icon { width: 150px; border-radius: 34px; box-shadow: 0 16px 36px rgba(36,50,74,.3); }
  h1 { font-size: 92px; margin-top: 10px; } .sub { font-size: 32px; margin-top: 6px; }
  .copy { flex: 1; }
  .ph { position: relative; width: 320px; height: 500px; overflow: hidden; }
  .ph .frame { top: 36px; width: 280px; padding: 9px; border-radius: 38px; transform: translateX(-50%) rotate(6deg); }
  .ph .frame img { border-radius: 30px; }
  </style></head><body><div class="dots"></div><div class="row">
  <div class="copy"><img class="icon" src="${ICON_SVG}"><h1><span class="blue">Magnet</span> <span style="color:#ec4b4b">Mail</span></h1>
  <div class="sub" style="color:#24324a">Pull. Push. Deliver.</div></div>
  <div class="ph"><div class="frame"><img src="${shot}"></div></div></div></body></html>`;
}

/**
 * App Store header artwork. All content sits in a centred 1500 × 760 box (CSS px) so the 16:9 version
 * survives both crops App Store Connect applies to it (21:9 header, 3:2 search result).
 */
function headerArt([left, main, right], cssW, cssH) {
  const phone = (shot, h) => `<div class="frame" style="width:${Math.round((h * 1320) / 2868)}px"><img src="${shot}"></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
  body { width: ${cssW}px; height: ${cssH}px; }
  .safe { position: absolute; left: 50%; top: 50%; width: 1500px; height: 760px; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 40px; }
  .copy { flex: 0 0 640px; }
  .icon { width: 150px; border-radius: 34px; box-shadow: 0 16px 36px rgba(36,50,74,.3); }
  h1 { font-size: 124px; margin-top: 22px; } .sub { font-size: 40px; margin-top: 14px; color: #24324a; }
  .phones { position: relative; flex: 1; height: 760px; filter: drop-shadow(0 34px 44px rgba(36,50,74,.3)); }
  .phones .frame { position: relative; left: auto; top: auto; transform: none; padding: 10px; border-radius: 44px; box-shadow: none; }
  .frame img { border-radius: 35px; }
  .p { position: absolute; left: 50%; top: 50%; }
  .p-main { z-index: 3; transform: translate(-50%, -50%); }
  .p-left { z-index: 2; transform: translate(-108%, -46%) rotate(-9deg) scale(.86); }
  .p-right { z-index: 1; transform: translate(8%, -46%) rotate(9deg) scale(.86); }
  </style></head><body><div class="dots"></div><div class="safe">
  <div class="copy"><img class="icon" src="${ICON_SVG}"><h1><span class="blue">Magnet</span><br><span style="color:#ec4b4b">Mail</span></h1>
  <div class="sub">Pull. Push. Deliver.<br>30 levels in 6 worlds.</div></div>
  <div class="phones">
    <div class="p p-left">${phone(left, 620)}</div>
    <div class="p p-right">${phone(right, 620)}</div>
    <div class="p p-main">${phone(main, 700)}</div>
  </div></div></body></html>`;
}

const iconPage = (size) =>
  `<!doctype html><html><head><style>*{margin:0}html,body{width:${size}px;height:${size}px;overflow:hidden;background:#d9ecff}img{width:${size}px;height:${size}px;display:block}</style></head><body><img src="${ICON_SVG}"></body></html>`;

// ---------- Run ----------
const rawDir = (set) => path.join(STORE, 'raw', set);
const shots = fs.readdirSync(rawDir('phone')).filter((f) => /^\d\d-.*\.png$/.test(f)).sort();
if (shots.length !== CAPTIONS.length) throw new Error(`expected ${CAPTIONS.length} raw shots, found ${shots.length}`);

const headerShots = [2, 1, 3].map((i) => pathToFileURL(path.join(rawDir('tall'), shots[i])).href);
render(headerArt(headerShots, 1920, 823), 3840, 1646, path.join(STORE, 'app-store', 'header', 'header-21x9.png'), 2);
render(headerArt(headerShots, 1920, 1080), 5244, 2950, path.join(STORE, 'app-store', 'header', 'header-16x9.png'), 5244 / 1920);
console.log('rendered App Store header artwork');
if (process.argv.includes('--header')) {
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(0);
}

shots.forEach((file, i) => {
  const name = `${String(i + 1).padStart(2, '0')}.png`;
  render(screenshot(pathToFileURL(path.join(rawDir('phone'), file)).href, 1920 / 1080, CAPTIONS[i], 1080, 1920), 1080, 1920, path.join(STORE, 'play-store', 'screenshots', 'phone', name));
  render(screenshot(pathToFileURL(path.join(rawDir('tall'), file)).href, 2868 / 1320, CAPTIONS[i], 1320, 2868), 1320, 2868, path.join(STORE, 'app-store', 'screenshots', 'iphone-6.9', name));
  for (const [dir, w, h] of [['iphone-6.5', 1284, 2778], ['iphone-6.3', 1206, 2622]]) {
    const out = path.join(STORE, 'app-store', 'screenshots', dir, name);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(STORE, 'app-store', 'screenshots', 'iphone-6.9', name), '-vf', `scale=${w}:${h}:flags=lanczos`, '-pix_fmt', 'rgb24', out]);
  }
  console.log('rendered', name, CAPTIONS[i][0]);
});

render(featureGraphic(pathToFileURL(path.join(rawDir('phone'), shots[3])).href), 1024, 500, path.join(STORE, 'play-store', 'graphics', 'feature-graphic.png'));
render(iconPage(512), 512, 512, path.join(STORE, 'play-store', 'graphics', 'icon-512.png'));
render(iconPage(1024), 1024, 1024, path.join(STORE, 'app-store', 'icon-1024.png'));
console.log('rendered feature graphic + icons');
fs.rmSync(TMP, { recursive: true, force: true });
