import type HlsType from 'hls.js';
import { isHls, type Station } from './stations';

export type PlayerState = 'idle' | 'loading' | 'playing' | 'error';

export function describeMediaError(error: MediaError | null): string {
  switch (error?.code) {
    case MediaError.MEDIA_ERR_NETWORK:
      return 'Network error';
    case MediaError.MEDIA_ERR_DECODE:
      return 'Can’t decode this stream';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return 'Stream offline or format not supported';
    default:
      return 'Stream stopped unexpectedly';
  }
}

/**
 * One audio element for the whole app. Live radio has no useful "pause"
 * (resuming would play stale buffered audio), so stop() drops the stream and
 * play() always reconnects, the same way the Alexa skill restarts on resume.
 */
export class RadioPlayer {
  readonly audio = new Audio();
  station: Station | null = null;
  state: PlayerState = 'idle';
  error = '';
  onChange: () => void = () => {};

  private hls: HlsType | null = null;
  // Bumped on every play/stop so late callbacks from an older stream are ignored.
  private generation = 0;

  constructor() {
    this.audio.preload = 'none';
    this.audio.addEventListener('playing', () => this.set('playing'));
    this.audio.addEventListener('waiting', () => {
      if (this.state === 'playing') this.set('loading');
    });
    this.audio.addEventListener('pause', () => {
      // Paused from outside the app (headphones unplugged, OS media controls).
      if (this.state === 'playing') this.stop();
    });
    this.audio.addEventListener('error', () => {
      if (this.state === 'loading' || this.state === 'playing') this.fail(describeMediaError(this.audio.error));
    });
  }

  get volume(): number {
    return this.audio.volume;
  }

  set volume(value: number) {
    this.audio.volume = Math.min(1, Math.max(0, value));
  }

  async play(station: Station): Promise<void> {
    const generation = ++this.generation;
    this.teardown();
    this.station = station;
    this.error = '';
    this.set('loading');

    try {
      if (isHls(station.url) && !this.audio.canPlayType('application/vnd.apple.mpegurl')) {
        // The light build skips subtitles/DRM, which radio doesn't need. Same API.
        const { default: Hls } = await import('hls.js/light');
        if (generation !== this.generation) return;
        if (!Hls.isSupported()) throw new Error('This browser can’t play HLS streams');
        const hls = new Hls();
        this.hls = hls;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && generation === this.generation) this.fail(`Stream error (${data.details})`);
        });
        hls.loadSource(station.url);
        hls.attachMedia(this.audio);
      } else {
        this.audio.src = station.url;
      }
      await this.audio.play();
    } catch (err) {
      if (generation !== this.generation || this.state === 'error') return;
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'AbortError') return; // superseded by another play()/stop()
      if (name === 'NotAllowedError') this.fail('Browser blocked autoplay – press play');
      else if (name === 'NotSupportedError') this.fail(describeMediaError(this.audio.error ?? null));
      else this.fail(err instanceof Error ? err.message : String(err));
    }
  }

  stop(): void {
    this.generation++;
    this.teardown();
    this.set('idle');
  }

  toggle(): void {
    if (this.state === 'playing' || this.state === 'loading') this.stop();
    else if (this.station) void this.play(this.station);
  }

  private teardown(): void {
    this.hls?.destroy();
    this.hls = null;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }

  private fail(message: string): void {
    this.error = message;
    this.teardown();
    this.set('error');
  }

  private set(state: PlayerState): void {
    this.state = state;
    this.onChange();
  }
}

export type ProbeResult = 'ok' | 'fail' | 'timeout' | 'skipped';

/**
 * Checks whether a stream starts loading, without playing it out loud.
 * HLS streams need hls.js outside Safari, so they're only checked where native.
 */
export function probeStream(url: string, timeoutMs = 12000): Promise<ProbeResult> {
  const audio = new Audio();
  if (isHls(url) && !audio.canPlayType('application/vnd.apple.mpegurl')) return Promise.resolve('skipped');

  return new Promise((resolve) => {
    const finish = (result: ProbeResult) => {
      clearTimeout(timer);
      audio.removeAttribute('src');
      audio.load();
      resolve(result);
    };
    const timer = setTimeout(() => finish('timeout'), timeoutMs);
    audio.muted = true;
    audio.preload = 'auto';
    audio.addEventListener('loadeddata', () => finish('ok'), { once: true });
    audio.addEventListener('error', () => finish('fail'), { once: true });
    audio.src = url;
    audio.load();
  });
}
