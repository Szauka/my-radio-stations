// Draws a logo (512x512) and an Echo Show background (1024x640) for every
// station, then renders them to PNG in logos/ with headless Chrome.
//
//   node scripts/make-art.mjs            # all stations
//   node scripts/make-art.mjs kiss-fm    # just one
//
// macOS only as written: it uses Google Chrome and the Futura system font.
// Set CHROME=/path/to/chrome to use another Chromium browser.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('../logos/', import.meta.url).pathname;

// Motifs are drawn in the logo's 512x512 space, centred on (256, 196) and
// kept inside roughly x 171-341, y 111-281.
const sparkle = (cx, cy, r, fill) =>
  `<path d="M${cx},${cy - r} Q${cx},${cy} ${cx + r},${cy} Q${cx},${cy} ${cx},${cy + r} Q${cx},${cy} ${cx - r},${cy} Q${cx},${cy} ${cx},${cy - r}Z" fill="${fill}"/>`;

const MOTIFS = {
  magic: (c) =>
    sparkle(256, 196, 92, c.accent) + sparkle(326, 128, 26, c.fg) + sparkle(190, 262, 16, c.fg),

  pin: (c) => `
    <path d="M256,286 C222,242 184,212 184,178 A72,72 0 1 1 328,178 C328,212 290,242 256,286Z" fill="${c.accent}"/>
    <circle cx="256" cy="176" r="30" fill="${c.bg}"/>
    <circle cx="256" cy="176" r="12" fill="${c.fg}"/>`,

  bolt: (c) => `
    <path d="M276,106 L196,212 L248,212 L230,286 L318,170 L264,170 Z" fill="${c.accent}" stroke="${c.accent}" stroke-width="8" stroke-linejoin="round"/>`,

  heart: (c) => `
    <path d="M256,282 C168,222 166,140 219,130 C241,126 252,140 256,154 C260,140 271,126 293,130 C346,140 344,222 256,282Z" fill="${c.accent}"/>
    <path d="M178,206 h40 l14,-30 l22,62 l18,-46 l12,14 h58" fill="none" stroke="${c.bg}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`,

  skyline: (c) => `
    <circle cx="256" cy="212" r="70" fill="${c.accent}"/>
    <g fill="${c.fg}">
      <rect x="174" y="226" width="26" height="58"/>
      <rect x="204" y="180" width="30" height="104"/>
      <rect x="238" y="206" width="22" height="78"/>
      <rect x="264" y="160" width="32" height="124"/>
      <rect x="300" y="214" width="20" height="70"/>
      <rect x="324" y="238" width="16" height="46"/>
    </g>
    <rect x="160" y="282" width="192" height="6" rx="3" fill="${c.fg}"/>`,

  bars: (c) =>
    [60, 104, 150, 86, 132, 72, 44]
      .map((h, i) => {
        const x = 170 + i * 26;
        return `<rect x="${x}" y="${282 - h}" width="16" height="${h}" rx="8" fill="${i % 2 ? c.fg : c.accent}"/>`;
      })
      .join(''),

  embroidery: (c) => `
    <path d="M256,106 L346,196 L256,286 L166,196Z" fill="none" stroke="${c.fg}" stroke-width="12" stroke-linejoin="miter"/>
    <path d="M256,146 L306,196 L256,246 L206,196Z" fill="${c.accent}"/>
    <path d="M256,176 L276,196 L256,216 L236,196Z" fill="${c.bg}"/>
    <g fill="${c.fg}">
      <path d="M256,78 l10,10 l-10,10 l-10,-10Z"/>
      <path d="M136,196 l10,-10 l10,10 l-10,10Z"/>
      <path d="M356,196 l10,-10 l10,10 l-10,10Z"/>
    </g>`,

  broadcast: (c) => `
    <circle cx="256" cy="196" r="24" fill="${c.accent}"/>
    <g fill="none" stroke="${c.fg}" stroke-width="12" stroke-linecap="round">
      <path d="M218,158 A54,54 0 0 0 218,234"/>
      <path d="M294,158 A54,54 0 0 1 294,234"/>
      <path d="M190,130 A94,94 0 0 0 190,262"/>
      <path d="M322,130 A94,94 0 0 1 322,262"/>
    </g>`,

  clock: (c) => {
    const ticks = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      const r1 = i % 6 === 0 ? 62 : 70;
      const p = (r) => `${(256 + r * Math.sin(a)).toFixed(1)},${(196 - r * Math.cos(a)).toFixed(1)}`;
      return `<line x1="${p(r1).split(',')[0]}" y1="${p(r1).split(',')[1]}" x2="${p(80).split(',')[0]}" y2="${p(80).split(',')[1]}"/>`;
    }).join('');
    return `
    <g stroke="${c.fg}" stroke-width="5" stroke-linecap="round">${ticks}</g>
    <path d="M256,104 A92,92 0 1 1 164,196" fill="none" stroke="${c.accent}" stroke-width="10" stroke-linecap="round"/>
    <text x="256" y="216" text-anchor="middle" font-family="Futura" font-weight="700" font-size="56" fill="${c.accent}">24</text>`;
  },

  snowflake: (c) => {
    const arm = `<path d="M256,196 V112 M256,140 l-20,-20 M256,140 l20,-20 M256,168 l-16,-14 M256,168 l16,-14"/>`;
    const arms = [0, 60, 120, 180, 240, 300].map((d) => `<g transform="rotate(${d} 256 196)">${arm}</g>`).join('');
    return `<g fill="none" stroke="${c.fg}" stroke-width="10" stroke-linecap="round">${arms}</g>
      <circle cx="256" cy="196" r="14" fill="${c.accent}"/>`;
  },

  play: (c) => `
    <path d="M224,132 Q214,126 214,138 V254 Q214,266 224,260 L318,204 Q328,196 318,188 Z" fill="${c.fg}" stroke="${c.fg}" stroke-width="12" stroke-linejoin="round"/>` +
    sparkle(188, 136, 20, c.accent) + sparkle(334, 118, 14, c.accent) + sparkle(340, 268, 18, c.accent),

  mountains: (c) => `
    <path d="M150,286 L222,176 L256,222 L296,158 L362,286Z" fill="${c.mid}"/>
    <path d="M222,176 L242,207 L232,214 L222,203 L211,215 L202,207Z" fill="${c.fg}"/>
    <path d="M296,158 L320,195 L308,203 L296,190 L284,204 L272,195Z" fill="${c.fg}"/>` +
    sparkle(206, 120, 30, c.accent),

  crown: (c) => `
    <path d="M178,262 L166,142 L218,194 L256,118 L294,194 L346,142 L334,262Z" fill="${c.accent}" stroke="${c.accent}" stroke-width="10" stroke-linejoin="round"/>
    <rect x="176" y="270" width="160" height="16" rx="8" fill="${c.fg}"/>
    <circle cx="166" cy="136" r="12" fill="${c.fg}"/>
    <circle cx="256" cy="110" r="12" fill="${c.fg}"/>
    <circle cx="346" cy="136" r="12" fill="${c.fg}"/>
    <circle cx="256" cy="226" r="14" fill="${c.bg}"/>`,

  discoball: (c) => {
    const tiles = [];
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 8; col++) {
        const pick = (row * 7 + col * 3) % 9;
        const fill = pick === 0 ? c.accent : pick === 4 ? c.accent2 : pick % 2 ? '#d9d4ee' : '#a9a2c9';
        tiles.push(`<rect x="${186 + col * 18}" y="${140 + row * 18}" width="16" height="16" fill="${fill}"/>`);
      }
    return `
    <line x1="256" y1="96" x2="256" y2="126" stroke="${c.fg}" stroke-width="4"/>
    <clipPath id="ball"><circle cx="256" cy="210" r="70"/></clipPath>
    <circle cx="256" cy="210" r="70" fill="${c.bg}"/>
    <g clip-path="url(#ball)">${tiles.join('')}</g>` +
      sparkle(338, 150, 18, c.accent2) + sparkle(172, 270, 14, c.accent);
  },

  notes: (c) => `
    <g fill="${c.accent}">
      <ellipse cx="192" cy="256" rx="30" ry="22" transform="rotate(-20 192 256)"/>
      <ellipse cx="300" cy="236" rx="30" ry="22" transform="rotate(-20 300 236)"/>
    </g>
    <g fill="${c.fg}">
      <rect x="208" y="128" width="14" height="128"/>
      <rect x="316" y="108" width="14" height="128"/>
      <path d="M208,128 L330,108 L330,136 L208,156Z"/>
    </g>`,

  wheat: (c) => {
    const grains = [0, 1, 2, 3]
      .map((i) => {
        const y = 150 + i * 32;
        return `<ellipse cx="236" cy="${y}" rx="12" ry="24" transform="rotate(-35 236 ${y})"/>
          <ellipse cx="276" cy="${y}" rx="12" ry="24" transform="rotate(35 276 ${y})"/>`;
      })
      .join('');
    return `<line x1="256" y1="130" x2="256" y2="288" stroke="${c.fg}" stroke-width="8" stroke-linecap="round"/>
      <g fill="${c.accent}">${grains}<ellipse cx="256" cy="116" rx="12" ry="24"/></g>`;
  },

  tricolor: (c) => `
    <clipPath id="flag"><circle cx="256" cy="196" r="84"/></clipPath>
    <g clip-path="url(#flag)">
      <rect x="172" y="112" width="56" height="168" fill="#002b7f"/>
      <rect x="228" y="112" width="56" height="168" fill="#fcd116"/>
      <rect x="284" y="112" width="56" height="168" fill="#ce1126"/>
    </g>
    <circle cx="256" cy="196" r="84" fill="none" stroke="${c.fg}" stroke-width="6"/>`,

  eustars: (c) => {
    const star = (cx, cy, r) => {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const rr = i % 2 ? r * 0.42 : r;
        return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
      });
      return `<polygon points="${pts.join(' ')}"/>`;
    };
    const stars = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return star(256 + 74 * Math.sin(a), 196 - 74 * Math.cos(a), 15);
    }).join('');
    return `<g fill="${c.accent}">${stars}</g><circle cx="256" cy="196" r="30" fill="${c.fg}"/>
      <circle cx="256" cy="196" r="10" fill="${c.bg}"/>`;
  },

  vinyl: (c) => `
    <circle cx="256" cy="196" r="88" fill="#07070c" stroke="${c.fg}" stroke-width="4"/>
    <g fill="none" stroke="${c.fg}" stroke-opacity="0.25" stroke-width="3">
      <circle cx="256" cy="196" r="74"/><circle cx="256" cy="196" r="62"/><circle cx="256" cy="196" r="50"/>
    </g>
    <path d="M256,122 A74,74 0 0 1 320,159" fill="none" stroke="${c.fg}" stroke-opacity="0.7" stroke-width="5" stroke-linecap="round"/>
    <circle cx="256" cy="196" r="32" fill="${c.accent}"/>
    <circle cx="256" cy="196" r="7" fill="${c.bg}"/>`,

  gear: (c) => {
    const teeth = Array.from({ length: 10 }, (_, i) =>
      `<rect x="242" y="100" width="28" height="34" rx="5" transform="rotate(${i * 36} 256 196)"/>`).join('');
    return `<g fill="${c.accent}">${teeth}<circle cx="256" cy="196" r="72"/></g>
      <circle cx="256" cy="196" r="30" fill="${c.bg}"/>
      <circle cx="256" cy="196" r="50" fill="none" stroke="${c.bg}" stroke-opacity="0.35" stroke-width="4"/>`;
  },

  rose: (c) => {
    const petals = Array.from({ length: 5 }, (_, i) =>
      `<ellipse cx="256" cy="148" rx="34" ry="50" transform="rotate(${i * 72} 256 196)"/>`).join('');
    return `<g fill="${c.accent}">${petals}</g>
      <circle cx="256" cy="196" r="30" fill="${c.fg}"/>
      <circle cx="256" cy="196" r="12" fill="${c.bg}"/>`;
  },

  mic: (c) => `
    <rect x="222" y="104" width="68" height="112" rx="34" fill="${c.fg}"/>
    <g stroke="${c.bg}" stroke-width="5" stroke-linecap="round">
      <line x1="232" y1="140" x2="280" y2="140"/><line x1="232" y1="158" x2="280" y2="158"/><line x1="232" y1="176" x2="280" y2="176"/>
    </g>
    <g fill="none" stroke="${c.accent}" stroke-width="10" stroke-linecap="round">
      <path d="M198,176 A58,58 0 0 0 314,176"/>
      <line x1="256" y1="236" x2="256" y2="270"/>
      <line x1="222" y1="276" x2="290" y2="276"/>
    </g>`,

  church: (c) => `
    <path d="M256,94 V132 M242,108 H270" stroke="${c.accent}" stroke-width="8" stroke-linecap="round"/>
    <path d="M256,132 C298,164 304,190 292,210 H220 C208,190 214,164 256,132Z" fill="${c.accent}"/>
    <g fill="${c.fg}">
      <rect x="214" y="210" width="84" height="78"/>
      <rect x="178" y="240" width="36" height="48"/>
      <rect x="298" y="240" width="36" height="48"/>
    </g>
    <path d="M172,242 L196,220 L220,242Z M292,242 L316,220 L340,242Z" fill="${c.accent}"/>
    <path d="M242,288 V258 A14,14 0 0 1 270,258 V288Z" fill="${c.bg}"/>`,

  sun: (c) => {
    const rays = Array.from({ length: 12 }, (_, i) =>
      `<path d="M256,104 L266,134 L246,134Z" fill="${i % 2 ? c.fg : c.accent}" transform="rotate(${i * 30} 256 196)"/>`).join('');
    return `${rays}<circle cx="256" cy="196" r="50" fill="${c.accent}"/>
      <path d="M256,166 L286,196 L256,226 L226,196Z" fill="${c.bg}"/>
      <path d="M256,182 L270,196 L256,210 L242,196Z" fill="${c.accent}"/>`;
  },

  nai: (c) => {
    const tubes = [168, 156, 144, 132, 120, 108, 96, 84]
      .map((h, i) => `<rect x="${176 + i * 20}" y="112" width="16" height="${h}" rx="8" fill="${c.fg}"/>`)
      .join('');
    return `${tubes}<rect x="168" y="160" width="176" height="18" rx="4" fill="${c.accent}"/>
      <rect x="168" y="186" width="176" height="6" rx="3" fill="${c.accent}"/>`;
  },
};

