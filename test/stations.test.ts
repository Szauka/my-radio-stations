import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hueFor, initials, isHls, logoUrl, needsRelayForAlexa, RELAY_BASE, STATIONS, streamUrl, wrapIndex } from '../src/stations';

const alexaIndex = readFileSync(new URL('../alexa-skill/index.js', import.meta.url), 'utf8');
const alexaModel = JSON.parse(readFileSync(new URL('../alexa-skill/interaction-model.json', import.meta.url), 'utf8'));
const slotValues: { id: string; name: { value: string } }[] =
  alexaModel.interactionModel.languageModel.types.find((t: { name: string }) => t.name === 'STATION_NAME').values;

describe('stations.json', () => {
  it('has unique ids and names', () => {
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
    expect(new Set(STATIONS.map((s) => s.name)).size).toBe(STATIONS.length);
  });

  it('uses http or https stream URLs', () => {
    for (const s of STATIONS) expect(['http:', 'https:'], s.name).toContain(new URL(s.url).protocol);
  });
});

describe('HTTPS relay', () => {
  it('has an up-to-date dashboard copy (run npm run build:relay)', async () => {
    // @ts-expect-error plain JS build script
    const { buildDashboardWorker } = await import('../scripts/build-relay.mjs');
    const current = readFileSync(new URL('../proxy/worker.dashboard.js', import.meta.url), 'utf8');
    expect(current).toBe(buildDashboardWorker());
  });

  const byName = (name: string) => STATIONS.find((s) => s.name === name)!;

  it('sends only plain http streams through the relay in the browser', () => {
    expect(streamUrl(byName('Kiss FM'))).toBe(byName('Kiss FM').url);
    expect(streamUrl(byName('Europa FM'))).toBe(byName('Europa FM').url);
    expect(streamUrl(byName('Radio Popular'))).toBe(`${RELAY_BASE}/s/${byName('Radio Popular').id}`);
    for (const s of STATIONS) expect(streamUrl(s).startsWith('https://'), s.name).toBe(true);
  });

  it('relays http and non-443 https streams for Alexa', () => {
    expect(needsRelayForAlexa('https://live.kissfm.ro/kissfm.aacp')).toBe(false);
    expect(needsRelayForAlexa('https://astreaming.edi.ro:8443/EuropaFM_aac')).toBe(true);
    expect(needsRelayForAlexa('http://radiomilos.ro:8803/stream')).toBe(true);
  });

  it('uses the same relay address and rule in the Alexa skill', () => {
    expect(alexaIndex.match(/const RELAY_BASE = '([^']+)'/)![1]).toBe(RELAY_BASE);
    expect(alexaIndex).toContain("u.protocol === 'https:' && !u.port ? station.url : `${RELAY_BASE}/s/${station.id}`");
  });
});

describe('stays in sync with the Alexa skill', () => {
  it('matches the STATION_NAME slot values by id and name', () => {
    const fromModel = slotValues.map((v) => ({ id: Number(v.id), name: v.name.value }));
    expect(STATIONS.map(({ id, name }) => ({ id, name }))).toEqual(fromModel);
  });

  it('matches the STATIONS list in alexa-skill/index.js', () => {
    const entries = [...alexaIndex.matchAll(/\{\s*id:\s*(\d+),\s*name:\s*'([^']+)',\s*url:\s*'([^']+)'/g)].map(
      ([, id, name, url]) => ({ id: Number(id), name, url }),
    );
    expect(STATIONS.map(({ id, name, url }) => ({ id, name, url }))).toEqual(entries);
  });
});

describe('station artwork', () => {
  const logoFile = (name: string) => new URL(`../logos/${name}`, import.meta.url);
  const alexaArt = [...alexaIndex.matchAll(/\{\s*id:\s*(\d+),.*?art: ART_BASE \+ '([^']+)', bg: ART_BASE \+ '([^']+)'/g)].map(
    ([, id, art, bg]) => ({ id: Number(id), art, bg }),
  );

  it('gives every station a logo that exists in logos/', () => {
    for (const s of STATIONS) {
      expect(s.logo, s.name).toBeDefined();
      expect(existsSync(logoFile(s.logo!)), s.logo).toBe(true);
    }
  });

  it('uses the same logo and a matching background in the Alexa skill', () => {
    expect(alexaArt.map(({ id, art }) => ({ id, art }))).toEqual(STATIONS.map(({ id, logo }) => ({ id, art: logo })));
    for (const { art, bg } of alexaArt) {
      expect(bg).toBe(art.replace(/\.png$/, '-bg.png'));
      expect(existsSync(logoFile(bg)), bg).toBe(true);
    }
  });
});

describe('helpers', () => {
  it('wraps next/previous around the list', () => {
    expect(wrapIndex(14, 14)).toBe(0);
    expect(wrapIndex(-1, 14)).toBe(13);
    expect(wrapIndex(5, 14)).toBe(5);
  });

  it('detects HLS playlists', () => {
    expect(isHls('https://x.ro/live/playlist.m3u8')).toBe(true);
    expect(isHls('https://x.ro/live/playlist.m3u8?token=1')).toBe(true);
    expect(isHls('https://x.ro/radiozu/seg48000-1.aac')).toBe(false);
    expect(isHls('https://x.ro/stream')).toBe(false);
  });

  it('builds initials for placeholder logos', () => {
    expect(initials('Kiss FM')).toBe('KF');
    expect(initials('Zu')).toBe('ZU');
    expect(initials('Reper')).toBe('RE');
  });

  it('gives each station a stable hue', () => {
    expect(hueFor('Kiss FM')).toBe(hueFor('Kiss FM'));
    expect(hueFor('Kiss FM')).toBeGreaterThanOrEqual(0);
    expect(hueFor('Kiss FM')).toBeLessThan(360);
  });

  it('points logos at the same CDN folder as the Alexa skill', () => {
    const base = alexaIndex.match(/const ART_BASE = '([^']+)'/)![1];
    expect(logoUrl({ ...STATIONS[0], logo: 'kiss.png' })).toBe(base + 'kiss.png');
    expect(logoUrl({ ...STATIONS[0], logo: undefined })).toBeUndefined();
  });
});
