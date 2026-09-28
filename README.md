# my-radio-stations

My favourite Romanian internet radio stations, in two places:

- **Web player**: a small website on GitHub Pages: https://szauka.github.io/my-radio-stations/
- **Alexa skill**: "Alexa, open my radio" on the Echo Show. See [`alexa-skill/`](alexa-skill/README.md).

Both use the same 25 stations and the same `logos/` folder.

## Repo layout

| Path | What it is |
|---|---|
| `stations.json` | Station list for the web player (same ids as the Alexa skill) |
| `alexa-skill/` | Alexa skill code, interaction model and setup notes |
| `logos/` | Station logos (512×512) and Echo Show backgrounds (1024×640), served via jsDelivr to both the web player and Alexa |
| `proxy/` | HTTPS relay (Cloudflare Worker) for streams that are `http://` or on a non-standard port. See [`proxy/README.md`](proxy/README.md) |
| `scripts/` | `make-art.mjs` draws the logos; `build-relay.mjs` builds the relay's dashboard copy |
| `src/`, `index.html`, `public/` | Web player (Vite + TypeScript, no framework) |
| `test/` | Unit tests, including a check that `stations.json` matches the Alexa skill |

## Web player

- Tap a station to play it, tap again (or the stop button) to stop.
- Previous / next wrap around the list, like "Alexa, next".
- Keyboard: <kbd>Space</kbd> play/stop, <kbd>←</kbd>/<kbd>→</kbd> (or <kbd>p</kbd>/<kbd>n</kbd>) previous/next.
- Lock-screen and media-key controls work (Media Session API).
- Remembers the last station and the volume.
- On a phone, stations are a one-column list with big text and tap targets.
- Can be added to the phone home screen (web app manifest).

### Run it locally

```sh
npm install
npm run dev       # http://localhost:5173/my-radio-stations/
npm test          # unit tests
npm run build     # production build into dist/
```

### Deploying

Every push to `main` runs the tests, builds, and deploys to GitHub Pages
(`.github/workflows/deploy.yml`). One-time setup: repo **Settings → Pages →
Build and deployment → Source: GitHub Actions**.

## Adding or changing a station

Keep the three lists in sync (the tests fail if they drift apart):

1. `stations.json`: `id`, `name`, `url`, `aliases`, and optionally `logo` (file name in `logos/`) and `note` (known issue shown on the card).
2. `alexa-skill/index.js`: the `STATIONS` list.
3. `alexa-skill/interaction-model.json`: a `STATION_NAME` value with the same `id` and spoken synonyms.

Each station keeps its real stream URL, even if it's `http://` or on another
port. Browsers on the HTTPS site can't play `http://` audio, and Alexa only
plays HTTPS on port 443, so those stations play through the relay in `proxy/`.
After changing stations, update the relay too (see `proxy/README.md`). For a
logo, add the station to `scripts/make-art.mjs` and run it.

## Known stream issues

- **National FM** was offline when checked on 28 Sep 2026 and needs a new link.
- **Banat Timișoara** doesn't answer the Cloudflare relay and has no HTTPS stream, so it doesn't play on the site or on Alexa.
- On Alexa, a station that fails to play is skipped to the next one.

## Plan

- [x] **1. Setup**: Vite + TypeScript, tests, GitHub Pages deploy
- [x] **2. Play stations**: station grid, player bar, next/previous, error messages, Media Session, remembers last station
- [x] **3. Fix streams**: 25 stations, HTTPS relay, fixed Zu, logos and Echo Show backgrounds
- [ ] **4. One source of truth**: generate the Alexa `STATIONS` list and interaction model from `stations.json` instead of editing three files
- [ ] **5. Nice to have**: favourites/reordering, sleep timer, "now playing" song titles (needs a small proxy, since browsers can't read stream metadata directly)
