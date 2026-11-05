/* sprites.js — крошечные помощники пиксельной графики для мини-игр.
   Спрайты задаются строками: каждый символ — пиксель, палитра — объект char→цвет. */

export function px(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

/**
 * Нарисовать пиксельную карту.
 * @param {CanvasRenderingContext2D} g
 * @param {string[]} rows
 * @param {Record<string,string>} palette
 */
export function drawMap(g, rows, palette, x, y, scale = 1, flipX = false) {
  const w = rows[0].length;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      const color = palette[ch];
      if (!color) continue;
      const cx = flipX ? (w - 1 - c) : c;
      g.fillStyle = color;
      g.fillRect(
        Math.round(x + cx * scale),
        Math.round(y + r * scale),
        Math.max(1, Math.ceil(scale)),
        Math.max(1, Math.ceil(scale)),
      );
    }
  }
}

/** пиксельная карта → SVG-элемент (для DOM-графики) */
export function mapToSVG(rows, palette, cls = '') {
  const NS = 'http://www.w3.org/2000/svg';
  const root = document.createElementNS(NS, 'svg');
  root.setAttribute('viewBox', `0 0 ${rows[0].length} ${rows.length}`);
  root.setAttribute('shape-rendering', 'crispEdges');
  root.setAttribute('aria-hidden', 'true');
  if (cls) root.setAttribute('class', cls);
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const color = palette[rows[r][c]];
      if (!color) continue;
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', c);
      rect.setAttribute('y', r);
      rect.setAttribute('width', 1.02);
      rect.setAttribute('height', 1.02);
      rect.setAttribute('fill', color);
      root.appendChild(rect);
    }
  }
  return root;
}

/** маленькое пиксельное сердце (как в HUD) */
const HEART_MAP = [
  '.##...##.',
  '####.####',
  '#########',
  '#########',
  '.#######.',
  '..#####..',
  '...###...',
  '....#....',
];

export const HEART_PALETTE = {
  '#': '#e8253a',
};

export function drawHeart(g, x, y, scale = 1, palette = HEART_PALETTE) {
  drawMap(g, HEART_MAP, palette, x, y, scale);
}

export const HEART_W = 9;
export const HEART_H = 8;

/** вертикальный градиент неба (кэшируется по высоте) */
export function skyGradient(g, stops, h = 200) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  stops.forEach(([pos, color]) => grad.addColorStop(pos, color));
  return grad;
}

/** детерминированный «случайный» — чтобы звёзды не прыгали между кадрами */
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** пиксельная звёздная россыпь */
export function starField(count, w = 320, h = 120, seed = 7) {
  const rnd = seeded(seed);
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.floor(rnd() * w),
      y: Math.floor(rnd() * h),
      s: rnd() > 0.82 ? 2 : 1,
      a: 0.25 + rnd() * 0.6,
      tw: rnd() * 6.28,
    });
  }
  return stars;
}

export function drawStars(g, stars, t) {
  for (const st of stars) {
    const a = st.a * (0.72 + 0.28 * Math.sin(t * 1.6 + st.tw));
    g.globalAlpha = a;
    g.fillStyle = '#6B5B48';
    g.fillRect(st.x, st.y, st.s, st.s);
  }
  g.globalAlpha = 1;
}
