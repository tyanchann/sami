/* ИГРА 4 — CATCH THE HEARTS
   С неба падают пиксельные сердечки и тёмные камни.
   Корзинка ловит первые и уворачивается от вторых. */

import { GameShell } from './shell.js';
import { audio } from '../core/audio.js';
import { px, skyGradient, starField, drawStars, drawHeart, HEART_W, drawMap } from './sprites.js';

const BASKET_W = 46;
const BASKET_Y = 168;
const TARGET = 8;

const STONE_MAP = [
  '..####..',
  '.#dddd#.',
  '#dddddd#',
  '#dddddd#',
  '.#dddd#.',
  '..####..',
];
const STONE_PAL = { '#': '#6B5B48', d: '#8A7A65' };

const CLOUDS = [
  { x: 40, y: 34, w: 44, s: 0.35 },
  { x: 150, y: 20, w: 60, s: 0.22 },
  { x: 250, y: 46, w: 38, s: 0.42 },
];

export function createCatchScene(ctx) {
  let SH = null;
  const S = {
    basketX: 160,
    targetX: 160,
    items: [],
    sparks: [],
    caught: 0,
    spawnIn: 0.5,
    t: 0,
    hurt: 0,
    keyDir: 0,
  };

  const stars = starField(40, 320, 130, 33);

  /* ---------- отрисовка ---------- */
  function drawSky(g, t) {
    g.fillStyle = skyGradient(g, [
      [0, '#F4ECDD'], [0.45, '#EEE2CE'], [0.8, '#E5D2B6'], [1, '#D8BE9C'],
    ], 200);
    g.fillRect(0, 0, 320, 200);
    drawStars(g, stars, t);

    // луна
    const halo = g.createRadialGradient(66, 42, 4, 66, 42, 26);
    halo.addColorStop(0, 'rgba(255,248,236,.6)');
    halo.addColorStop(1, 'rgba(255,236,203,0)');
    g.fillStyle = halo;
    g.beginPath(); g.arc(66, 42, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFF8EC';
    g.beginPath(); g.arc(66, 42, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#EFDCC0';
    g.beginPath(); g.arc(69, 39, 2.4, 0, Math.PI * 2); g.fill();

    // облака (медленно плывут)
    for (const c of CLOUDS) {
      const cx = ((c.x + t * 6 * c.s) % 380) - 40;
      g.globalAlpha = 0.16;
      g.fillStyle = '#B79A7A';
      g.beginPath();
      g.ellipse(cx, c.y, c.w * 0.5, 7, 0, 0, Math.PI * 2);
      g.ellipse(cx + c.w * 0.22, c.y - 4, c.w * 0.32, 6, 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }

    // земля
    const gr = g.createLinearGradient(0, BASKET_Y + 14, 0, 200);
    gr.addColorStop(0, '#9C8968');
    gr.addColorStop(1, '#7A6749');
    g.fillStyle = gr;
    g.fillRect(0, BASKET_Y + 16, 320, 200 - BASKET_Y - 16);
    px(g, 0, BASKET_Y + 16, 320, 2, '#A99B77');
    for (let x = 4; x < 320; x += 17) {
      px(g, x, BASKET_Y + 22 + ((x * 7) % 5), 2, 2, '#6E5E45');
    }
  }

  function drawBasket(g, x) {
    const y = BASKET_Y;
    g.globalAlpha = 0.3;
    g.fillStyle = '#000';
    g.beginPath(); g.ellipse(x, y + 18, BASKET_W * 0.5, 3, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;

    // корзинка
    px(g, x - BASKET_W / 2, y + 6, BASKET_W, 12, '#8a5a2e');
    px(g, x - BASKET_W / 2, y + 6, BASKET_W, 2, '#b07a42');
    px(g, x - BASKET_W / 2, y + 16, BASKET_W, 2, '#5e3c1e');
    // плетение
    for (let i = 0; i < 5; i++) {
      px(g, x - BASKET_W / 2 + i * 6, y + 8, 2, 8, '#71481f');
    }
    px(g, x - BASKET_W / 2, y + 11, BASKET_W, 2, '#a06c36');
    // обод
    px(g, x - BASKET_W / 2 - 2, y + 4, BASKET_W + 4, 3, '#c98f4c');
    px(g, x - BASKET_W / 2 - 2, y + 4, BASKET_W + 4, 1, '#e6b878');
    // «свет» ловушки
    g.globalAlpha = 0.18;
    g.fillStyle = '#ffd0da';
    g.beginPath();
    g.ellipse(x, y + 3, BASKET_W * 0.52, 3.5, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }

  function drawItem(g, it) {
    if (it.type === 'heart') {
      drawHeart(g, it.x - (HEART_W * 2) / 2, it.y - 8, 2, {
        '#': it.hot ? '#ff8fa8' : '#e8253a',
      });
      g.globalAlpha = 0.35;
      g.fillStyle = '#ff8fa8';
      g.fillRect(it.x - 1, it.y - 12, 2, 2);
      g.globalAlpha = 1;
    } else {
      drawMap(g, STONE_MAP, STONE_PAL, it.x - 8, it.y - 8, 2);
    }
  }

  const game = {
    id: 'catch',
    title: 'Сердечки',
    index: 3,
    chipPos: 'bottom',
    piece: 6,
    hint: 'веди корзинку пальцем или стрелками ← →',
    instructions: [
      'Лови падающие сердечки корзинкой.',
      'Камни ловить нельзя — они отнимают сердечко.',
      'Собери 8 сердечек.',
    ],

    reset(shell) {
      S.items.length = 0;
      S.sparks.length = 0;
      S.caught = 0;
      S.spawnIn = 0.9;
      S.basketX = 160;
      S.targetX = 160;
      S.hurt = 0;
      S.keyDir = 0;
      S.t = 0;
      shell.setScore(`сердечки 0 / ${TARGET}`);
    },

    onDown(x) { S.targetX = x; },
    onMove(x) { S.targetX = x; },
    onKey(key, down) {
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') S.keyDir = down ? -1 : (S.keyDir === -1 ? 0 : S.keyDir);
      if (key === 'ArrowRight' || key === 'd' || key === 'D') S.keyDir = down ? 1 : (S.keyDir === 1 ? 0 : S.keyDir);
    },

    update(dt, t, shell) {
      SH = shell;
      S.t += dt;
      S.hurt = Math.max(0, S.hurt - dt * 2);

      // корзинка
      if (S.keyDir !== 0) {
        S.basketX += S.keyDir * 190 * dt;
        S.targetX = S.basketX;
      } else {
        S.basketX += (S.targetX - S.basketX) * Math.min(1, dt * 14);
      }
      S.basketX = Math.max(26, Math.min(294, S.basketX));

      // спавн
      S.spawnIn -= dt;
      if (S.spawnIn <= 0) {
        S.spawnIn = Math.max(0.62, 0.98 - S.caught * 0.02);
        const stone = Math.random() < 0.18;
        S.items.push({
          x: 26 + Math.random() * 268,
          y: -14,
          vy: 34 + Math.random() * 20 + S.caught * 1.6,
          vx: (Math.random() - 0.5) * 14,
          type: stone ? 'stone' : 'heart',
          hot: Math.random() < 0.18,
          wob: Math.random() * 6.28,
        });
      }

      const catchL = S.basketX - BASKET_W / 2;
      const catchR = S.basketX + BASKET_W / 2;
      const catchY = BASKET_Y + 2;

      for (let i = S.items.length - 1; i >= 0; i--) {
        const it = S.items[i];
        it.y += it.vy * dt;
        it.x += Math.sin(S.t * 2 + it.wob) * it.vx * dt;
        it.x = Math.max(10, Math.min(310, it.x));

        // поймали
        if (it.y >= catchY && it.y <= catchY + 14 && it.x > catchL - 4 && it.x < catchR + 4) {
          S.items.splice(i, 1);
          if (it.type === 'heart') {
            S.caught++;
            audio.pickup();
            burst(it.x, catchY, '#ff8fa8');
            shell.setScore(`сердечки ${S.caught} / ${TARGET}`);
            if (S.caught >= TARGET) {
              draw(shell.G);
              shell.stopRound();
              setTimeout(() => shell.win(`${TARGET} сердечек!`), 260);
              return;
            }
          } else {
            S.caught = Math.max(0, S.caught - 1);
            S.hurt = 1;
            audio.wrong();
            shell.flash('bad');
            burst(it.x, catchY, '#8B7B66');
            shell.setScore(`сердечки ${S.caught} / ${TARGET}`);
          }
          continue;
        }
        if (it.y > 216) S.items.splice(i, 1);
      }

      for (let i = S.sparks.length - 1; i >= 0; i--) {
        const s = S.sparks[i];
        s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 120 * dt;
        if (s.life <= 0) S.sparks.splice(i, 1);
      }

      draw(shell.G);
    },
  };

  function burst(x, y, color) {
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const sp = 30 + Math.random() * 70;
      S.sparks.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.3, c: color, s: Math.random() > 0.5 ? 2 : 1,
      });
    }
  }

  function draw(g) {
    drawSky(g, S.t);
    for (const it of S.items) drawItem(g, it);
    for (const s of S.sparks) {
      g.globalAlpha = Math.max(0, s.life * 2.2);
      g.fillStyle = s.c;
      g.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
    }
    g.globalAlpha = 1;
    drawBasket(g, S.basketX);
    if (S.hurt > 0) {
      g.globalAlpha = S.hurt * 0.22;
      g.fillStyle = '#ff2f45';
      g.fillRect(0, 0, 320, 200);
      g.globalAlpha = 1;
    }
  }

  return new GameShell(ctx, game);
}
