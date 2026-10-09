/** Single source for every store text. Run `node store/_tools/docs.mjs` after editing. */

export const CONTACT = {
  name: 'Medin Turkes',
  /** Support contact (shown publicly on Google Play). */
  email: 'certidevelopment@gmail.com',
  /** Website = separate repo metur100/Magnet.Mail.Landing (GitHub Pages). Privacy policy = `${site}/privacy.html`. */
  site: 'https://metur100.github.io/Magnet.Mail.Landing',
};

export const APP = {
  name: 'Magnet Mail',
  androidPackage: 'com.certidevelopment.magnetmail',
  iosBundleId: 'com.certidevelopment.magnetmail',
  sku: 'MAGNETMAIL001',
  version: '1.0.0',
  copyright: `2026 ${CONTACT.name}`,
};

export const PLAY = {
  title: 'Magnet Mail',
  short: 'Deliver parcels with magnets! Pull, push and slingshot them into the mailbox.',
  full: `Pull. Push. Deliver.

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
• Plays fully offline`,
  releaseNotes: 'First release – 30 levels, 6 worlds and a new Daily Delivery every day.',
};

export const IOS = {
  name: 'Magnet Mail',
  subtitle: 'Physics puzzle with magnets',
  promo: 'Pull with blue, push with red: guide parcels past trains, gears and wormholes into the right mailbox. 30 levels, a Daily Delivery – free, no ads, offline.',
  keywords: 'magnet,physics,puzzle,parcel,delivery,mail,brain,logic,casual,offline,daily,trains,space',
  description: PLAY.full,
  releaseNotes: PLAY.releaseNotes,
  reviewNotes: `No account or login is needed; everything works offline. The app has no ads, no in-app purchases, no analytics and no tracking.

How to play: hold the blue ATTRACT button to pull the parcel towards the blue magnet, tap the red REPEL button to push it away from the red magnet. Guide the parcel into the yellow-glowing mailbox. The first level is solved by holding ATTRACT for about one second and releasing.`,
};

/** Screenshot captions (title, subtitle) in screenshot order. */
export const CAPTIONS = [
  ['Deliver with magnets', 'Pull with blue. Push with red.'],
  ['Beat the trains', 'Time every crossing'],
  ['Handle with care', 'Fragile glass &amp; spinning gears'],
  ['Slingshot through space', 'Storms, low gravity &amp; wormholes'],
  ['Land it gently', 'Perfect delivery = 3 stars'],
  ['30 levels · 6 worlds', 'Streets, trains, factories &amp; more'],
  ['Collect them all', '12 parcels &amp; 6 mailboxes'],
  ['A new delivery every day', 'Free · No ads · Offline'],
];
