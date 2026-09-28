# Handoff: my-radio-stations

Where things stand after the Claude Code session of 2026-09-27, so you can continue in VS Code.

## What this repo is

Your 25 Romanian radio stations, in two forms that share one station list and one `logos/` folder:

1. **Web player**: a static site for GitHub Pages at `https://szauka.github.io/my-radio-stations/`. It's just for you, with no backend.
2. **Alexa skill** ("Alexa, open my radio") on the Echo Show, in `alexa-skill/`. It's the same code you run in the Alexa developer console, copied in unchanged.

## Status

| | |
|---|---|
| Branch | `claude/upbeat-cannon-w1wpu5` |
| Commits | `4d833f1` web player + Alexa files, then this handoff commit |
| Pushed to GitHub? | **No.** The push failed with 403 because Claude had no GitHub access to the repo. Get the code from the bundle (below). |
| Tests | 9/9 pass (`npm test`) |
| Build | passes (`npm run build`) |
| Tested in a browser | Headless Chromium at desktop and phone sizes, with a fake stream. **No real station has been played yet** (the sandbox network blocked the radio servers). |

## Getting the code into VS Code

You'll have downloaded `my-radio-stations.bundle` from the chat (a git bundle holds the branch and its history).

If you already have the repo cloned:

```sh
cd my-radio-stations
git fetch /path/to/my-radio-stations.bundle claude/upbeat-cannon-w1wpu5:claude/upbeat-cannon-w1wpu5
git checkout claude/upbeat-cannon-w1wpu5
git push -u origin claude/upbeat-cannon-w1wpu5
```

If you don't have it cloned yet:

```sh
git clone -b claude/upbeat-cannon-w1wpu5 /path/to/my-radio-stations.bundle my-radio-stations
cd my-radio-stations
git remote set-url origin https://github.com/Szauka/my-radio-stations.git
git push -u origin claude/upbeat-cannon-w1wpu5
```

Then:

```sh
npm install
npm run dev     # opens http://localhost:5173/my-radio-stations/
```

Requires Node 20+ (built with Node 22).

## Files

| Path | What it does |
|---|---|
| `stations.json` | Station list for the web player: `id`, `name`, `url`, `aliases`, optional `logo` (file name in `logos/`) and `note` (known issue shown on the card) |
| `alexa-skill/index.js` | Alexa skill Lambda code (paste into the console's Code tab) |
| `alexa-skill/interaction-model.json` | Alexa interaction model (paste into Build → JSON Editor) |
| `alexa-skill/README.md` | Alexa setup, routines and troubleshooting notes |
| `logos/` | Station logos (`kiss-fm.png`, 512×512) and Echo Show backgrounds (`kiss-fm-bg.png`, 1024×640). Both the web player and Alexa load them via `https://cdn.jsdelivr.net/gh/Szauka/my-radio-stations@main/logos/` |
| `proxy/` | Cloudflare Worker that re-serves `http://` and non-443 streams over HTTPS for Alexa and the web player. Setup in `proxy/README.md` |
| `scripts/make-art.mjs` | Draws the logos and backgrounds and renders them to PNG with headless Chrome (macOS) |
| `src/stations.ts` | Loads `stations.json`, plus helpers (logo URL, wrap-around index, HLS detection, placeholder initials/colour) |
| `src/player.ts` | `RadioPlayer`: one `<audio>` element; play/stop/toggle; error messages; loads `hls.js/light` only for `.m3u8` URLs |
| `src/main.ts` | UI: station grid, player bar, keyboard shortcuts, Media Session (lock screen/media keys), remembers last station + volume in localStorage |
| `src/style.css` | Styles; dark by default, light when the OS is light; under 560px wide, a one-column list with big text and tap targets |
| `src/hls-light.d.ts` | Type declaration so `hls.js/light` uses hls.js's types |
| `index.html`, `public/` | Page shell, icon, web app manifest (add to home screen) |
| `test/stations.test.ts` | Unit tests. **Also fails if `stations.json`, `alexa-skill/index.js` and `interaction-model.json` disagree on ids/names/URLs** |
| `vite.config.ts` | `base: '/my-radio-stations/'` for GitHub Pages; Vitest config |
| `.github/workflows/deploy.yml` | On push to `main`: test → build → deploy to Pages. On PRs: test + build only |

Scripts: `npm run dev`, `npm test`, `npm run typecheck`, `npm run build`, `npm run preview`.

## Design decisions (and why)

- **Stop, not pause.** Pausing live radio and resuming plays stale buffered audio, so stop drops the stream and play reconnects. The Alexa skill does the same on resume.
- **No framework.** 14 buttons and a player bar don't need React; the whole app is about 10 kB.
- **HTTPS relay for the rest.** GitHub Pages is HTTPS, so browsers block `http://` audio, and Alexa only plays HTTPS on port 443. `stations.json` keeps each station's real URL, and anything that doesn't qualify plays through the Cloudflare Worker in `proxy/`.
- **No "now playing" song titles yet.** Browsers can't read the ICY metadata inside a stream (CORS), so it would need a small proxy server.
- **Last station is preselected but not autoplayed.** Browsers block autoplay without a tap.

## To do, in order

1. **Push the branch** (see above), open a PR into `main`, merge it.
2. **Turn on Pages:** repo Settings → Pages → Build and deployment → Source: **GitHub Actions**. The first deploy runs on the next push to `main` (or run the workflow manually from the Actions tab).
3. **Check the real streams:** open the site (or `npm run dev`) and play a few. Note which fail.
4. ~~**Fix Zu:**~~ Done: it now uses the live HLS stream `https://live7digi.antenaplay.ro/radiozu/radiozu-48000.m3u8`.
5. ~~**Deploy the HTTPS relay**~~ Done: it runs at `https://my-radio-relay.szaukad.workers.dev`, deployed from the Cloudflare dashboard. After changing stations, run `npm run build:relay` and paste `proxy/worker.dashboard.js` into the dashboard editor again.
5a. **National FM** was offline on 28 Sep 2026 on both known addresses. Find a new link or remove it.
5b. **Banat Timișoara** doesn't answer Cloudflare's servers and has no HTTPS stream, so it can't play through the relay. It needs a different host for the relay, or a new link.
6. ~~**Add logos:**~~ Done: every station has a logo and an Echo Show background in `logos/`, drawn by `scripts/make-art.mjs`. They appear once they're on `main` (jsDelivr caches `@main` for up to 7 days). Re-paste `alexa-skill/index.js` into the Alexa console to use them there.
7. **One source of truth (later):** add a small script (e.g. `scripts/build-alexa.mjs`) that generates the Alexa `STATIONS` array and the `STATION_NAME` values from `stations.json`, so you edit one file instead of three. Synonyms would need to move into `stations.json` (e.g. a `synonyms` field).
8. **Nice to have:** favourites/reordering, sleep timer, "now playing" via a proxy.

## Adding or changing a station today

Edit all three and run `npm test` to confirm they match:

1. `stations.json`
2. `STATIONS` in `alexa-skill/index.js`
3. the `STATION_NAME` values in `alexa-skill/interaction-model.json` (same `id`, plus spoken synonyms)

Then re-paste the two Alexa files into the Alexa console (Code → Deploy; Build → Save → Build Skill). If the new station isn't HTTPS on port 443, also run `npx wrangler deploy` in `proxy/` so the relay picks it up. For a logo, add the station to `scripts/make-art.mjs` and run it.

## Continuing with Claude in VS Code

Open the folder in VS Code with the Claude Code extension and start with something like:
> Read HANDOFF.md and README.md, then help me with step 3 of the to-do list.
