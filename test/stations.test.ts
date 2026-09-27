import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hueFor, initials, isHls, logoUrl, STATIONS, wrapIndex } from '../src/stations';

const alexaIndex = readFileSync(new URL('../alexa-skill/index.js', import.meta.url), 'utf8');
const alexaModel = JSON.parse(readFileSync(new URL('../alexa-skill/interaction-model.json', import.meta.url), 'utf8'));
const slotValues: { id: string; name: { value: string } }[] =
  alexaModel.interactionModel.languageModel.types.find((t: { name: string }) => t.name === 'STATION_NAME').values;

describe('stations.json', () => {
  it('has unique ids and names', () => {
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
    expect(new Set(STATIONS.map((s) => s.name)).size).toBe(STATIONS.length);
  });

  it('uses only https stream URLs (browsers block http on GitHub Pages, and so does Alexa)', () => {
    for (const s of STATIONS) expect(new URL(s.url).protocol, s.name).toBe('https:');
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
