/* rose.js — финал, шаг 4: красная пиксельная роза расцветает.

   Рисунок тот же, что и в игре «Память», но крупнее и с раскрытием:
   сначала стебель, потом лепестки от центра к краям. */

import { el } from '../core/dom.js';
import { Loop } from '../core/loop.js';
import { audio } from '../core/audio.js';
import { canvasScale, device } from '../core/device.js';
import { hud } from '../ui/hud.js';
import { fx } from '../ui/fx.js';
import { finScene, autoExit } from './finaleKit.js';

const ROSE = [
  '....rrrrr....',
  '..rrppppprr..',
  '.rpprrrrrppr.',
  '.rprrdddrrpr.',
  'rrprdrrrdrprr',
  'rrprdrrrdrprr',
  '.rprrdddrrpr.',
  '..rrppppprr..',
  '.....ggg.....',
  '.....ggg.....',
  '..ll.ggg.ll..',
  '.llllgggllll.',
  '.....ggg.....',
];
const PAL = {
  r: '#d8334e', p: '#ff8fa8', d: '#8c1e33', g: '#3f7d4f', l: '#5aa06a',
};

const SX = 6.5;
const SY = 4.2;

export function createRoseScene(ctx) {
  let exit = null;
  let loop = null;
  let canvas = null;
  let g = null;
  let scale = 1;
  let t = 0;
  let sparked = false;
  let timers = [];

  // время появления каждого пикселя: стебель — сразу, лепестки — от центра
  const pixels = [];
  for (let y = 0; y < ROSE.length; y++) {
    for (let x = 0; x < ROSE[y].length; x++) {
      const ch = ROSE[y][x];
      if (!PAL[ch]) continue;
      const isStem = y >= 8;
      const dist = Math.hypot(x - SX, y - SY);
      pixels.push({
        x, y, ch,
        at: isStem ? (12 - y) * 0.09 : 0.55 + dist * 0.11,
      });
    }
  }
  pixels.sort((a, b) => a.at - b.at);

  function fit() {
    if (!canvas) return;
    const box = canvas.parentElement.getBoundingClientRect();
    const side = Math.max(140, Math.min(box.width, window.innerHeight * 0.6));
    scale = Math.max(6, Math.floor(side / ROSE[0].length));
    const w = ROSE[0].length * scale;
    const h = ROSE.length * scale;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvasScale(canvas, w, h);
    g = canvas.getContext('2d', { alpha: true });
    g.imageSmoothingEnabled = false;
  }

  /* Роза рисуется по одному пикселю и только один раз: канвас не чистится,
     поэтому кадры почти бесплатны и цикл можно остановить после раскрытия. */
  function paintGlow() {
    const w = canvas.width;
    const h = canvas.height;
    const dpr = w / (ROSE[0].length * scale) || 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);        // канвас прозрачный: никакой тёмной «плиты»

    const cx = (SX + 0.5) * scale * dpr;
    const cy = (SY + 0.5) * scale * dpr;
    const rad = Math.max(w, h) * 0.62;
    const glow = g.createRadialGradient(cx, cy, 1, cx, cy, rad);
    glow.addColorStop(0, 'rgba(180,85,63,0.20)');
    glow.addColorStop(0.55, 'rgba(123,58,43,0.10)');
    glow.addColorStop(1, 'rgba(227,216,200,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let cursor = 0;
  const flashing = [];

  function drawPixel(p, color) {
    g.fillStyle = color;
    g.fillRect(p.x * scale, p.y * scale, Math.ceil(scale), Math.ceil(scale));
  }

  function draw() {
    if (!g) return;
    // новые пиксели
    while (cursor < pixels.length && t >= pixels[cursor].at) {
      const p = pixels[cursor];
      drawPixel(p, '#ffe3ea');           // короткая вспышка
      flashing.push({ p, at: t + 0.12 });
      cursor++;
    }
    // вспышка гаснет — дорисовываем настоящий цвет
    for (let i = flashing.length - 1; i >= 0; i--) {
      if (t >= flashing[i].at) {
        drawPixel(flashing[i].p, PAL[flashing[i].p.ch]);
        flashing.splice(i, 1);
      }
    }
  }

  function step(dt) {
    t += dt;
    draw();
    if (!sparked && t > 1.35) {
      sparked = true;
      audio.fragment();
      const r2 = canvas.getBoundingClientRect();
      fx.burst(r2.left + r2.width / 2, r2.top + r2.height * 0.34, {
        count: device.quality === 'low' ? 8 : 16,
        colors: ['#ffd0da', '#ff8fa8', '#ffcf8a'],
        speed: 70,
        size: 3,
        life: 1.0,
        gravity: -26,
      });
    }
    // всё раскрылось и вспышки погасли — цикл больше не нужен
    if (cursor >= pixels.length && !flashing.length) {
      if (loop) loop.stop();
    }
  }

  return {
    id: 'rose',

    mount() {
      hud.setCinema(true);

      canvas = el('canvas', { class: 'fin__rose', 'aria-label': 'красная роза', role: 'img' });
      const holder = el('div', { class: 'fin__rosehold' }, canvas);

      exit = autoExit(ctx, 'fireworks', device.reducedMotion ? 3200 : 7200);
      const view = finScene('rose', holder);

      requestAnimationFrame(() => {
        fit();
        paintGlow();
        loop = new Loop(step, { fps: device.reducedMotion ? 30 : 60, name: 'finale-rose' });
        loop.start();
      });

      exit.start();

      return view;
    },

    destroy() {
      timers.forEach(clearTimeout);
      timers = [];
      if (loop) loop.stop();
      loop = null;
      if (exit) exit.stop();
      exit = null;
      hud.setCinema(false);
    },
  };
}
