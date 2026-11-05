/* heart.js — пиксельное сердце (8 фрагментов), сердца жизней и пиксельные иконки */

import { HEART } from './heartData.js';
import { svg } from '../core/dom.js';

/* ---------- большое сердце ---------- */

/**
 * @param {{collected?:number[], classes?:string, label?:string}} opts
 * @returns {SVGSVGElement}
 */
export function buildHeart(opts = {}) {
  const { collected = [], classes = 'heart-svg', label = 'Разбитое сердце' } = opts;
  const set = new Set(collected);
  const root = svg('svg', {
    class: classes,
    viewBox: `0 0 ${HEART.w} ${HEART.h}`,
    role: 'img',
    'aria-label': label,
    focusable: 'false',
    preserveAspectRatio: 'xMidYMid meet',
  });
  const cxc = HEART.w / 2, cyc = HEART.h / 2;
  for (const piece of HEART.pieces) {
    const g = svg('g', {
      class: 'hp' + (set.has(piece.id) ? '' : ' is-missing'),
      'data-piece': piece.id,
    });
    // направление «наружу» от центра сердца — недостающие фрагменты чуть разъехались
    const c = pieceCenter(piece.id);
    let dx = c.x - cxc, dy = c.y - cyc;
    const len = Math.hypot(dx, dy) || 1;
    const push = 0.62;
    g.style.setProperty('--ox', `${(dx / len) * push}px`);
    g.style.setProperty('--oy', `${(dy / len) * push}px`);
    for (const [x, y, s] of piece.cells) {
      g.appendChild(svg('rect', {
        x: x - 0.01, y: y - 0.01, width: 1.02, height: 1.02, 'data-s': s,
      }));
    }
    root.appendChild(g);
  }
  root.dataset.collected = String(collected.length);
  return root;
}

/** обновить состояние фрагментов; animate — массив id, которые «встают на место» */
export function updateHeart(root, collected, animate = null) {
  if (!root) return;
  const set = new Set(collected);
  for (const g of root.querySelectorAll('.hp')) {
    const id = Number(g.dataset.piece);
    const has = set.has(id);
    g.classList.toggle('is-missing', !has);
    if (animate && animate.includes(id)) {
      g.classList.remove('is-fresh');
      // рефлоу, чтобы анимация перезапустилась
      void g.getBoundingClientRect();
      g.classList.add('is-fresh');
    }
  }
  root.dataset.collected = String(collected.length);
}

/** координаты фрагмента в системе viewBox (центр) — нужны для полёта частиц */
export function pieceCenter(id) {
  const piece = HEART.pieces[id];
  if (!piece || !piece.cells.length) return { x: HEART.w / 2, y: HEART.h / 2 };
  let sx = 0, sy = 0;
  for (const [x, y] of piece.cells) { sx += x; sy += y; }
  return { x: sx / piece.cells.length + 0.5, y: sy / piece.cells.length + 0.5 };
}

export const HEART_GRID = { w: HEART.w, h: HEART.h };

/* ---------- сердце жизни (в духе Minecraft) ---------- */

const MC_MAP = [
  '.##...##.',
  'XXXX.XXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '...XXX...',
  '....#....',
];

function mcClass(x, y, filled) {
  const at = (dx, dy) => {
    const nx = x + dx, ny = y + dy;
    if (ny < 0 || ny >= MC_MAP.length) return '.';
    const row = MC_MAP[ny] || '';
    return row[nx] || '.';
  };
  const self = MC_MAP[y][x];
  if (self === '.') return null;
  // блик — 2x2 в верхней левой части
  if ((x === 2 || x === 3) && (y === 2 || y === 3)) return 'mc-hi';
  // контур
  if (at(-1, 0) === '.' || at(1, 0) === '.' || at(0, -1) === '.' || at(0, 1) === '.') return 'mc-line';
  // нижняя тень
  if (y >= 4) return 'mc-shadow';
  return 'body';
}

/** одно сердце жизни как SVG */
export function lifeHeart(filled = true) {
  const root = svg('svg', {
    class: 'life-svg' + (filled ? '' : ' is-empty'),
    viewBox: '0 0 9 8',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  for (let y = 0; y < MC_MAP.length; y++) {
    for (let x = 0; x < MC_MAP[y].length; x++) {
      const cls = mcClass(x, y, filled);
      if (!cls) continue;
      root.appendChild(svg('rect', {
        x, y, width: 1.02, height: 1.02,
        class: cls === 'body' ? null : cls,
      }));
    }
  }
  return root;
}

/* ---------- пиксельные иконки интерфейса ---------- */

const ICONS = {
  sound: [
    '.........',
    '...##....',
    '..###.#..',
    '.####..#.',
    '.####..#.',
    '.####..#.',
    '..###.#..',
    '...##....',
    '.........',
  ],
  muted: [
    '.........',
    '...##..#.',
    '..###...#',
    '.####.#.#',
    '.####..#.',
    '.####.#.#',
    '..###...#',
    '...##..#.',
    '.........',
  ],
  reset: [
    '...###...',
    '.#######.',
    '.#.....#.',
    '.#.#.#.#.',
    '.#.#.#.#.',
    '.#.#.#.#.',
    '.#.....#.',
    '..#####..',
    '.........',
  ],
};

/** иконка по имени; color — css-цвет */
export function pixelIcon(name, color = 'currentColor') {
  const map = ICONS[name] || ICONS.sound;
  const root = svg('svg', { viewBox: '0 0 9 9', 'aria-hidden': 'true', focusable: 'false' });
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] !== '#') continue;
      root.appendChild(svg('rect', { x, y, width: 1.02, height: 1.02, fill: color }));
    }
  }
  return root;
}