const STATIONS = [
  { slug: 'magic-fm', word: 'MAGIC', sub: 'FM', motif: 'magic', bg: '#3a1c71', fg: '#ffffff', accent: '#f6c85f' },
  { slug: 'reper', word: 'REPER', sub: 'RADIO', motif: 'pin', bg: '#0e4d4a', fg: '#f4ebd9', accent: '#f28c28' },
  { slug: 'zu', word: 'ZU', sub: 'RADIO', motif: 'bolt', bg: '#1b1b1f', fg: '#ffffff', accent: '#ff5a36', size: 96 },
  { slug: 'kiss-fm', word: 'KISS', sub: 'FM', motif: 'heart', bg: '#b0144f', fg: '#ffffff', accent: '#ffc2d4' },
  { slug: 'west-city', word: 'WEST CITY', sub: 'RADIO', motif: 'skyline', bg: '#14213d', fg: '#fff3e0', accent: '#fca311' },
  { slug: 'digi-fm', word: 'DIGI', sub: 'FM', motif: 'bars', bg: '#1947c9', fg: '#ffffff', accent: '#6fe3ff' },
  { slug: 'etno-vest', word: 'ETNO', sub: 'VEST', motif: 'embroidery', bg: '#f3e9d2', fg: '#8c1b14', accent: '#1f1f1f', bgDark: '#5e120e' },
  { slug: 'realitatea', word: 'REALITATEA', sub: 'FM', motif: 'broadcast', bg: '#1e2229', fg: '#ffffff', accent: '#e63946' },
  { slug: 'digi-24', word: 'DIGI 24', sub: 'FM', motif: 'clock', bg: '#0f2e4f', fg: '#ffffff', accent: '#f5b700' },
  { slug: 'doza-colinde', word: 'DOZA', sub: 'COLINDE', motif: 'snowflake', bg: '#174d35', fg: '#fff8e7', accent: '#e8b04b' },
  { slug: 'play-colinde', word: 'PLAY', sub: 'COLINDE', motif: 'play', bg: '#8c1c22', fg: '#fff8e7', accent: '#f2c14e' },
  { slug: 'ardeal-colinde', word: 'ARDEAL', sub: 'COLINDE', motif: 'mountains', bg: '#1c2b4a', fg: '#ffffff', accent: '#f4d35e', mid: '#6f89bd' },
  { slug: 'nasu-romeo', word: 'NASU', sub: 'ROMEO', motif: 'crown', bg: '#4a0f2b', fg: '#f7e1a8', accent: '#e0a526' },
  { slug: 'disco-mix', word: 'DISCO', sub: 'MIX', motif: 'discoball', bg: '#17112b', fg: '#ffffff', accent: '#ff4fa3', accent2: '#3fe0f0' },
  { slug: 'radio-milos', word: 'MILOȘ', sub: 'RADIO', motif: 'notes', bg: '#5c2350', fg: '#fff4e0', accent: '#f2a541' },
  { slug: 'antena-satelor', word: 'ANTENA', sub: 'SATELOR', motif: 'wheat', bg: '#3d5a1e', fg: '#fbf5e6', accent: '#e9c46a' },
  { slug: 'national-fm', word: 'NATIONAL', sub: 'FM', motif: 'tricolor', bg: '#16324f', fg: '#ffffff', accent: '#fcd116' },
  { slug: 'europa-fm', word: 'EUROPA', sub: 'FM', motif: 'eustars', bg: '#0b3d91', fg: '#ffffff', accent: '#ffcc00' },
  { slug: 'pro-fm', word: 'PRO', sub: 'FM', motif: 'vinyl', bg: '#23213a', fg: '#ffffff', accent: '#ff2e63', size: 88 },
  { slug: 'radio-resita', word: 'REȘIȚA', sub: 'RADIO', motif: 'gear', bg: '#353a42', fg: '#ffffff', accent: '#f4a259' },
  { slug: 'timisoara-fm', word: 'TIMIȘOARA', sub: 'FM', motif: 'rose', bg: '#7a1f3d', fg: '#ffffff', accent: '#ffb3c6' },
  { slug: 'actualitati', word: 'ACTUALITĂȚI', sub: 'RADIO', motif: 'mic', bg: '#0d3b66', fg: '#ffffff', accent: '#f95738' },
  { slug: 'trinitas', word: 'TRINITAS', sub: 'RADIO', motif: 'church', bg: '#2b2150', fg: '#ffffff', accent: '#e5c07b' },
  { slug: 'banat-timisoara', word: 'BANAT', sub: 'TIMIȘOARA', motif: 'sun', bg: '#8a2f10', fg: '#fff7ed', accent: '#fde68a' },
  { slug: 'radio-popular', word: 'POPULAR', sub: 'RADIO', motif: 'nai', bg: '#14532d', fg: '#ffffff', accent: '#facc15' },
];

