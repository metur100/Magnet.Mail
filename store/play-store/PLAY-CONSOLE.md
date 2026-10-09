# Magnet Mail – Google Play Console

Everything needed to create and publish **Magnet Mail** in the Play Console, in the order the Console asks for it.
Files referenced below are in this folder (`store/play-store/`).

| | |
| --- | --- |
| Package name | `com.certidevelopment.magnetmail` |
| Version | 1.0.0 (version code 10000) |
| Upload file | `android/app/build/outputs/bundle/release/app-release.aab` (see *6. Build the release*) |
| Upload key | `C:\Users\TurkesMedin\keystore\magnetmail`, alias `magnetmail.key` |
| Privacy policy | https://metur100.github.io/Magnet.Mail/privacy.html |
| Website | https://metur100.github.io/Magnet.Mail |
| Contact email | certidevelopment@gmail.com |
| Target audience | 13–15, 16–17, 18+ |

## 1. Create app

*Home → Create app*

- **App name:** `Magnet Mail`
- **Default language:** English (United States) – en-US
- **App or game:** Game
- **Free or paid:** Free
- Accept the Developer Program Policies and US export laws declarations.

## 2. Store listing

*Grow users → Store presence → Main store listing*

**App name** (11/30)
```text
Magnet Mail
```

**Short description** (77/80)
```text
Deliver parcels with magnets! Pull, push and slingshot them into the mailbox.
```

**Full description** (1728/4000)
```text
Pull. Push. Deliver.

MAGNET MAIL is a physics puzzle game where you never touch the parcel. You control two magnets: hold the blue ATTRACT button to pull your parcel towards the blue magnet, tap the red REPEL button to push it away from the red one. Combine short impulses to launch it over walls, slingshot it around obstacles, bounce it between magnetic fields – and land it gently in the right mailbox.

30 LEVELS IN 6 WORLDS
• Local Neighborhood – learn the magnets with a light envelope
• City Streets – rooftops, narrow alleys and busy roads
• Railway District – heavy crates, elevators and speeding trains
• Industrial Zone – fragile glass, conveyor belts, gears and magnetic barriers
• Airport – bouncy parcels, luggage belts, jet streams and timed doors
• Space Station – low gravity, magnetic storms and wormhole teleporters

6 PARCELS WITH REAL PHYSICS
Light envelopes fly fast, heavy crates need strong fields, glass breaks on hard hits, bouncy packages spring off every wall and magnetic packages feel every field.

DELIVER IT PERFECTLY
• Fewer impulses, fewer bumps and more time left earn up to 3 stars
• Wrong mailboxes bounce your parcel back – read the address!
• Watch a replay of your route after every delivery
• Stuck? Retry with a free hint that shows a working route

MORE TO DO
• A new Daily Delivery every day with your personal records
• Collect 12 parcel designs and 6 mailboxes
• Interactive tutorial – learn by playing

MADE FOR EVERYONE
• Big one-handed controls and a left-handed layout
• Reduced-motion mode, sound and vibration options
• Short levels – perfect for quick breaks

FREE AND PRIVATE
• No ads, no in-app purchases
• No account, no tracking, no data collection
• Plays fully offline
```

**Release notes (“What’s new”)**
```text
<en-US>
First release – 30 levels, 6 worlds and a new Daily Delivery every day.
</en-US>
```

### Graphics

| Asset | File | Requirement |
| --- | --- | --- |
| App icon | `graphics/icon-512.png` | 512 × 512 PNG |
| Feature graphic | `graphics/feature-graphic.png` | 1024 × 500, no transparency |
| Phone screenshots | `screenshots/phone/` (8) | 1080 × 1920 |

Upload the screenshots in file-name order (01 … 08). Tablet screenshots are optional (portrait phone game); upload the phone screenshots there too if the Console asks.

## 3. Store settings

*Grow users → Store presence → Store settings*

- **App category:** Game → **Puzzle**
- **Tags** (up to 5): Puzzle, Physics, Casual, Offline, Single player
- **Email address:** certidevelopment@gmail.com
- **Website:** https://metur100.github.io/Magnet.Mail
- **Phone number:** leave empty (optional)
- **External marketing:** allowed (default)

## 4. App content (Policy → App content)

### Privacy policy
https://metur100.github.io/Magnet.Mail/privacy.html

### App access
**All functionality in my app is available without any access restrictions.** (No login, no account.)

### Ads
**No, my app does not contain ads.**

### Content rating
Start the IARC questionnaire:
- **Email:** certidevelopment@gmail.com
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
No declarations are needed. The Capacitor template only requests `INTERNET` (normal permission, granted at install – the game itself never goes online); vibration uses `VIBRATE` (normal) if you add the haptics plugin.

## 5. Release

1. *Setup → App signing:* keep **Google Play App Signing** (recommended). You upload the AAB signed with your upload key; Google manages the app signing key.
2. Personal developer accounts created after November 2023 must first run a **closed test** (currently at least 12 testers for 14 days) before publishing to production – the Console shows the exact requirement for your account. Start with **Testing → Internal testing** (add yourself), then **Closed testing**.
3. *Create new release* → upload the `.aab` → release name `1.0.0 (1)` → paste the release notes above.
4. *Production → Countries/regions:* add all countries.
5. Submit for review.

## 6. Build the release (from this PC)

The upload key already exists: `C:\Users\TurkesMedin\keystore\magnetmail` (alias `magnetmail.key`). Its password is in
`C:\Users\TurkesMedin\keystore\magnetmail-password.txt` and in `C:\Users\TurkesMedin\.gradle\gradle.properties`
(`MAGNET_MAIL_UPLOAD_*`, read by the Gradle build). Neither file is in the repository.

**Every release:**

```powershell
cd C:\Users\TurkesMedin\repos\Medin\Magnet.Mail
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
npm run android:bundle
# -> android\app\build\outputs\bundle\release\app-release.aab
```

For an update raise `version` in `package.json` (the version code is derived from it: 1.0.1 → 10001), then run `npm run android:setup` before `npm run android:bundle`.

**On a fresh clone or another PC** (`android/` is generated and not committed):

```powershell
npm install
npm run build
npx cap add android
npm run android:setup    # portrait, vibration, splash, launcher icons, version, signing
```

and copy the keystore plus the four `MAGNET_MAIL_UPLOAD_*` lines of `gradle.properties` to that PC.

**Back up the keystore file and its password** – with Play App Signing a lost upload key can be reset through Google support, but it takes time.
