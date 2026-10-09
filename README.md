# Magnet Mail

A mobile-first physics puzzle game: deliver parcels through compact obstacle courses using nothing but **magnetic force**. You never drag the parcel. Instead you:

- press **ATTRACT** (blue) to pull it towards the blue horseshoe magnet
- press **REPEL** (red) to push it away from the red one

Taps give short impulses; holds give continuous force.

The goal is the moment where the parcel launches, slingshots around a wall, bounces between fields and lands gently in the yellow mailbox.

Made by **Medin Turkes**. Built with TypeScript, Vite and Phaser 3, with a custom deterministic physics engine. There is no backend and there are no network calls. All graphics and sounds are generated in code.

---

## Run it

Requires **Node.js 20+** (tested with Node 22) and npm.

```bash
npm install          # install dependencies (once)
npm run dev          # dev server → http://localhost:5173 (also reachable from a phone on the same Wi-Fi)
npm run build        # type-check + production build → dist/
npm run preview      # serve dist/ → http://localhost:4173
npm run test         # unit tests (Vitest)
npm run lint         # ESLint
```

Quality tools:

```bash
npm run solve:levels                          # beam-search solver proves every level, daily and tutorial step can be completed
npm run smoke -- http://localhost:5173/       # browser smoke test (dev server running; needs Edge or Chrome)
npm run smoke -- "http://localhost:4173/?debug"   # same against the production build
```

The smoke test uses real pointer events and covers:

- tutorial steps, delivering level 1 with ATTRACT, and the success screen
- REPEL, pause, in-game settings, left-handed mode and restart
- moving obstacles, a failure and the hint route
- reload persistence, every settings toggle, both collections, world and level select, and the daily challenge
- loading all 30 levels and a confirmed reset
- 320 px, 360 px and desktop layouts

It fails on any console error or on any request to another host. It also clicks slightly off-centre, to catch misaligned hit areas.

## Controls

| Input | Action |
| --- | --- |
| Blue **ATTRACT** button (tap or hold) | Pull the parcel towards the blue magnet |
| Red **REPEL** button (tap or hold) | Push the parcel away from the red magnet |
| `A` / `←` / `Z` | ATTRACT (hold the key) |
| `D` / `→` / `X` | REPEL (hold the key) |
| `R` | Restart |
| `P` / `Esc` | Pause |
| `Tab`, arrows, `Enter` / `Space` | Navigate menus |

The level clock starts with your first press, so you can study the course first. Both buttons can be held at once (multi-touch). Left-handed mode swaps the buttons and moves pause and restart to the other side.

## Game content

- **30 levels in 6 worlds**, each introducing a new parcel type and new hazards:

  | World | Parcel | Introduces |
  | --- | --- | --- |
  | 1 Local Neighborhood | Envelope (light, fast) | attract, repel, walls, ledges |
  | 2 City Streets | Standard box | cars, rooftops, narrow alleys, wrong mailboxes |
  | 3 Railway District | Heavy crate | trains, railway gates, elevators, impulse limits |
  | 4 Industrial Zone | Fragile glass | conveyor belts, rotating machinery, magnetic barriers, bumpers, collision limits |
  | 5 Airport | Bouncy package | luggage belts, airflow zones, sliding gates, timed doors, energy limits, multiple routes |
  | 6 Space Station | Magnetic package | low gravity, heavy-gravity zones, floating asteroids, magnetic storms, teleporters |

- **Interactive tutorial:** five tiny real levels covering attract, repel, avoiding obstacles, delivering gently, and using fewer impulses.
- **Daily delivery:**
  - The date seeds a campaign layout, sometimes mirrored, with a different parcel type and tweaked mass, bounce and gravity.
  - It can be replayed all day. Your best score, attempts and streak are saved, along with a personal record table.
- **Collections:**
  - 12 parcel designs: envelopes, food, gifts, sci-fi, holiday and rare magnetic.
  - 6 mailboxes: red mailbox, city, train station, industrial, airport locker and space port.
  - Each item shows its rarity, category, unlock condition, a preview and whether it is selected.
- **Results:**
  - The success screen plays a replay of your route, a mailbox animation, stars and a score breakdown, and shows your best score.
  - The failure screen gives the exact reason, Retry, Exit and a free **Retry with a hint**. The solver plans a route from the start and draws it with blue and red press markers.

## How it works

### Physics (`src/game/physics/`)

- **Fixed step.** A custom deterministic engine runs at a fixed 120 Hz.
- **Parcel state.** The parcel is a circle with:
  - position, velocity and rotation
  - mass, friction, air resistance and restitution
  - a maximum speed
  - collision count, damage and delivery state