// Futura Bold capitals average about 0.7em wide; fit the word into ~320px.
const wordSize = (s) => s.size ?? Math.min(84, Math.floor(320 / (s.word.length * 0.7)));

function logoSvg(s) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${s.bg}"/>
  <circle cx="256" cy="256" r="236" fill="none" stroke="${s.accent}" stroke-opacity="0.35" stroke-width="4"/>
  ${MOTIFS[s.motif](s)}
  <text x="256" y="${358 + wordSize(s) * 0.25}" text-anchor="middle" font-family="Futura" font-weight="700"
    font-size="${wordSize(s)}" letter-spacing="2" fill="${s.fg}">${s.word}</text>
  <text x="261" y="428" text-anchor="middle" font-family="Futura" font-weight="500"
    font-size="26" letter-spacing="10" fill="${s.motif === 'embroidery' ? s.fg : s.accent}">${s.sub}</text>
</svg>`;
}

// Mix a hex colour towards black; t = 0 keeps it, 1 is black.
const darken = (hex, t) =>
  '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t)).toString(16).padStart(2, '0')).join('');

// Background: no text (the Echo Show draws the station name and logo on
// top, bottom-left), a dark field, ripples and the motif ghosted on the right.
function backgroundSvg(s) {
  const base = s.bgDark ?? darken(s.bg, 0.45);
  const colors = { ...s, bg: base, fg: s.bgDark ? '#f3e9d2' : s.fg };
  const rings = [180, 280, 380, 480, 580, 680]
    .map((r) => `<circle cx="760" cy="310" r="${r}" fill="none" stroke="${colors.fg}" stroke-opacity="0.06" stroke-width="2"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="640" viewBox="0 0 1024 640">
  <rect width="1024" height="640" fill="${base}"/>
  ${rings}
  <g opacity="0.25" transform="translate(760 310) scale(2.1) translate(-256 -196)">${MOTIFS[s.motif](colors)}</g>
