import './style.css';
import { RadioPlayer } from './player';
import { hueFor, initials, logoUrl, STATIONS, wrapIndex, type Station } from './stations';

const LAST_STATION_KEY = 'my-radio:last-station';
const VOLUME_KEY = 'my-radio:volume';

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: remembering is optional.
  }
}

function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const list = $<HTMLUListElement>('stations');
const nowLogo = $('now-logo');
const nowName = $('now-name');
const nowStatus = $('now-status');
const toggleButton = $<HTMLButtonElement>('toggle');
const iconPlay = document.getElementById('icon-play')!;
const iconStop = document.getElementById('icon-stop')!;
const volume = $<HTMLInputElement>('volume');

const player = new RadioPlayer();

function renderLogo(el: HTMLElement, station: Station | null): void {
  el.replaceChildren();
  el.style.removeProperty('--hue');
  if (!station) return;
  const src = logoUrl(station);
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    el.append(img);
  } else {
    el.textContent = initials(station.name);
    el.style.setProperty('--hue', String(hueFor(station.name)));
  }
}

function renderList(): void {
  list.replaceChildren(
    ...STATIONS.map((station) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card';
      button.dataset.id = String(station.id);

      const logo = document.createElement('div');
      logo.className = 'logo';
      logo.setAttribute('aria-hidden', 'true');
      renderLogo(logo, station);

      const text = document.createElement('span');
      text.className = 'card-text';
      const name = document.createElement('span');
      name.className = 'card-name';
      name.textContent = station.name;
      text.append(name);
      if (station.note) {
        // Shown as text rather than a tooltip: phones have no hover.
        button.title = station.note;
        const note = document.createElement('span');
        note.className = 'card-note';
        note.textContent = station.note;
        text.append(note);
      }

      button.append(logo, text);

      button.addEventListener('click', () => {
        if (player.station?.id === station.id && player.state !== 'idle' && player.state !== 'error') player.stop();
        else void player.play(station);
      });
      li.append(button);
      return li;
    }),
  );
  renderActive();
}

function renderActive(): void {
  for (const card of list.querySelectorAll<HTMLButtonElement>('.card')) {
    const active = player.station?.id === Number(card.dataset.id);
    card.classList.toggle('active', active);
    card.dataset.state = active ? player.state : '';
    card.setAttribute('aria-pressed', String(active && player.state !== 'idle' && player.state !== 'error'));
  }
}

const STATUS_TEXT = {
  idle: 'Stopped',
  loading: 'Connecting…',
  playing: 'Live',
} as const;

function renderPlayer(): void {
  const { station, state } = player;
  renderLogo(nowLogo, station);
  nowName.textContent = station ? station.name : 'Pick a station';
  nowStatus.textContent = !station ? '' : state === 'error' ? player.error : STATUS_TEXT[state];
  nowStatus.title = nowStatus.textContent;
  nowStatus.classList.toggle('error', state === 'error');

  const running = state === 'playing' || state === 'loading';
  // SVG elements have no .hidden property, so toggle the attribute.
  iconPlay.toggleAttribute('hidden', running);
  iconStop.toggleAttribute('hidden', !running);
  toggleButton.setAttribute('aria-label', running ? 'Stop' : 'Play');
  toggleButton.disabled = !station;
  document.title = station && running ? `${station.name} – My Radio` : 'My Radio';

  renderActive();
  updateMediaSession();
}

function step(delta: number): void {
  const current = player.station ? STATIONS.findIndex((s) => s.id === player.station!.id) : -1;
  const index = current < 0 ? (delta > 0 ? 0 : STATIONS.length - 1) : wrapIndex(current + delta, STATIONS.length);
  void player.play(STATIONS[index]);
}

function updateMediaSession(): void {
  if (!('mediaSession' in navigator)) return;
  const { station, state } = player;
  if (station) {
    const src = logoUrl(station);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: 'Live radio',
      album: 'My Radio',
      artwork: src ? [{ src, sizes: '512x512' }] : [],
    });
  }
  navigator.mediaSession.playbackState = state === 'playing' || state === 'loading' ? 'playing' : 'paused';
}

function setupMediaSession(): void {
  if (!('mediaSession' in navigator)) return;
  const actions: [MediaSessionAction, () => void][] = [
    ['play', () => player.station && void player.play(player.station)],
    ['pause', () => player.stop()],
    ['stop', () => player.stop()],
    ['nexttrack', () => step(1)],
    ['previoustrack', () => step(-1)],
  ];
  for (const [action, handler] of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Action not supported by this browser.
    }
  }
}

// Wiring
player.onChange = () => {
  renderPlayer();
  if (player.station) save(LAST_STATION_KEY, String(player.station.id));
};

toggleButton.addEventListener('click', () => player.toggle());
$('prev').addEventListener('click', () => step(-1));
$('next').addEventListener('click', () => step(1));

const savedVolume = Number(load(VOLUME_KEY) ?? '0.8');
player.volume = Number.isFinite(savedVolume) ? savedVolume : 0.8;
volume.value = String(player.volume);
volume.addEventListener('input', () => {
  player.volume = Number(volume.value);
  save(VOLUME_KEY, volume.value);
});

document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (target.closest('input, textarea, select')) return;
  if (event.key === ' ' && !target.closest('button')) {
    event.preventDefault();
    player.toggle();
  } else if (event.key === 'ArrowRight' || event.key === 'n') {
    step(1);
  } else if (event.key === 'ArrowLeft' || event.key === 'p') {
    step(-1);
  }
});

// Preselect the last station; browsers block autoplay, so don't start it.
const lastId = Number(load(LAST_STATION_KEY));
player.station = STATIONS.find((s) => s.id === lastId) ?? null;

setupMediaSession();
renderList();
renderPlayer();
