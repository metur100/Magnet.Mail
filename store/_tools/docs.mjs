/**
 * Generates the store documents and plain-text listing files from content.mjs:
 *   store/play-store/PLAY-CONSOLE.md + listing/en-US/*.txt
 *   store/app-store/APP-STORE-CONNECT.md + metadata/en-US/*.txt
 * Usage: node store/_tools/docs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP, CONTACT, IOS, PLAY } from './content.mjs';

const STORE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const len = (s) => [...s].length;
const block = (label, text, max) => `**${label}** (${len(text)}/${max})\n\`\`\`text\n${text}\n\`\`\`\n`;
const PRIVACY = `${CONTACT.site}/privacy.html`;
const KEYSTORE = 'C:\\Users\\TurkesMedin\\keystore\\magnetmail';
const ALIAS = 'magnetmail.key';
const REPO = 'C:\\Users\\TurkesMedin\\repos\\Medin\\Magnet.Mail';

function check(name, text, max) {
  if (len(text) > max) throw new Error(`${name} is ${len(text)} chars (max ${max})`);
}
check('Play title', PLAY.title, 30);
check('Play short description', PLAY.short, 80);
check('Play full description', PLAY.full, 4000);
check('Play release notes', PLAY.releaseNotes, 500);
check('iOS name', IOS.name, 30);
check('iOS subtitle', IOS.subtitle, 30);
check('iOS promotional text', IOS.promo, 170);
check('iOS keywords', IOS.keywords, 100);
check('iOS description', IOS.description, 4000);

function write(rel, text) {
  const file = path.join(STORE, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
}

// ---------- Google Play ----------
write('play-store/listing/en-US/title.txt', PLAY.title);
write('play-store/listing/en-US/short_description.txt', PLAY.short);
write('play-store/listing/en-US/full_description.txt', PLAY.full);
write('play-store/listing/en-US/release_notes.txt', PLAY.releaseNotes);

write('play-store/PLAY-CONSOLE.md', `# ${APP.name} – Google Play Console

Everything needed to create and publish **${APP.name}** in the Play Console, in the order the Console asks for it.
Files referenced below are in this folder (\`store/play-store/\`).

| | |
| --- | --- |
| Package name | \`${APP.androidPackage}\` |
| Version | ${APP.version} (version code 10000) |
| Upload file | \`android/app/build/outputs/bundle/release/app-release.aab\` (see *6. Build the release*) |
| Upload key | \`${KEYSTORE}\`, alias \`${ALIAS}\` |
| Privacy policy | ${PRIVACY} |
| Website | ${CONTACT.site} |
| Contact email | ${CONTACT.email} |
| Target audience | 13–15, 16–17, 18+ |

## 1. Create app

*Home → Create app*

- **App name:** \`${PLAY.title}\`
- **Default language:** English (United States) – en-US
- **App or game:** Game
- **Free or paid:** Free
- Accept the Developer Program Policies and US export laws declarations.

## 2. Store listing

*Grow users → Store presence → Main store listing*

${block('App name', PLAY.title, 30)}
${block('Short description', PLAY.short, 80)}
${block('Full description', PLAY.full, 4000)}
**Release notes (“What’s new”)**
\`\`\`text
<en-US>
${PLAY.releaseNotes}
</en-US>
\`\`\`

### Graphics

| Asset | File | Requirement |
| --- | --- | --- |
| App icon | \`graphics/icon-512.png\` | 512 × 512 PNG |
| Feature graphic | \`graphics/feature-graphic.png\` | 1024 × 500, no transparency |
| Phone screenshots | \`screenshots/phone/\` (8) | 1080 × 1920 |

Upload the screenshots in file-name order (01 … 08). Tablet screenshots are optional (portrait phone game); upload the phone screenshots there too if the Console asks.

## 3. Store settings

*Grow users → Store presence → Store settings*

- **App category:** Game → **Puzzle**
- **Tags** (up to 5): Puzzle, Physics, Casual, Offline, Single player
- **Email address:** ${CONTACT.email}
- **Website:** ${CONTACT.site}
- **Phone number:** leave empty (optional)
- **External marketing:** allowed (default)

## 4. App content (Policy → App content)

### Privacy policy
${PRIVACY}

### App access
**All functionality in my app is available without any access restrictions.** (No login, no account.)

### Ads
**No, my app does not contain ads.**

### Content rating
Start the IARC questionnaire:
- **Email:** ${CONTACT.email}
- **Category:** **Game**
- Violence: **No.** (Parcels can break or be bumped by a cartoon train; no people or animals are shown or hurt.)
- Fear/horror, sexuality, nudity, language/profanity, crude humour, drugs/alcohol/tobacco, discrimination: **No** to every question.
- Gambling or simulated gambling: **No**
- Users can interact or exchange content (chat, sharing): **No**
- Shares the user’s current physical location: **No**
- Allows purchases of digital goods: **No**
- Unrestricted internet / web browser: **No**
- Expected result: **PEGI 3 · USK 0 · ESRB Everyone · IARC 3+**

### Target audience and content
- **Target age groups:** 13–15, 16–17, 18+
- **Could the app unintentionally appeal to children?** Answer **Yes** – it is a bright, casual game. That is fine: it has no ads, no purchases and collects no data.
  *Option:* to target under-13s too, tick 5–8/9–12 as well; the app then falls under the Families Policy (it already complies, but review is stricter and can take longer).

### News app
**No.**

### Data safety
- **Does your app collect or share any of the required user data types?** **No.**
  (Progress, stars, scores, cosmetics and settings are stored only on the device and never transmitted. The game makes no network requests.)
- Everything else in the form is then skipped. Summary on Google Play: *“No data collected · No data shared with third parties”*.

### Government apps · Financial features · Health
**No** / **My app doesn’t provide any financial features** / **My app does not have any health features.**

### Advertising ID
**No**, the app does not use an advertising ID.

### Permissions
No declarations are needed. The Capacitor template only requests \`INTERNET\` (normal permission, granted at install – the game itself never goes online); vibration uses \`VIBRATE\` (normal) if you add the haptics plugin.

## 5. Release

1. *Setup → App signing:* keep **Google Play App Signing** (recommended). You upload the AAB signed with your upload key; Google manages the app signing key.
2. Personal developer accounts created after November 2023 must first run a **closed test** (currently at least 12 testers for 14 days) before publishing to production – the Console shows the exact requirement for your account. Start with **Testing → Internal testing** (add yourself), then **Closed testing**.
3. *Create new release* → upload the \`.aab\` → release name \`${APP.version} (1)\` → paste the release notes above.
4. *Production → Countries/regions:* add all countries.
5. Submit for review.

## 6. Build the release (from this PC)

The upload key already exists: \`${KEYSTORE}\` (alias \`${ALIAS}\`). Its password is in
\`C:\\Users\\TurkesMedin\\keystore\\magnetmail-password.txt\` and in \`C:\\Users\\TurkesMedin\\.gradle\\gradle.properties\`
(\`MAGNET_MAIL_UPLOAD_*\`, read by the Gradle build). Neither file is in the repository.

**Every release:**

\`\`\`powershell
cd ${REPO}
$env:JAVA_HOME = "C:\\Program Files\\Android\\Android Studio\\jbr"
npm run android:bundle
# -> android\\app\\build\\outputs\\bundle\\release\\app-release.aab
\`\`\`

For an update raise \`version\` in \`package.json\` (the version code is derived from it: 1.0.1 → 10001), then run \`npm run android:setup\` before \`npm run android:bundle\`.

**On a fresh clone or another PC** (\`android/\` is generated and not committed):

\`\`\`powershell
npm install
npm run build
npx cap add android
npm run android:setup    # portrait, vibration, splash, launcher icons, version, signing
\`\`\`

and copy the keystore plus the four \`MAGNET_MAIL_UPLOAD_*\` lines of \`gradle.properties\` to that PC.

**Back up the keystore file and its password** – with Play App Signing a lost upload key can be reset through Google support, but it takes time.
`);

// ---------- App Store ----------
write('app-store/metadata/en-US/name.txt', IOS.name);
write('app-store/metadata/en-US/subtitle.txt', IOS.subtitle);
write('app-store/metadata/en-US/promotional_text.txt', IOS.promo);
write('app-store/metadata/en-US/keywords.txt', IOS.keywords);
write('app-store/metadata/en-US/description.txt', IOS.description);
write('app-store/metadata/en-US/release_notes.txt', IOS.releaseNotes);

write('app-store/APP-STORE-CONNECT.md', `# ${APP.name} – App Store Connect

Everything needed to publish **${APP.name}** on the App Store, in the order App Store Connect asks for it.
Files referenced below are in this folder (\`store/app-store/\`).

| | |
| --- | --- |
| Bundle ID | \`${APP.iosBundleId}\` |
| SKU | \`${APP.sku}\` |
| Version | ${APP.version} (build 1) |
| Primary language | English (U.S.) |
| Price | Free (all countries) |
| Contact / support email | ${CONTACT.email} |
| Privacy Policy URL | ${PRIVACY} |
| Support URL | ${CONTACT.site}/#support |
| Marketing URL | ${CONTACT.site}/ |

## 1. Build and upload (needs a Mac)

Magnet Mail is wrapped with Capacitor. Unlike the Expo games, **the iOS build has to be made with Xcode on a Mac**
(your own, a borrowed one, or a rented cloud Mac such as MacinCloud; a CI service with macOS runners – Codemagic, GitHub Actions – also works).
Prerequisites: Xcode 16+, Node.js 20+, an Apple Developer Program membership.

\`\`\`bash
git clone https://github.com/metur100/Magnet.Mail.git && cd Magnet.Mail
npm install
npm install @capacitor/core @capacitor/ios
npm install -D @capacitor/cli
npm run build
npx cap add ios
npx cap open ios
\`\`\`

In Xcode (target **App**):
- *General:* Display Name \`${IOS.name}\`, Bundle Identifier \`${APP.iosBundleId}\`, Version \`${APP.version}\`, Build \`1\`;
  *Supported Destinations:* iPhone only (remove iPad); *Deployment Info → iPhone Orientation:* **Portrait** only.
- *Signing & Capabilities:* tick *Automatically manage signing* and choose your team.
- *Info:* add \`ITSAppUsesNonExemptEncryption\` = **NO** (skips the export-compliance question).
- *Assets → AppIcon:* drop in \`store/app-store/icon-1024.png\` (single-size icon).
- *Product → Archive → Distribute App → App Store Connect → Upload.*

Create the app record first if it does not exist: *Apps → + → New App*, platform iOS, name \`${IOS.name}\`, bundle ID \`${APP.iosBundleId}\`, SKU \`${APP.sku}\`, full access.
After Apple has processed the build (5–30 minutes) it appears under **TestFlight**.

## 2. App Information (General → App Information)

${block('Name', IOS.name, 30)}
${block('Subtitle', IOS.subtitle, 30)}
- **Category:** primary **Games**, secondary **Education** (or Entertainment); game subcategories **Puzzle** and **Casual**
- **Content Rights:** **No, it does not contain, show, or access third-party content.**
- **Age Rating** → Edit: answer **None / No** to every question:
  - Parental controls, age assurance, unrestricted web access, user-generated content, messaging/chat, advertising: **No**
  - Profanity, horror/fear, alcohol/tobacco/drugs, medical information, sexual content or nudity: **None**
  - Cartoon/fantasy violence, realistic violence, graphic violence, weapons: **None** (parcels bump into obstacles; no characters are hurt)
  - Simulated gambling, contests, loot boxes: **None**
  - Expected rating: **4+**
- **Made for Kids:** **No** (puzzle game for everyone; "Made for Kids" adds extra review rules and is not needed).
- **License Agreement:** Apple's standard EULA.

## 3. Pricing and Availability

- **Price:** Free (USD 0.00) · **Availability:** all countries and regions · **Pre-order:** no

## 4. App Privacy

- **Privacy Policy URL:** ${PRIVACY}
- **Data Collection → Get Started:** **“No, we do not collect data from this app.”** → Publish.
  The App Store then shows **“Data Not Collected”**.

## 5. Version ${APP.version} (iOS App → ${APP.version} Prepare for Submission)

### Screenshots

| Device size | Folder | Size | Count |
| --- | --- | --- | --- |
| iPhone 6.9" Display (required) | \`screenshots/iphone-6.9/\` | 1320 × 2868 | 8 |
| iPhone 6.5" Display (only if asked) | \`screenshots/iphone-6.5/\` | 1284 × 2778 | 8 |
| iPhone 6.3" Display (optional) | \`screenshots/iphone-6.3/\` | 1206 × 2622 | 8 |

Drag the files in name order (01 … 08). iPad screenshots are **not** needed when the build is iPhone-only (see step 1).

### Header artwork (optional, "Kopfzeilen-Inhalt")

Shown as the large banner at the top of the product page and in search results. Optional, but recommended.
Rendered by \`node store/_tools/render.mjs --header\` (no alpha channel, content kept in the centre so every crop works):

| Asset | File | Size |
| --- | --- | --- |
| Universal (header **and** search results) – use this one | \`header/header-16x9.png\` | 5244 × 2950 |
| Product page header only | \`header/header-21x9.png\` | 3840 × 1646 |

Upload \`header-16x9.png\`, check both crops in the preview (header 21:9, search 3:2) and enable it for search results too.

### Texts

${block('Promotional text', IOS.promo, 170)}
${block('Keywords (comma-separated, no spaces)', IOS.keywords, 100)}
${block('Description', IOS.description, 4000)}
- **Support URL:** ${CONTACT.site}/#support · **Marketing URL:** ${CONTACT.site}/
- **Version:** ${APP.version}
- **Copyright:** \`${APP.copyright}\`
- **Build:** choose the build uploaded from Xcode (+ Add Build).
- **App Review Information:**
  - Sign-in required: **No**
  - Contact: ${CONTACT.name}, ${CONTACT.email}, phone: **your phone number** (required by Apple, not shown publicly)
  - Notes:
\`\`\`text
${IOS.reviewNotes}
\`\`\`
- **Version Release:** “Manually release this version” (recommended for the first release).

Then **Add for Review → Submit to App Review**.

### What’s New (for later updates)
\`\`\`text
${IOS.releaseNotes}
\`\`\`
`);

console.log('docs written');
