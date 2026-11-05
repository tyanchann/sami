/* fireworks.js — финал, шаг 5: салют над тёплым вечерним городом
   (небо в коричнево-песочной гамме, чтобы палитра сайта не ломалась). */

import { Loop } from '../core/loop.js';
import { audio } from '../core/audio.js';
import { device } from '../core/device.js';
import { hud } from '../ui/hud.js';
import { finScene, fullCanvas, autoExit } from './finaleKit.js';

const COLORS = ['#FFD79B', '#FF9A62', '#F2603C', '#FFE9C6', '#E0803A', '#FFB566'];

/* вечернее небо: сверху глубже, к горизонту теплее */
const SKY_TOP = '#6B4E3C';
const SKY_BOTTOM = '#AE8461';

// силуэт города: [x в долях ширины, ширина, высота в долях высоты]
const SKYLINE = [
  [0.00, 0.09, 0.10], [0.08, 0.07, 0.15], [0.15, 0.10, 0.08], [0.24, 0.06, 0.18],
  [0.30, 0.09, 0.11], [0.38, 0.07, 0.20], [0.45, 0.11, 0.09], [0.55, 0.06, 0.16],
  [0.61, 0.10, 0.12], [0.70, 0.08, 0.19], [0.78, 0.07, 0.10], [0.85, 0.09, 0.14],
  [0.93, 0.07, 0.09],
];

export function createFireworksScene(ctx) {
  let exit = null;
  let bg = null;
  let loop = null;
  let rockets = [];
  let parts = [];
  let t = 0;
  let nextLaunch = 0;
  let bursts = 0;
  let frame = 0;

  function launch() {
    const w = bg.w;
    const h = bg.h;
    rockets.push({
      x: w * (0.14 + Math.random() * 0.72),
      y: h * 0.96,
      vx: (Math.random() - 0.5) * 26,
      vy: -(h * (0.62 + Math.random() * 0.26)),
      boom: h * (0.16 + Math.random() * 0.34),
      color: COLORS[(Math.random() * COLORS.length) | 0],
    });
  }

  function burst(r) {
    const n = device.quality === 'low' ? 26 : 46;
    const color = r.color;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.24;
      const sp = 60 + Math.random() * 130;
      parts.push({
        x: r.x,
        y: r.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        g: 96,
        life: 0.85 + Math.random() * 0.7,
        age: 0,
        size: Math.random() < 0.4 ? 3 : 2,
        color: Math.random() < 0.22 ? COLORS[(Math.random() * COLORS.length) | 0] : color,
        drag: 0.9,
      });
    }
    audio.boom();
    bursts++;
  }

  function skyGrad(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, bg.h);
    g.addColorStop(0, SKY_TOP);
    g.addColorStop(1, SKY_BOTTOM);
    return g;
  }

  function drawSkyline(ctx) {
    const { w, h } = bg;
    ctx.fillStyle = '#3E2E24';
    for (const [x, bw, bh] of SKYLINE) {
      const px = Math.round(x * w);
      const pw = Math.round(bw * w) + 1;
      const ph = Math.round(bh * h);
      ctx.fillRect(px, h - ph, pw, ph);
    }
    // редкие тёплые окна
    ctx.fillStyle = 'rgba(255,208,138,.7)';
    for (const [x, bw, bh] of SKYLINE) {
      const px = Math.round(x * w);
      const pw = Math.round(bw * w);
      const ph = Math.round(bh * h);
      for (let i = 0; i < 3; i++) {
        const wx = px + 4 + ((i * 37) % Math.max(6, pw - 8));
        const wy = h - ph + 6 + ((i * 23) % Math.max(6, ph - 10));
        ctx.fillRect(wx, wy, 2, 3);
      }
    }
  }

  function step(dt) {
    const ctx = bg.ctx;
    const { w, h } = bg;
    t += dt;

    // шлейфы: гасим прошлый кадр тем же небом, а не стираем полностью (раз в два кадра)
    frame++;
    if (frame % 2 === 1) {
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = skyGrad(ctx);
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    drawSkyline(ctx);

    // запуск ракет: салют не заканчивается, пока сцена открыта
    if (t > nextLaunch) {
      launch();
      if (Math.random() < 0.3) launch();
      nextLaunch = t + 0.6 + Math.random() * 0.7;
    }

    // ракеты
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.vy += 84 * dt;
      ctx.fillStyle = r.color;
      ctx.fillRect(Math.round(r.x), Math.round(r.y), 2, 4);
      ctx.fillStyle = 'rgba(255,207,138,.5)';
      ctx.fillRect(Math.round(r.x) + (Math.random() < 0.5 ? 1 : -1), Math.round(r.y) + 4, 1, 2);
      if (r.y <= r.boom || r.vy > -30) {
        burst(r);
        rockets.splice(i, 1);
      }
    }

    // частицы
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.vx *= 1 - (p.drag || 0.9) * dt * 1.4;
      p.vy *= 1 - (p.drag || 0.9) * dt * 0.5;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = Math.max(0, 1 - p.age / p.life);
      ctx.globalAlpha = k > 0.82 ? 1 : 0.55 + 0.45 * k;
      ctx.fillStyle = p.color;
      const s = p.size;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    ctx.globalAlpha = 1;
  }

  return {
    id: 'fireworks',

    mount() {
      hud.setCinema(true);
      bg = fullCanvas('fin-bg--fireworks', { maxDpr: 1.5 });
      bg.ctx.fillStyle = skyGrad(bg.ctx);
      bg.ctx.fillRect(0, 0, bg.w, bg.h);

      loop = new Loop(step, { fps: device.quality === 'low' ? 30 : 60, name: 'finale-fireworks' });
      loop.start();
      launch();
      setTimeout(() => { if (loop && loop.running) launch(); }, 260);

      exit = autoExit(ctx, 'photos', device.reducedMotion ? 3000 : 6400);
      const view = finScene('fireworks');
      exit.start();

      return view;
    },

    destroy() {
      if (loop) loop.stop();
      loop = null;
      if (exit) exit.stop();
      exit = null;
      if (bg) bg.dispose();
      bg = null;
      rockets = [];
      parts = [];
      hud.setCinema(false);
    },
  };
}
