import raw from '../stations.json';

export interface Station {
  /** Same id as the Alexa skill's STATIONS list and STATION_NAME slot values. */
  id: number;
  name: string;
  url: string;
  aliases: string[];
  /** Optional file name inside the repo's logos/ folder, e.g. "kiss.png". */
  logo?: string;
  /** Optional known issue, shown on the station card. */
  note?: string;
}

export const STATIONS: Station[] = raw;

// Same CDN path the Alexa skill uses for ART_BASE, so one logos/ folder serves both.
export const LOGO_BASE = 'https://cdn.jsdelivr.net/gh/Szauka/my-radio-stations@main/logos/';

export function logoUrl(station: Station): string | undefined {
  return station.logo ? LOGO_BASE + station.logo : undefined;
}

// The HTTPS relay in proxy/ (a Cloudflare Worker). Same value as RELAY_BASE in
// alexa-skill/index.js.
export const RELAY_BASE = 'https://my-radio-relay.szaukad.workers.dev';

/** Alexa only plays HTTPS on the standard port; everything else goes via the relay. */
export function needsRelayForAlexa(url: string): boolean {
  const u = new URL(url);
  return u.protocol !== 'https:' || u.port !== '';
}

/** Browsers play HTTPS on any port, so only plain http:// goes via the relay here. */
export function streamUrl(station: Station): string {
  return new URL(station.url).protocol === 'https:' ? station.url : `${RELAY_BASE}/s/${station.id}`;
}

/** Wraps next/previous around the ends of the list, like the Alexa skill. */
export function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function isHls(url: string): boolean {
  return /\.m3u8(\?|#|$)/i.test(url);
}

export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Stable hue per station so each placeholder logo keeps its colour. */
export function hueFor(name: string): number {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 360;
}