- **Colliders.** Obstacles are oriented boxes, circles and capsules.
- **No hidden state.** Everything that moves is a pure function of time, so a `SimState` snapshot is the entire world. The hint solver relies on this.
- **Magnetic force** (`MagneticField.ts`):

  ```
  acceleration = BASE · fieldStrength · controlLevel · susceptibility · falloff(d) / mass
  falloff(d)   = 1 / (1 + (d / 420)²)        (no singularity, half strength at 420 px)
  ```

  It is capped at 2800 px/s², and the parcel's speed is capped per parcel type.
- **Controls:**
  - A tap starts a 0.22 s pulse with a 1.35× impulse multiplier.
  - Holding grows the force by up to 30 % and stops after 2.5 s.
  - Releasing decays the force over 0.12 s.
  - Each press counts as one impulse. Optional impulse limits and energy budgets apply per level.
- **Magnets snap and catch.** Within 100 px an active attractor damps the parcel so it snaps to the magnet. Touching a magnet never counts as a collision.
- **Fail conditions:**
  - spikes
  - falling out of the course
  - a train or car hit
  - too many collisions
  - breaking from impact damage (fragile glass)
  - a wrong mailbox (when the level says so)
  - running out of time, impulses or energy while stuck
- **Mailboxes:**
  - Delivery requires the parcel inside the correct mailbox, slower than 170 px/s, for 0.35 s.
  - Wrong mailboxes spring the parcel back out and cost 80 points.

### Score (`src/game/gameplay/Scoring.ts`)

```
delivery   = 0.6 + 0.4 · timeLeft/timeLimit                      × 40 %
impulses   = 1 − min(max(0, impulses − par) / (par + 2), 1)      × 25 %
collisions = (1 − min(collisions / 8, 1)) · (1 − damage / 200)   × 20 %
time       = timeLeft / timeLimit                                × 15 %
score      = round(1000 · Σ) − 80 · wrong mailboxes
```

**Stars:**

- ★ delivered
- ★★ delivered, and impulses ≤ par + 2 or collisions ≤ 2
- ★★★ delivered with impulses ≤ par, collisions ≤ 3, no wrong mailbox and at least 30 % of the time left

`par` is the solver's minimum impulse count plus one.

### Levels (`src/game/levels/`)

Levels are typed data (`LevelDefinition.ts` and `ObstacleDefinitions.ts`):

- parcel type, start, attractor and repeller positions, and magnet strength
- gravity, mailbox and decoy mailboxes
- obstacles, time limit, impulse limit, energy and collision limit
- par, magnetic storm, tutorial text, required stars and theme

To add a level, add a data object to `LevelData.ts`, then run `npm run solve:levels` to prove it can be beaten. No gameplay code changes are needed.

### Progression and saves (`src/game/progression/`)

- **Unlocks:**
  - A level opens when the previous one is delivered.
  - A world opens when the previous world is finished and you have enough total stars (0 / 4 / 10 / 17 / 24 / 31).
- **Saved data:** completed levels, stars, best scores, best impulse counts, unlocked worlds, parcels and mailboxes, selected cosmetics, settings and daily records.
- **Versioning:** the save is versioned in `localStorage` (`magnet-mail/save`). Old versions are migrated step by step and every field is sanitised. Corrupted JSON is kept as `….corrupt` and the game starts fresh.
- **Reset:** reset progress asks for confirmation and keeps your settings.

### Accessibility

- **Controls:**
  - Large one-handed controls, with a left-handed layout.
  - Full keyboard support with visible focus rings.
- **Not colour alone:** every colour cue also has a shape or text:
  - magnets have + / − badges and the buttons have arrow icons
  - wrong mailboxes show an ✕, and level tiles show completion ticks
  - spikes are drawn as teeth, and switches say ON / OFF
- **Comfort:**
  - Reduced-motion mode, which defaults to on if the OS asks for less motion.
  - The game pauses when the browser loses focus.
- **Screen and screen readers:**
  - Safe-area insets for notches; portrait layout.
  - Screen-reader announcements through an `aria-live` region.

### Audio and haptics

- **Audio:** everything is Web Audio synthesis:
  - a magnetic hum (blue = low and warm, red = buzzy) that follows the live field strength
  - attract and repel pulses, collision thuds and bumper boings
  - warnings, the mailbox opening, delivery chimes (a longer one for three stars) and failure tones
  - generative music

  Sound and music have separate toggles.
