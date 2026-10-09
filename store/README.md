# Store material – Magnet Mail

| Store | Start here | Contents |
| --- | --- | --- |
| Google Play | [`play-store/PLAY-CONSOLE.md`](play-store/PLAY-CONSOLE.md) | every Console answer + Android build/signing steps · `listing/en-US/*.txt` · `graphics/` (icon 512, feature graphic) · `screenshots/phone/` (8 × 1080×1920) |
| App Store | [`app-store/APP-STORE-CONNECT.md`](app-store/APP-STORE-CONNECT.md) | every App Store Connect answer + Xcode steps · `metadata/en-US/*.txt` · `icon-1024.png` · `screenshots/iphone-6.9 / 6.5 / 6.3/` (8 each) |
| Website | [Magnet.Mail.Landing](https://github.com/metur100/Magnet.Mail.Landing) (separate repo) | landing page, support, privacy policy and terms – live at https://metur100.github.io/Magnet.Mail.Landing/ |

All texts live in `_tools/content.mjs`. After editing, run `node store/_tools/docs.mjs`. It checks the store length limits and regenerates both guides and the listing text files.

## Regenerating the images

```bash
npm run build
npx vite preview --port 4175                # keep running in another terminal
node store/_tools/capture.mjs               # real game screenshots → raw/phone (1080×1920), raw/tall (1320×2868)
node store/_tools/render.mjs                # captions + frames → all store images, icons, feature graphic
```

Captions are in `_tools/content.mjs` (`CAPTIONS`). The icon comes from `public/icon.svg`. Requires Microsoft Edge (headless renderer) and ffmpeg.
