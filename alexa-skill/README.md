# My Radio – Alexa skill for Echo Show

Private Alexa skill that streams 14 Romanian internet radio stations on your Echo Show.

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

Stream requirements: HTTPS, valid certificate, ideally the standard port 443. These may fail and need replacement links:

- **Zu:** the URL is a single HLS segment, not the live stream. Find the `.m3u8` or a direct stream (radio-browser.info).
- **Non-standard ports:** West City (:8000), Digi FM (:84), Realitatea (:8001), Doza Colinde (:8146), Play Colinde (:9292).

Check **Code → CloudWatch Logs** for "Playback failed" when a station stays silent.

## Station art

Currently all stations use one Google-hosted radio icon:
`https://fonts.gstatic.com/s/e/notoemoji/latest/1f4fb/512.png`

Other icons are at the same address, with `1f4fb` replaced: `1f3a7` headphones, `1f3b6` music notes, `1f3b5` music note, `1f399` studio microphone.

To use your own logos (PNG/JPG, ~512×512, public HTTPS), the easiest place is this repo: put them in a `logos/` folder at the repo root, push, and make sure the repo is **public**. `index.js` already has `ART_BASE` pointing there:
`https://cdn.jsdelivr.net/gh/Szauka/my-radio-stations@main/logos/`

Other hosting options:

- **GitHub** (public repo): `https://cdn.jsdelivr.net/gh/USER/REPO@main/logos/kiss.png`
- **Vercel:** put files in `public/logos/` → `https://your-project.vercel.app/logos/kiss.png`

```js
const ART_BASE = 'https://cdn.jsdelivr.net/gh/USER/REPO@main/logos/';
{ id: 4, name: 'Kiss FM', url: '...', aliases: ['kiss'], art: ART_BASE + 'kiss.png' },
```

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
