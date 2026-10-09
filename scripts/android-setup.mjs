/**
 * Applies the Magnet Mail customisations to the generated Capacitor Android project (android/ is not committed):
 * portrait lock, vibration permission, splash colour, launcher icons from public/icon.svg, version and release signing.
 *
 *   npx cap add android        # once (creates android/)
 *   npm run android:setup      # after every `cap add`, and after changing the version or the icon
 *   npm run android:bundle     # signed AAB → android/app/build/outputs/bundle/release/app-release.aab
 *
 * Signing reads MAGNET_MAIL_UPLOAD_* from ~/.gradle/gradle.properties (passwords never go into the repository).
 * Needs Microsoft Edge or Chrome (icon rendering) and ffmpeg.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const ANDROID = path.join(ROOT, 'android');
const MAIN = path.join(ANDROID, 'app', 'src', 'main');
const RES = path.join(MAIN, 'res');
const SPLASH_COLOR = '#d9ecff';
const ICON_COLOR = '#2f7ff0';

if (!fs.existsSync(MAIN)) throw new Error('android/ not found – run `npx cap add android` first');

function edit(file, change) {
  const before = fs.readFileSync(file, 'utf8');
  const after = change(before);
  if (after !== before) fs.writeFileSync(file, after);
}

// ---------- Manifest: portrait + vibration ----------
edit(path.join(MAIN, 'AndroidManifest.xml'), (s) => {
  if (!s.includes('android:screenOrientation')) s = s.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="portrait"');
  if (!s.includes('android.permission.VIBRATE')) s = s.replace('<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.VIBRATE" />');
  return s;
});

// ---------- Splash: plain game background colour (Android 12+ shows the launcher icon on it) ----------
for (const dir of fs.readdirSync(RES)) {
  const png = path.join(RES, dir, 'splash.png');
  if (dir.startsWith('drawable') && fs.existsSync(png)) fs.rmSync(png);
}
fs.writeFileSync(path.join(RES, 'drawable', 'splash.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <solid android:color="${SPLASH_COLOR}" />\n</shape>\n`);
edit(path.join(RES, 'values', 'styles.xml'), (s) =>
  s.includes('windowSplashScreenBackground')
    ? s
    : s.replace('<item name="android:background">@drawable/splash</item>', `<item name="android:background">@drawable/splash</item>\n        <item name="windowSplashScreenBackground">${SPLASH_COLOR}</item>\n        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>`),
);
edit(path.join(RES, 'values', 'ic_launcher_background.xml'), (s) => s.replace(/<color name="ic_launcher_background">[^<]*<\/color>/, `<color name="ic_launcher_background">${ICON_COLOR}</color>`));

// ---------- Version (versionCode derived from package.json: 1.2.3 → 10203) ----------
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const [major, minor, patch] = version.split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;

// ---------- Release signing from ~/.gradle/gradle.properties ----------
edit(path.join(ANDROID, 'app', 'build.gradle'), (s) => {
  s = s.replace(/versionCode \d+/, `versionCode ${versionCode}`).replace(/versionName "[^"]*"/, `versionName "${version}"`);
  if (!s.includes('MAGNET_MAIL_UPLOAD_STORE_FILE')) {
    s = s.replace(
      /(\n\s*buildTypes \{\n\s*release \{)/,
      `
    signingConfigs {
        release {
            if (project.hasProperty('MAGNET_MAIL_UPLOAD_STORE_FILE')) {
                storeFile file(MAGNET_MAIL_UPLOAD_STORE_FILE)
                storePassword MAGNET_MAIL_UPLOAD_STORE_PASSWORD
                keyAlias MAGNET_MAIL_UPLOAD_KEY_ALIAS
                keyPassword MAGNET_MAIL_UPLOAD_KEY_PASSWORD
            }
        }
    }$1
            signingConfig signingConfigs.release`,
    );
  }
  return s;
});

// ---------- Launcher icons ----------
const svg = fs.readFileSync(path.join(ROOT, 'public', 'icon.svg'), 'utf8');
const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)[0];
const art = svg.slice(svg.indexOf('</defs>') + 7, svg.lastIndexOf('</svg>')).replace(/<rect width="1024" height="1024"[^>]*\/>/, '');
const background = '<rect width="1024" height="1024" fill="url(#bg)"/>';
// The artwork is centred around x=534; scale it into the adaptive-icon safe zone (inner 66/108).
const centred = (scale) => `<g transform="translate(512 512) scale(${scale}) translate(-534 -512)">${art}</g>`;
const page = (body, clip = '') =>
  `<!doctype html><html><head><style>*{margin:0}html,body{background:transparent}svg{display:block;width:432px;height:432px}</style></head><body>` +
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}${clip}${body}</svg></body></html>`;
const mask = (shape) => `<clipPath id="c">${shape}</clipPath>`;
const LAYERS = {
  ic_launcher_foreground: page(centred(0.62)),
  ic_launcher_background: page(background),
  ic_launcher: page(`<g clip-path="url(#c)">${background}${centred(0.86)}</g>`, mask('<rect x="40" y="40" width="944" height="944" rx="190"/>')),
  ic_launcher_round: page(`<g clip-path="url(#c)">${background}${centred(0.78)}</g>`, mask('<circle cx="512" cy="512" r="472"/>')),
};
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-icons-'));
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
  const tab = await browser.newPage({ viewport: { width: 432, height: 432 } });
  for (const [name, html] of Object.entries(LAYERS)) {
    await tab.setContent(html);
    const master = path.join(tmp, `${name}.png`);
    await tab.screenshot({ path: master, omitBackground: true });
    // Legacy icons are 48 dp, adaptive layers 108 dp.
    const dp = name === 'ic_launcher' || name === 'ic_launcher_round' ? 48 : 108;
    for (const [density, factor] of Object.entries(DENSITIES)) {
      const size = Math.round(dp * factor);
      const out = path.join(RES, `mipmap-${density}`, `${name}.png`);
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', master, '-vf', `scale=${size}:${size}:flags=lanczos`, '-pix_fmt', 'rgba', out]);
    }
  }
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  fs.writeFileSync(
    path.join(RES, 'mipmap-anydpi-v26', file),
    `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@mipmap/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`,
  );
}
// The template's vector placeholders would shadow the PNG layers.
for (const file of [path.join(RES, 'drawable', 'ic_launcher_background.xml'), path.join(RES, 'drawable-v24', 'ic_launcher_foreground.xml')]) {
  if (fs.existsSync(file)) fs.rmSync(file);
}

console.log(`android/ ready: ${version} (versionCode ${versionCode}), portrait, icons, splash, signing ${fs.existsSync(path.join(os.homedir(), '.gradle', 'gradle.properties')) && fs.readFileSync(path.join(os.homedir(), '.gradle', 'gradle.properties'), 'utf8').includes('MAGNET_MAIL_UPLOAD_STORE_FILE') ? 'configured' : 'NOT configured (add MAGNET_MAIL_UPLOAD_* to ~/.gradle/gradle.properties)'}`);
