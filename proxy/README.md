# HTTPS relay

Alexa only plays streams served over HTTPS, with a trusted certificate, on port 443. The web player on GitHub Pages can't play plain `http://` audio either. Many Romanian stations only offer `http://`, or HTTPS on a port like 8000 or 8443.

This folder is a small [Cloudflare Worker](https://developers.cloudflare.com/workers/) that fixes that. It serves each of those stations at

```
https://my-radio-relay.<your-subdomain>.workers.dev/s/<station id>
```

and passes the station's audio straight through. It has no configuration of its own: it reads `stations.json` when it's deployed, and relays every station that isn't already HTTPS on port 443. Anything else gets a 404, so it can't be used as an open proxy. Cloudflare's free plan covers it: 100,000 requests a day, and one listening session is one request.

## Which stations use it

| Player | Plays directly | Goes through the relay |
|---|---|---|
| Alexa | `https://` on port 443 | `http://`, and `https://` on any other port |
| Web player | any `https://` | `http://` only |

The rule lives in `streamUrl()` in `alexa-skill/index.js` and in `src/stations.ts`. Open the relay's home page to see the stations it serves.

## Deploy it (once)

1. Create a free Cloudflare account at https://dash.cloudflare.com/sign-up.
2. From the repo root:

   ```sh
   cd proxy
   npx wrangler login      # opens the browser to authorise
   npx wrangler deploy
   ```

   The first deploy asks you to pick a `workers.dev` subdomain. It then prints the address, e.g. `https://my-radio-relay.szauka.workers.dev`.
3. Put that address in **both** places (`npm test` checks they match):
   - `RELAY_BASE` in `src/stations.ts`
   - `RELAY_BASE` in `alexa-skill/index.js`
4. Check a station in the browser, e.g. `https://my-radio-relay.<your-subdomain>.workers.dev/s/2`. It should start playing Radio Miloș.
5. Commit and push, then re-paste `alexa-skill/index.js` into the Alexa console (Code → Deploy).

## Or deploy it from the Cloudflare dashboard (no Wrangler)

The dashboard editor takes a single file, so use `worker.dashboard.js`. It's `worker.js` with the station list pasted in.

1. Sign in at https://dash.cloudflare.com and open **Workers & Pages**. If asked, pick your `workers.dev` subdomain.
2. **Create** → **Create Worker** (the "Hello World" starter). Name it `my-radio-relay` and click **Deploy**.
3. Click **Edit code**. Delete everything in the editor, paste in the whole of `proxy/worker.dashboard.js`, and click **Deploy**.
4. The worker's address is shown at the top, e.g. `https://my-radio-relay.szauka.workers.dev`. Continue from step 3 of the section above.

## After changing stations

The relay has its own copy of the station list, so update it after adding a station or changing a URL:

- **Wrangler:** run `npx wrangler deploy` in this folder again.
- **Dashboard:** run `npm run build:relay`, then paste the new `worker.dashboard.js` into the editor and deploy. `npm test` fails if you forget to rebuild the file.

## Try it locally

```sh
cd proxy
npx wrangler dev          # http://127.0.0.1:8787/s/2
```

This runs Cloudflare's own Worker runtime on your machine, without an account.

## If a station doesn't play through the relay

- Open `/s/<id>` in a browser. A text reply such as "returned 404" or "is unreachable" means the station itself is down or has moved. Find a new link on https://www.radio-browser.info and update `stations.json`.
- Cloudflare may refuse to connect to some unusual ports or bare IP addresses. If a station works locally with `wrangler dev` but not once deployed, that's the likely cause. The fix is to run the same code somewhere else, such as `deno serve worker.js` on Deno Deploy, which uses the same `fetch` handler format.

## Keep it personal

The relay re-serves other people's broadcasts. It's meant for your own listening, so don't advertise it as a public radio service.
