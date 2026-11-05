/* matrix.js — финал, шаг 3: цифровой дождь на весь экран. */

import { hud } from '../ui/hud.js';
import { Loop } from '../core/loop.js';
import { device } from '../core/device.js';
import { finScene, fullCanvas, autoExit } from './finaleKit.js';

const GLYPHS = '0123456789ABCDEFXZ$#@%&*+=<>/\\|:;~^';
const CELL = 15;

export function createMatrixScene(ctx) {
  let exit = null;
  let bg = null;
  let loop = null;
  let cols = [];
  let t = 0;
  let frame = 0;

  function makeColumns() {
    const n = Math.max(8, Math.ceil(bg.w / CELL));
    cols = new Array(n).fill(0).map((_, i) => ({
      x: i * CELL + 2,
      y: Math.random() * (bg.h * 1.25) - bg.h * 0.25,
      speed: (device.quality === 'low' ? 20 : 26) + Math.random() * 46,
      alpha: 0.55 + Math.random() * 0.45,
      glyph: GLYPHS[(Math.random() * GLYPHS.length) | 0],
    }));
  }

  function step(dt) {
    const ctx = bg.ctx;
    const { w, h } = bg;
    t += dt;

    // затухание хвостов: полная заливка экрана — раз в два кадра
    frame++;
    if (frame % 2 === 1) {
      ctx.fillStyle = 'rgba(227,216,200,0.22)';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.font = `${CELL - 1}px "Courier New", monospace`;
    ctx.textBaseline = 'top';

    const fadeIn = Math.min(1, t / 0.9);

    for (const c of cols) {
      c.y += c.speed * dt;
      if (c.y > h + CELL * 6) {
        c.y = -Math.random() * 340 - 20;
        c.speed = (device.quality === 'low' ? 20 : 26) + Math.random() * 46;
        c.alpha = 0.55 + Math.random() * 0.45;
      }
      // яркая «голова» и один тусклый кадр над ней
      ctx.globalAlpha = c.alpha * fadeIn;
      ctx.fillStyle = '#8E3620';
      c.glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      const y = Math.round(c.y);
      ctx.fillText(c.glyph, c.x, y);

      ctx.globalAlpha = c.alpha * 0.8 * fadeIn;
      ctx.fillStyle = '#5C4433';
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], c.x, y - CELL);

    }
    ctx.globalAlpha = 1;
  }

  return {
    id: 'matrix',

    mount() {
      hud.setCinema(true);
      bg = fullCanvas('fin-bg--matrix', { maxDpr: 1 });
      const ctx2d = bg.ctx;
      ctx2d.fillStyle = '#E3D8C8';
      ctx2d.fillRect(0, 0, bg.w, bg.h);
      makeColumns();

      loop = new Loop(step, { fps: device.quality === 'low' ? 30 : 60, name: 'finale-matrix' });
      loop.start();

      exit = autoExit(ctx, 'rose', device.reducedMotion ? 2400 : 5200);
      const view = finScene('matrix');
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
      cols = [];
      hud.setCinema(false);
    },
  };
}