</svg>`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Headless Chrome writes the screenshot but doesn't always exit, so wait for
// the file to appear and stop changing, then end Chrome ourselves.
async function render(svg, width, height, file) {
  const dir = mkdtempSync(join(tmpdir(), 'radio-art-'));
  const out = join(OUT, file);
  rmSync(out, { force: true });
  const html = join(dir, 'page.html');
  writeFileSync(html, `<!doctype html><html><body style="margin:0;overflow:hidden">${svg}</body></html>`);
  const chrome = spawn(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${width},${height}`, `--screenshot=${out}`, `--user-data-dir=${join(dir, 'profile')}`,
    `file://${html}`,
  ], { stdio: 'ignore' });
  let exited = false;
  chrome.on('exit', () => (exited = true));
  try {
    let lastSize = -1;
    for (let waited = 0; waited < 30000; waited += 250) {
      await sleep(250);
      const size = existsSync(out) ? statSync(out).size : -1;
      if (size > 0 && size === lastSize) return;
      lastSize = size;
      if (exited && size <= 0) break;
    }
    throw new Error(`Chrome did not produce ${file}`);
  } finally {
    if (!exited) chrome.kill();
    await sleep(200);
    rmSync(dir, { recursive: true, force: true });
  }
}

const only = process.argv[2];
for (const s of STATIONS) {
  if (only && s.slug !== only) continue;
  await render(logoSvg(s), 512, 512, `${s.slug}.png`);
  await render(backgroundSvg(s), 1024, 640, `${s.slug}-bg.png`);
  console.log(`logos/${s.slug}.png, logos/${s.slug}-bg.png`);
}
