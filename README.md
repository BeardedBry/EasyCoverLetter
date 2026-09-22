# EasyCoverLetter

Phone-friendly **installable PWA** (static shell + service worker) plus a desktop **Chrome MV3 extension** that grabs the job description from the current page (and remembers the previous grab).

After you **build once**, open the site **once** over `localhost`/HTTPS, and **Add to Home Screen**, the home-screen app opens from the service worker cache — **no Mac `npm run dev` server required**. Generating a letter still needs internet (calls OpenAI from the device with your saved API key).

Put your **OpenAI API key** and **resume** in **Settings** once. Both stay on this device (`localStorage` / `chrome.storage.local`) and are never committed.

### Open Settings

- **Web / PWA:** **Settings** (top-right), or `http://127.0.0.1:4317/?settings=1` on first load.
- **Chrome extension:** side panel → **Settings**.

Main compose flow: job description (paste, **Fetch JD** from URL, or extension grab) + optional prompt + length/tone.

### Job URL → description (no AI)

Heuristics only (ATS selectors, “About the job” headings, main/article text). No LLM scrape.

| Surface | How it works |
| --- | --- |
| **Chrome extension** | **Fetch from URL** opens the link in a background tab, runs the content-script extractor, fills the JD field, then closes the tab. Also: **Grab** on the active tab / **Use previous page**. |
| **Web / PWA** | **Fetch JD** tries a browser `fetch` + HTML parse. Most job boards block this (CORS). On failure you’ll get a short message — use the extension, open+Grab, or paste text. |

Tap/click the generated letter body to copy (plus the Copy button).



## Offline-capable PWA (recommended)

```bash
cd web
npm install
npm run build          # static export + Workbox precache SW → web/out
npm run serve:pwa      # serve out/ once at http://127.0.0.1:4317
```

1. Open [http://127.0.0.1:4317](http://127.0.0.1:4317) in Chrome/Safari and wait for the page to load (registers the service worker + precaches the shell).
2. Fill **Settings** (API key + resume) while online.
3. **Install:**
   - Desktop Chrome: install icon in the address bar, or menu → **Install EastCoverLetter…**
   - iPhone Safari: Share → **Add to Home Screen**
   - Android Chrome: **Install app** / **Add to Home screen**
4. You can quit `serve:pwa` / stop the Mac server. Re-open the home-screen / installed app — the UI loads from cache.
5. **Generate** still requires internet (OpenAI). Offline you can still open the app, edit JD/prompt, and copy prior letters from the session.

### Rebuild / re-install (after code changes or origin change)

1. `cd …/web && npm run build && npm run serve:pwa`
2. Open the same origin once so the new SW activates (hard-refresh if needed: Chrome DevTools → Application → Service Workers → Update).
3. If the URL/origin changed, remove the old home-screen icon and **Add to Home Screen** again.
4. Settings (key + resume) stay in that browser’s storage for the same origin.

> **Phone from Mac LAN:** serve once on the Mac, open `http://<mac-lan-ip>:4317` from the phone (not the phone’s own `127.0.0.1`), install, then the phone no longer needs the Mac for the shell. Generating still needs internet.

> **Mobile note:** Page-reading extensions are limited on mobile browsers. Use the **desktop extension** to grab JDs; use the **PWA** on your phone to compose/generate.

## Dev mode (optional)

```bash
cd web
npm run dev    # hot reload; generation is already client-side (OpenAI)
```

Dev does not ship the production Workbox SW. Prefer `build` + `serve:pwa` for install/offline testing.

## Load the Chrome extension (desktop)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** → **Load unpacked**
3. Select: `/extension`
4. Toolbar icon opens the **side panel** (grab JD / fetch URL / previous / Settings / generate via OpenAI).

The extension talks to OpenAI directly — no local web server required. After updating the extension folder, click **Reload** on `chrome://extensions`.

## Secrets

- Never put API keys in committed `.env` files.
- Paste key + resume only in **Settings**.
- `.gitignore` excludes `.env*` and common secret filenames.

## Scripts

```bash
cd web
npm run build       # next static export + generate Workbox sw.js into out/
npm run serve:pwa   # http://127.0.0.1:4317 from out/ (one-time / update installs)
npm run dev         # Next dev server (optional)
```
