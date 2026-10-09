# Magnet Mail – App Store Connect

Everything needed to publish **Magnet Mail** on the App Store, in the order App Store Connect asks for it.
Files referenced below are in this folder (`store/app-store/`).

| | |
| --- | --- |
| Bundle ID | `com.certidevelopment.magnetmail` |
| SKU | `MAGNETMAIL001` |
| Version | 1.0.0 (build 1) |
| Primary language | English (U.S.) |
| Price | Free (all countries) |
| Contact / support email | certidevelopment@gmail.com |
| Privacy Policy URL | https://metur100.github.io/Magnet.Mail/privacy.html |
| Support / Marketing URL | https://metur100.github.io/Magnet.Mail |

## 1. Build and upload (needs a Mac)

Magnet Mail is wrapped with Capacitor. Unlike the Expo games, **the iOS build has to be made with Xcode on a Mac**
(your own, a borrowed one, or a rented cloud Mac such as MacinCloud; a CI service with macOS runners – Codemagic, GitHub Actions – also works).
Prerequisites: Xcode 16+, Node.js 20+, an Apple Developer Program membership.

```bash
git clone https://github.com/metur100/Magnet.Mail.git && cd Magnet.Mail
npm install
npm install @capacitor/core @capacitor/ios
npm install -D @capacitor/cli
npm run build
npx cap add ios
npx cap open ios
```

In Xcode (target **App**):
- *General:* Display Name `Magnet Mail`, Bundle Identifier `com.certidevelopment.magnetmail`, Version `1.0.0`, Build `1`;
  *Supported Destinations:* iPhone only (remove iPad); *Deployment Info → iPhone Orientation:* **Portrait** only.
- *Signing & Capabilities:* tick *Automatically manage signing* and choose your team.
- *Info:* add `ITSAppUsesNonExemptEncryption` = **NO** (skips the export-compliance question).
- *Assets → AppIcon:* drop in `store/app-store/icon-1024.png` (single-size icon).
- *Product → Archive → Distribute App → App Store Connect → Upload.*

Create the app record first if it does not exist: *Apps → + → New App*, platform iOS, name `Magnet Mail`, bundle ID `com.certidevelopment.magnetmail`, SKU `MAGNETMAIL001`, full access.
After Apple has processed the build (5–30 minutes) it appears under **TestFlight**.

## 2. App Information (General → App Information)

**Name** (11/30)
```text
Magnet Mail
```

**Subtitle** (27/30)
```text
Physics puzzle with magnets
```

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

- **Privacy Policy URL:** https://metur100.github.io/Magnet.Mail/privacy.html
- **Data Collection → Get Started:** **“No, we do not collect data from this app.”** → Publish.
  The App Store then shows **“Data Not Collected”**.

## 5. Version 1.0.0 (iOS App → 1.0.0 Prepare for Submission)

### Screenshots

| Device size | Folder | Size | Count |
| --- | --- | --- | --- |
| iPhone 6.9" Display (required) | `screenshots/iphone-6.9/` | 1320 × 2868 | 8 |
| iPhone 6.5" Display (only if asked) | `screenshots/iphone-6.5/` | 1284 × 2778 | 8 |
| iPhone 6.3" Display (optional) | `screenshots/iphone-6.3/` | 1206 × 2622 | 8 |

Drag the files in name order (01 … 08). iPad screenshots are **not** needed when the build is iPhone-only (see step 1).

### Texts

**Promotional text** (154/170)
```text
Pull with blue, push with red: guide parcels past trains, gears and wormholes into the right mailbox. 30 levels, a Daily Delivery – free, no ads, offline.
```

**Keywords (comma-separated, no spaces)** (88/100)
```text
magnet,physics,puzzle,parcel,delivery,mail,brain,logic,casual,offline,daily,trains,space
```

**Description** (1728/4000)
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

- **Support URL:** https://metur100.github.io/Magnet.Mail · **Marketing URL:** https://metur100.github.io/Magnet.Mail
- **Version:** 1.0.0
- **Copyright:** `2026 Medin Turkes`
- **Build:** choose the build uploaded from Xcode (+ Add Build).
- **App Review Information:**
  - Sign-in required: **No**
  - Contact: Medin Turkes, certidevelopment@gmail.com, phone: **your phone number** (required by Apple, not shown publicly)
  - Notes:
```text
No account or login is needed; everything works offline. The app has no ads, no in-app purchases, no analytics and no tracking.

How to play: hold the blue ATTRACT button to pull the parcel towards the blue magnet, tap the red REPEL button to push it away from the red magnet. Guide the parcel into the yellow-glowing mailbox. The first level is solved by holding ATTRACT for about one second and releasing.
```
- **Version Release:** “Manually release this version” (recommended for the first release).

Then **Add for Review → Submit to App Review**.

### What’s New (for later updates)
```text
First release – 30 levels, 6 worlds and a new Daily Delivery every day.
```
