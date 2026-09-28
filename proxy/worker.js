// HTTPS relay for radio streams that Alexa (or an HTTPS web page) can't play
// directly: plain http:// streams, and https:// streams on a non-standard port
// (Alexa only accepts HTTPS on port 443).
//
// Each such station in stations.json is served at
//   https://<worker host>/s/<station id>
// and the upstream audio is passed straight through. Stations already on
// https:443 get a 404, and nothing outside stations.json is relayed, so this
// isn't an open proxy.
import stations from '../stations.json';

function needsRelay(url) {
  const u = new URL(url);
  return u.protocol !== 'https:' || u.port !== '';
}

const RELAYED = new Map(stations.filter((s) => needsRelay(s.url)).map((s) => [String(s.id), s]));
const CORS = { 'access-control-allow-origin': '*' };

function text(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...CORS, ...extra } });
}

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (pathname === '/') {
      const list = [...RELAYED.values()].map((s) => `/s/${s.id}\t${s.name}`).join('\n');
      return text(`my-radio-stations relay\n\n${list}\n`);
    }

    const station = RELAYED.get(pathname.match(/^\/s\/(\d+)$/)?.[1] ?? '');
    if (!station) return text('Unknown station', 404);
    if (request.method !== 'GET' && request.method !== 'HEAD') return text('Method not allowed', 405, { allow: 'GET, HEAD' });

    let upstream;
    try {
      upstream = await fetch(station.url, {
        method: request.method,
        // Look like a media player: Shoutcast servers send an HTML status page
        // instead of audio to anything that says "Mozilla". No "Icy-MetaData: 1",
        // so the audio comes without song titles mixed in.
        headers: { 'user-agent': 'VLC/3.0.21 LibVLC/3.0.21', accept: '*/*' },
        redirect: 'follow',
      });
    } catch (err) {
      return text(`${station.name} is unreachable: ${err instanceof Error ? err.message : err}`, 502);
    }
    if (!upstream.ok || !upstream.body) {
      upstream.body?.cancel();
      return text(`${station.name} returned ${upstream.status}`, 502);
    }

    // Shoutcast labels AAC+ as "audio/aacp", which some players don't recognise.
    let type = upstream.headers.get('content-type') || 'audio/mpeg';
    if (/aacp/i.test(type)) type = 'audio/aac';

    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: 200,
      headers: { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...CORS },
    });
  },
};
