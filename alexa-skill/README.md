# My Radio – Alexa skill for Echo Show

Private Alexa skill that streams 25 Romanian internet radio stations on your Echo Show.

- **Skill name:** My Radio
- **Invocation name:** `my radio`
- **Locale:** English (UK) — the Echo Show language must match
- **Hosting:** Alexa-hosted (Node.js), EU (Ireland)
- **Console:** https://developer.amazon.com/alexa/console/ask

## Files

| File | Where it goes in the console |
|---|---|
| `index.js` | **Code** tab → `lambda/index.js` → Save → Deploy |
| `interaction-model.json` | **Build** → Interaction Model → JSON Editor → Save → Build Skill |

**Build → Interfaces → Audio Player** must be switched on (Save Interfaces).

## Stations

Edit the `STATIONS` list at the top of `index.js`. Every station's `id` must match an `id` in the `STATION_NAME` type in `interaction-model.json`, and the synonyms there are what Alexa recognises by voice.

Alexa only plays HTTPS streams with a valid certificate on the standard port 443. Each station keeps its real stream URL, even when it's `http://` or uses another port. `streamUrl()` sends those stations to the HTTPS relay in `proxy/` instead, at `RELAY_BASE + '/s/' + id`. Deploy the relay and set `RELAY_BASE` first (see `proxy/README.md`). Until then, 16 of the 25 stations won't play on Alexa.

National FM was offline when checked on 28 Sep 2026 and may need a new link.

If a station fails to play, the skill silently skips to the next one. After three failures in a row it stops, so a network outage doesn't cycle through every station. **Code → CloudWatch Logs** shows "Playback failed for …" and "Skipping to …" for each skip.

## Station art

Every station has its own logo (512×512) and Echo Show background (1024×640) in the repo's `logos/` folder, for example `kiss-fm.png` and `kiss-fm-bg.png`. `index.js` loads them through jsDelivr, so the repo must be **public** and the files must be on `main`:
`https://cdn.jsdelivr.net/gh/Szauka/my-radio-stations@main/logos/`

```js
{ id: 4, name: 'Kiss FM', url: '...', aliases: ['kiss'], art: ART_BASE + 'kiss-fm.png', bg: ART_BASE + 'kiss-fm-bg.png' },
```

The images are drawn by `scripts/make-art.mjs` (colours, symbol and wording per station). Change a station there and run `node scripts/make-art.mjs kiss-fm` on a Mac with Google Chrome to redraw it. jsDelivr caches `@main` for up to 7 days, so changed images can take a while to show.

A station without `art` falls back to Google's radio emoji (`GENERIC_RADIO_ART`). `BACKGROUND` is a fallback for stations without `bg`.

## Using it on the Echo Show

- "Alexa, open my radio"
- "Alexa, ask my radio to play Kiss FM"
- While playing: "Alexa, next" / "previous" / "stop", or the on-screen buttons

A private skill can't be set as the default music or radio service. Because "my radio" sounds like a normal radio request, Alexa may send it to TuneIn instead. A more distinctive invocation name (e.g. "romanian stations") avoids this.

## Routines (short commands)

Alexa app → **More → Routines → +**

1. **Name:** Kiss FM
2. **When this happens → Voice:** `kiss fm`
3. **Add action → Customised:** `ask my radio to play Kiss FM`
4. **From:** your Echo Show (not "the device you speak to")
5. **Save**, wait a minute, say "Alexa, Kiss FM"

If TuneIn still answers, try the action `open my radio and play Kiss FM`, or use **Add action → Skills → Your Skills → My Radio** (opens the skill, then you name the station).

| You say "Alexa, …" | Customised action |
|---|---|
| kiss fm | ask my radio to play Kiss FM |
| magic fm | ask my radio to play Magic FM |
| radio zu | ask my radio to play Zu |
| digi fm | ask my radio to play Digi FM |
| digi 24 | ask my radio to play Digi 24 |
| realitatea | ask my radio to play Realitatea |
| west city | ask my radio to play West City |
| etno vest | ask my radio to play Etno Vest |
| disco mix | ask my radio to play Disco Mix |
| christmas carols | ask my radio to play Doza Colinde |
| start my radio | open my radio |

## Troubleshooting

- **Skill doesn't respond on the Echo Show:** check the Alexa app → More → Skills & Games → Your Skills → **Dev** tab lists My Radio (same Amazon account), and that the Echo Show language is English (United Kingdom).
- **Wrong service answers:** Alexa app → Settings → Alexa Privacy → Review Voice History shows what was heard and who answered.
- **Simulator works but device is silent:** the simulator doesn't play audio; check CloudWatch Logs.