- **Haptics:** vibration for activating a magnet, collisions, damage and danger, deliveries and three stars. You can plug in a native backend with `Haptics.setBackend()`.
- **Fallback:** the game is fully playable with audio and vibration off.

### Performance

- The physics runs at a fixed step with no allocations inside the loop.
- Effects are pooled, and obstacles are drawn with a few `Graphics` objects.
- The render scale follows the device pixel ratio, capped at 2× (1.5× on weaker devices). A frame-time governor switches slow devices to lighter effects.
- The simulation pauses when the tab is hidden. Scenes release their textures and listeners when they shut down.

### Monetisation hooks (not active)

`src/game/monetization/MonetizationManager.ts` defines `AdProvider` and `PurchaseProvider` interfaces with integration points for:

- a rewarded hint
- remove ads
- cosmetic parcel and mailbox packs
- a bonus daily delivery

The default providers report "not available". Hints are free, and progression never depends on purchases.

## Project structure

```
src/
  main.ts                     entry: fonts, CSS, Phaser game
  styles/global.css
  game/
    GameConfig.ts             Phaser config and scene list
    GameContext.ts            device profile, save data, settings
    scenes/                   Boot, Loading, Menu, Tutorial, WorldSelect, LevelSelect,
                              Gameplay, Result, Collection, Settings (+ BaseScene)
    physics/                  ParcelBody, MagneticField, PhysicsWorld, CollisionSystem
    gameplay/                 LevelRunner, Scoring, Solver (hint planner), MagnetDemo
    levels/                   LevelDefinition, ObstacleDefinitions, LevelData, LevelManager, TutorialData
    progression/              SaveManager, ProgressionManager, DailyChallenge, Cosmetics
    entities/                 Parcel, Mailbox, Magnet, StaticObstacle, MovingObstacle, Train, Elevator
    rendering/                ArenaView, Scenery, Textures, FxPool
    ui/                       Button, ControlPad, ProgressBar, StarRating, Modal, Toggle,
                              SettingsPanel, FocusManager, Icons, Logo, Draw, Typography
    audio/AudioManager.ts
    monetization/MonetizationManager.ts
    utils/                    Constants, MathUtils, DeviceUtils, Haptics, TestHooks
tests/                        Vitest unit tests
scripts/solve-levels.ts       level solver report
scripts/smoke.mjs             Playwright smoke test
```

## Android (Capacitor)

The web build is ready to be wrapped with [Capacitor](https://capacitorjs.com/):

- Asset paths are relative.
- The game runs fully offline.
- It is portrait only.
- `capacitor.config.json` is included, with app ID `com.certidevelopment.magnetmail` and `webDir: dist`.

Store listings, screenshots, graphics and step-by-step Play Console / App Store Connect guides are in [`store/`](store/README.md).

Prerequisites: Android Studio (with an SDK and platform tools) and JDK 17+.

**1. Install dependencies and build the web version**

```bash
npm install
npm run build
```

**2. Add Capacitor**

```bash
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
```

**3. Create the Android project**

```bash
npx cap add android
npx cap sync android
```

Lock the activity to portrait in `android/app/src/main/AndroidManifest.xml` by adding `android:screenOrientation="portrait"` to the `<activity>`.

Optional, for native vibration: run `npm install @capacitor/haptics` and call `Haptics.setBackend(...)` at start-up.

**4. Run on an Android device**

1. Enable *Developer options → USB debugging* on the phone and connect it.
2. Run:

```bash
npx cap run android          # choose the device
# or: npx cap open android   # then press Run in Android Studio
```

After code changes, run `npm run build && npx cap sync android`.

**5. Create a release build**

Create an upload keystore once and keep it and its passwords safe:

```bash
keytool -genkey -v -keystore magnet-mail-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias magnetmail
```

Then build a signed Android App Bundle for Google Play:

```bash
npm run build && npx cap sync android
npx cap build android --androidreleasetype AAB \
  --keystorepath ../magnet-mail-upload.jks --keystorealias magnetmail \
  --keystorepass <store-password> --keystorealiaspass <key-password>
```

Alternatively, use Android Studio → *Build → Generate Signed Bundle / APK*. The bundle ends up in `android/app/build/outputs/bundle/release/`.

Before each upload, raise `versionCode` and `versionName` in `android/app/build.gradle`.

## Credits

- Game design, code and art: **Medin Turkes**. All graphics and sounds are procedural.
- Engine: [Phaser 3](https://phaser.io) (MIT).
- Font: [Fredoka](https://fonts.google.com/specimen/Fredoka) via Fontsource (SIL Open Font License), bundled for offline use.
