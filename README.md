# my-radio-stations

My favourite Romanian internet radio stations, in two places:

- **Web player**: a small website on GitHub Pages: https://szauka.github.io/my-radio-stations/
- **Alexa skill**: "Alexa, open my radio" on the Echo Show. See [`alexa-skill/`](alexa-skill/README.md).

Both use the same 14 stations and the same `logos/` folder.

## Repo layout

| Path | What it is |
|---|---|
| `stations.json` | Station list for the web player (same ids as the Alexa skill) |
| `alexa-skill/` | Alexa skill code, interaction model and setup notes |
| `logos/` | Station logos (PNG/JPG ~512×512), served via jsDelivr to both the web player and Alexa |
| `src/`, `index.html`, `public/` | Web player (Vite + TypeScript, no framework) |
| `test/` | Unit tests, including a check that `stations.json` matches the Alexa skill |

## Web player

- Tap a station to play it, tap again (or the stop button) to stop.
- Previous / next wrap around the list, like "Alexa, next".
- Keyboard: <kbd>Space</kbd> play/stop, <kbd>←</kbd>/<kbd>→</kbd> (or <kbd>p</kbd>/<kbd>n</kbd>) previous/next.
- Lock-screen and media-key controls work (Media Session API).
- Remembers the last station and the volume.
- **Check streams** tries to connect to every station and marks the ones that don't work.
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

Stream URLs must be `https://`: GitHub Pages is HTTPS, so browsers block plain
`http://` streams, and Alexa rejects them too.

## Known stream issues

- **Zu**: the URL is a single HLS segment, not the live stream, so it needs a replacement link (e.g. from radio-browser.info). The web player can play `.m3u8` HLS streams.
- **Non-standard ports** (West City :8000, Digi FM :84, Realitatea :8001, Doza Colinde :8146, Play Colinde :9292) are fine in browsers but may fail on Alexa.

## Plan

- [x] **1. Setup**: Vite + TypeScript, tests, GitHub Pages deploy
- [x] **2. Play stations**: station grid, player bar, next/previous, error messages, stream checker, Media Session, remembers last station
- [ ] **3. Fix streams**: replace Zu, re-check the others with **Check streams**, add logos to `logos/`
- [ ] **4. One source of truth**: generate the Alexa `STATIONS` list and interaction model from `stations.json` instead of editing three files
- [ ] **5. Nice to have**: favourites/reordering, sleep timer, "now playing" song titles (needs a small proxy, since browsers can't read stream metadata directly)
