/* bears.js — маленькие пиксельные мишки-наклейки для финальной открытки.
   Каждый мишка — сетка 15×15: базовая мордочка + аксессуар (сердечко, розочка,
   объятие, бантик). Наклейка = кремовый силуэт-обводка + сама картинка. */

const PAL = {
  '#': '#3a2318',   // контур
  b: '#a8703f',     // шерсть
  l: '#e0b483',     // мордочка
  e: '#2a1a12',     // глазки
  n: '#3a2318',     // носик
  h: '#ff5f86',     // сердечко
  H: '#c2335a',     // тень сердечка
  r: '#d8334e',     // роза
  p: '#ff8fa8',     // лепестки
  d: '#8c1e33',     // глубина розы
  g: '#3f7d4f',     // стебель
  y: '#ff8fa8',     // бантик
  Y: '#c2335a',     // узел бантика
};

const BASE = [
  '..##.....##..',
  '.#bb#...#bb#.',
  '.#bbb#.#bbb#.',
  '.#bbbbbbbbb#.',
  '#bbbbbbbbbbb#',
  '#bbbbbbbbbbb#',
  '#bbeebbbeebb#',
  '#bbbbbbbbbbb#',
  '#bbbblllbbbb#',
  '#bbblllllbbb#',
  '#bbbllnllbbb#',
  '.#bblllllbb#.',
  '..#########..',
];

const HEART = [
  'h.h',
  'hhh',
  '.h.',
];

const HEART5 = [
  'hh.hh',
  'hhhhh',
  'hhhhh',
  '.hhh.',
  '..h..',
];

const ROSE7 = [
  '..rrr..',
  '.rpppr.',
  '.rdrdr.',
  '.rpppr.',
  '..rrr..',
  '...g...',
  '.g.g.g.',
  '...g...',
];

const BOW7 = [
  'yy...yy',
  'yyyyyyy',
  'yyyYyyy',
  'yyyyyyy',
  'yy...yy',
];

const SIZE = 15;

function blank() {
  return Array.from({ length: SIZE }, () => new Array(SIZE).fill('.'));
}

function stamp(grid, map, ox, oy) {
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const ch = map[y][x];
      if (ch === '.') continue;
      const gx = ox + x;
      const gy = oy + y;
      if (gx < 0 || gy < 0 || gx >= SIZE || gy >= SIZE) continue;
      grid[gy][gx] = ch;
    }
  }
}

function mirror(grid) {
  return grid.map((row) => row.slice().reverse());
}

/** сетка пикселей для одного из четырёх мишек */
function bearGrid(kind) {
  const g = blank();
  stamp(g, BASE, 1, 1);

  if (kind === 'heart') {
    // мишка с сердечком: сердечко у правой щеки, ниже мордочки
    stamp(g, HEART5, 10, 9);
    g[12][9] = 'b';
  } else if (kind === 'rose') {
    // мишка с розочкой: цветок сбоку, стебель уходит вниз
    stamp(g, ROSE7, 8, 6);
    g[12][7] = 'b';
  } else if (kind === 'hug') {
    // обнимающий мишка: сердечко перед грудью и две лапки по бокам
    stamp(g, HEART5, 5, 9);
    g[11][4] = 'b'; g[11][10] = 'b';
    g[12][4] = 'b'; g[12][10] = 'b';
  } else {
    // мишка с бантиком: бантик на макушке
    stamp(g, BOW7, 4, 0);
    g[3][1] = '#';
  }
  return g;
}

function toSVG(grid, palette, cls = '') {
  const NS = 'http://www.w3.org/2000/svg';
  const root = document.createElementNS(NS, 'svg');
  root.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  root.setAttribute('shape-rendering', 'crispEdges');
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('focusable', 'false');
  if (cls) root.setAttribute('class', cls);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const color = palette[grid[y][x]];
      if (!color) continue;
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', String(x));
      r.setAttribute('y', String(y));
      r.setAttribute('width', '1.02');
      r.setAttribute('height', '1.02');
      r.setAttribute('fill', color);
      root.appendChild(r);
    }
  }
  return root;
}

const SOLID = {};
for (const k of Object.keys(PAL)) SOLID[k] = '#ffffff';

/**
 * Готовая наклейка с мишкой.
 * @param {'heart'|'rose'|'hug'|'bow'} kind
 * @param {{flip?:boolean, rotate?:number, label?:string}} opts
 */
export function bearSticker(kind, opts = {}) {
  const { flip = false, rotate = 0, label = 'мишка' } = opts;
  let grid = bearGrid(kind);
  if (flip) grid = mirror(grid);

  const wrap = document.createElement('span');
  wrap.className = `sticker sticker--${kind}`;
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', label);
  if (rotate) wrap.style.setProperty('--rot', `${rotate}deg`);

  const outline = toSVG(grid, SOLID, 'sticker__outline');
  const art = toSVG(grid, PAL, 'sticker__art');
  wrap.append(outline, art);
  return wrap;
}
