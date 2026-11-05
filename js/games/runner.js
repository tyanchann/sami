/* ИГРА 3 — STICKMAN ESCAPE
   Бесконечный забег: ящики, ямы, финишный флаг. Прыжок — пробел / тап. */

import { GameShell } from './shell.js';
import { audio } from '../core/audio.js';
import { px, skyGradient, starField, drawStars } from './sprites.js';

const GROUND_Y = 158;
const PLAYER_X = 62;
const SPEED = 98;
const TOTAL = 2150;         // ~21 c забега при 104 px/с — дистанция короче

export function createRunnerScene(ctx) {
  let SH = null;
  const S = {
    worldX: 0,
    feetY: GROUND_Y,
    vy: 0,
    grounded: true,
    jumps: 0,
    obstacles: [],
    dust: [],
    t: 0,
    win: false,
    death: null,
  };

  const stars = starField(40, 320, 120, 21);
  const skyline = (() => {
    const arr = [];
    let x = 0;
    let seed = 5;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    while (x < 380) {
      const w = 14 + Math.floor(rnd() * 22);
      const h = 18 + Math.floor(rnd() * 34);
      arr.push({ x, w, h, lit: Math.floor(rnd() * 3) });
      x += w + 4 + Math.floor(rnd() * 10);
    }
    return arr;
  })();

  function buildTrack() {
    const obs = [];
    let x = 300;
    let seed = 17;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    let lastPit = false;
    while (x < TOTAL - 260) {
      const pit = !lastPit && rnd() < 0.30;
      if (pit) {
        obs.push({ type: 'pit', x, w: 20 + Math.floor(rnd() * 6) });
        x += 240 + rnd() * 130;   // больше воздуха между ямами
        lastPit = true;
      } else {
        obs.push({ type: 'box', x, w: 16, h: 15 + Math.floor(rnd() * 6) });
        x += 215 + rnd() * 135;   // и между ящиками
        lastPit = false;
      }
    }
    return obs;
  }

  /* ---------- отрисовка ---------- */
  function drawSky(g, t) {
    g.fillStyle = skyGradient(g, [
      [0, '#F4ECDD'], [0.5, '#EDE0CB'], [0.85, '#E3CDB0'], [1, '#D6B996'],
    ], GROUND_Y);
    g.fillRect(0, 0, 320, GROUND_Y + 2);
    drawStars(g, stars, t);

    // луна
    const halo = g.createRadialGradient(258, 40, 5, 258, 40, 30);
    halo.addColorStop(0, 'rgba(255,248,236,.6)');
    halo.addColorStop(1, 'rgba(226,232,255,0)');
    g.fillStyle = halo;
    g.beginPath(); g.arc(258, 40, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFF9EF';
    g.beginPath(); g.arc(258, 40, 11, 0, Math.PI * 2); g.fill();

    // дальние горы (медленный параллакс)
    const p1 = (S.worldX * 0.18) % 320;
    g.fillStyle = '#C4AF92';
    for (const off of [-p1, 320 - p1]) {
      g.beginPath();
      g.moveTo(off, 132);
      g.lineTo(off + 46, 96);
      g.lineTo(off + 92, 128);
      g.lineTo(off + 140, 88);
      g.lineTo(off + 196, 130);
      g.lineTo(off + 240, 100);
      g.lineTo(off + 320, 134);
      g.lineTo(off + 320, 160);
      g.lineTo(off, 160);
      g.closePath(); g.fill();
    }

    // городской силуэт (средний параллакс)
    const p2 = (S.worldX * 0.42) % 380;
    for (const off of [-p2, 380 - p2]) {
      for (const b of skyline) {
        g.fillStyle = '#B39C80';
        g.fillRect(off + b.x, 160 - b.h, b.w, b.h);
        g.fillStyle = 'rgba(255,214,140,.75)';
        for (let wy = 160 - b.h + 5; wy < 156; wy += 8) {
          for (let wx = off + b.x + 3; wx < off + b.x + b.w - 3; wx += 6) {
            if (((wx + wy) | 0) % 3 === 0) g.fillRect(wx, wy, 2, 3);
          }
        }
      }
    }
  }

  function drawGroundSeg(g, x1, x2) {
    if (x2 <= x1) return;
    const w = x2 - x1;
    const grad = g.createLinearGradient(0, GROUND_Y, 0, 200);
    grad.addColorStop(0, '#9C8968');
    grad.addColorStop(0.35, '#8A7758');
    grad.addColorStop(1, '#786548');
    g.fillStyle = grad;
    g.fillRect(x1, GROUND_Y, w, 200 - GROUND_Y);
    px(g, x1, GROUND_Y, w, 2, '#A99B77');
    // камешки/трава вдоль земли
    for (let x = Math.ceil(x1 / 9) * 9; x < x2; x += 9) {
      const h = 1 + (((x * 31) | 0) % 3);
      px(g, x, GROUND_Y + 6 + (((x * 17) | 0) % 5), 2, h, '#6E5E45');
    }
  }

  function drawPit(g, x1, x2) {
    const grad = g.createLinearGradient(0, GROUND_Y, 0, 200);
    grad.addColorStop(0, '#4A3B32');
    grad.addColorStop(1, '#5C4B3A');
    g.fillStyle = grad;
    g.fillRect(x1, GROUND_Y, x2 - x1, 200 - GROUND_Y);
    // стенки обрыва
    px(g, x1, GROUND_Y, 2, 200 - GROUND_Y, '#3A2E27');
    px(g, x2 - 2, GROUND_Y, 2, 200 - GROUND_Y, '#3A2E27');
    // кромка дёрна
    px(g, x1 - 3, GROUND_Y, 5, 3, '#A99B77');
    px(g, x2 - 2, GROUND_Y, 5, 3, '#A99B77');
    px(g, x1 - 3, GROUND_Y + 3, 3, 2, '#7A6B4F');
    px(g, x2, GROUND_Y + 3, 3, 2, '#7A6B4F');
    // камни на дне
    for (let x = x1 + 4; x < x2 - 4; x += 8) {
      px(g, x, GROUND_Y + 24, 4, 3, '#6E5E45');
      px(g, x + 1, GROUND_Y + 22, 2, 2, '#7C6B50');
    }
  }

  function drawGround(g) {
    const pits = S.obstacles
      .filter((o) => o.type === 'pit')
      .map((o) => ({ x1: o.x - S.worldX, x2: o.x + o.w - S.worldX }))
      .filter((p) => p.x2 > -20 && p.x1 < 340)
      .sort((a, b) => a.x1 - b.x1);

    let cursor = -20;
    for (const p of pits) {
      drawGroundSeg(g, cursor, Math.min(p.x1, 340));
      drawPit(g, Math.max(p.x1, -20), Math.min(p.x2, 340));
      cursor = p.x2;
    }
    drawGroundSeg(g, cursor, 340);
  }

  function drawBox(g, x, h) {
    const w = 16;
    const y = GROUND_Y - h;
    px(g, x, y, w, h, '#6b4a2c');
    px(g, x, y, w, 2, '#8a6238');
    px(g, x, y + h - 2, w, 2, '#4a3320');
    px(g, x, y, 2, h, '#4a3320');
    px(g, x + w - 2, y, 2, h, '#4a3320');
    // крест-накрест доски
    g.strokeStyle = '#8a6238';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x + 3, y + 3); g.lineTo(x + w - 3, y + h - 3);
    g.moveTo(x + w - 3, y + 3); g.lineTo(x + 3, y + h - 3);
    g.stroke();
    g.strokeStyle = '#3a2818';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x + 0.5, y + 6); g.lineTo(x + w - 0.5, y + 6);
    g.stroke();
  }

  function drawStick(g, x, feetY, t, airborne) {
    const swing = airborne ? 1.0 : Math.sin(t * 13) * 0.9;
    const bob = airborne ? 0 : Math.abs(Math.sin(t * 13)) * 1.4;
    const hipY = feetY - 14 + bob;
    const shoulderY = feetY - 25 + bob;
    const headY = shoulderY - 6;

    g.lineCap = 'round';
    // тень
    g.globalAlpha = 0.3;
    g.fillStyle = '#000';
    g.beginPath(); g.ellipse(x, GROUND_Y + 1, 8, 2.6, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;

    // обводка (для контраста на любом фоне)
    const stroke = (width, color, draw) => {
      g.strokeStyle = color; g.lineWidth = width; draw();
    };
    const legs = airborne ? [1.0, -0.55] : [swing, -swing];
    const armA = airborne ? -1.0 : swing * 0.85;

    const pathBody = () => { g.beginPath(); g.moveTo(x, shoulderY); g.lineTo(x, hipY); g.stroke(); };
    const pathArms = () => {
      g.beginPath();
      g.moveTo(x, shoulderY + 2);
      g.lineTo(x + Math.cos(armA - 0.5) * 8, shoulderY + 2 + Math.sin(armA - 0.5) * 8);
      g.moveTo(x, shoulderY + 2);
      g.lineTo(x - Math.cos(armA - 0.5) * 7, shoulderY + 2 + Math.sin(armA + 0.7) * 8);
      g.stroke();
    };
    const pathLegs = () => {
      for (let i = 0; i < 2; i++) {
        const a = legs[i];
        g.beginPath();
        g.moveTo(x, hipY);
        g.lineTo(x + Math.sin(a) * 6, hipY + 6);
        g.lineTo(x + Math.sin(a) * 9, feetY - (airborne ? 2 : Math.max(0, 2 - Math.abs(a) * 2)));
        g.stroke();
      }
    };

    // тёмная подложка
    stroke(4.6, '#1a1226', () => { pathBody(); pathArms(); pathLegs(); });
    g.fillStyle = '#1a1226';
    g.beginPath(); g.arc(x, headY, 5.6, 0, Math.PI * 2); g.fill();

    // светлый стикман
    stroke(2.6, '#f8efe2', () => { pathBody(); pathArms(); });
    stroke(2.4, '#f8efe2', pathLegs);
    g.fillStyle = '#f8efe2';
    g.beginPath(); g.arc(x, headY, 4.3, 0, Math.PI * 2); g.fill();
    // лицо
    g.fillStyle = '#241a2e';
    g.fillRect(x - 2, headY - 1, 1.4, 1.6);
    g.fillRect(x + 1, headY - 1, 1.4, 1.6);
  }

  function drawFinish(g) {
    const fx = TOTAL - S.worldX;
    if (fx > 340) return;
    // флагшток
    px(g, fx, GROUND_Y - 62, 3, 62, '#B0A08A');
    // полотнище в клетку
    for (let ry = 0; ry < 3; ry++) {
      for (let rx = 0; rx < 4; rx++) {
        px(g, fx + 3 + rx * 6, GROUND_Y - 62 + ry * 6, 6, 6,
          (rx + ry) % 2 === 0 ? '#F4ECE0' : '#4A3B32');
      }
    }
    // основание
    px(g, fx - 4, GROUND_Y - 4, 12, 4, '#8B7B66');
  }

  const game = {
    id: 'runner',
    title: 'Стикман',
    index: 2,
    piece: 5,
    hint: 'пробел или тап — прыжок · в воздухе можно ещё раз',
    instructions: [
      'Стикман бежит сам — ты отвечаешь за прыжки.',
      'Прыгай через ящики и перелетай ямы.',
      'Доберись до финишного флага.',
    ],

    reset(shell) {
      S.worldX = 0;
      S.feetY = GROUND_Y;
      S.vy = 0;
      S.grounded = true;
      S.jumps = 0;
      S.dust.length = 0;
      S.t = 0;
      S.win = false;
      S.death = null;
      S.obstacles = buildTrack();
      shell.setScore('до финиша 0%');
    },

    onDown() { jump(); },
    onKey(key, down) { if (down && key === 'Space') jump(); },

    update(dt, t, shell) {
      SH = shell;
      S.t += dt;
      if (S.win) { draw(shell.G); return; }

      // прокрутка мира
      S.worldX += SPEED * dt;

      // физика прыжка
      const g = 900;          // мягче приземление: дольше полёт, шире окно прыжка
      if (!S.grounded) {
        S.vy += g * dt;
        S.feetY += S.vy * dt;
        if (S.feetY >= GROUND_Y) {
          S.feetY = GROUND_Y;
          S.vy = 0;
          S.grounded = true;
          S.jumps = 0;
          for (let i = 0; i < 4; i++) {
            S.dust.push({
              x: PLAYER_X + (Math.random() - 0.5) * 8, y: GROUND_Y,
              vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, life: 0.4,
            });
          }
          audio.land();
        }
      }

      // проверка столкновений
      const py = S.feetY;
      const px0 = PLAYER_X - 6;
      const px1 = PLAYER_X + 6;
      for (const o of S.obstacles) {
        const ox = o.x - S.worldX;
        if (ox > 340 || ox + o.w < -20) continue;
        if (o.type === 'box') {
          const oy = GROUND_Y - o.h;
          if (px1 > ox + 1 && px0 < ox + o.w - 1 && py > oy + 3) {
            S.death = 'box';
            shell.fail('ой! ящик!');
            draw(shell.G);
            return;
          }
        } else {
          // яма: если игрок на земле и над пропастью
          if (S.grounded && px0 < ox + o.w - 2 && px1 > ox + 2) {
            S.death = 'pit';
            S.vy = 60;
            S.grounded = false;
            shell.fail('ой! яма!');
            draw(shell.G);
            return;
          }
        }
      }

      for (let i = S.dust.length - 1; i >= 0; i--) {
        const d = S.dust[i];
        d.life -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 120 * dt;
        if (d.life <= 0) S.dust.splice(i, 1);
      }

      const progress = Math.min(1, S.worldX / TOTAL);
      shell.setScore(`до финиша ${Math.round(progress * 100)}%`);

      if (S.worldX >= TOTAL) {
        S.win = true;
        draw(shell.G);
        shell.stopRound();
        setTimeout(() => shell.win('финиш!'), 240);
        return;
      }

      draw(shell.G);
    },
  };

  function jump() {
    if (!SH || !SH.active) return;
    if (S.grounded) {
      S.vy = -360;
      S.grounded = false;
      S.jumps = 1;
      audio.jump();
    } else if (S.jumps < 2) {
      S.vy = -300;
      S.jumps = 2;
      audio.jump();
    }
  }

  function draw(g) {
    const t = S.t;
    drawSky(g, t);
    drawFinish(g);
    drawGround(g);
    for (const o of S.obstacles) {
      if (o.type !== 'box') continue;
      const ox = o.x - S.worldX;
      if (ox > 340 || ox < -30) continue;
      drawBox(g, ox, o.h);
    }
    for (const d of S.dust) {
      g.globalAlpha = Math.max(0, d.life * 2);
      px(g, d.x, d.y, 2, 2, '#8a8272');
    }
    g.globalAlpha = 1;
    drawStick(g, PLAYER_X, S.feetY, t, !S.grounded);
  }

  return new GameShell(ctx, game);
}
