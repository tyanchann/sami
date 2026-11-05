/* ИГРА 1 — СТРЕЛЬБА ИЗ ЛУКА
   Тёплая поляна, лучница с луком и мишень. Два попадания — фрагмент сердца.
   Сложность намеренно мягкая: крупная мишень и широкий радиус попадания. */

import { GameShell } from './shell.js';
import { audio } from '../core/audio.js';
import { px, skyGradient, starField, drawStars } from './sprites.js';

const TARGET_X = 262;
const GROUND_Y = 166;

export function createBowScene(ctx) {
  let SH = null;   // активная оболочка (нужна для рисования и очков)
  const S = {
    aim: -0.15,
    aiming: false,
    pointerAngle: -0.15,
    arrows: [],
    parts: [],
    hits: 0,
    target: { y: 92, vy: 0, flash: 0, hitY: 0 },
    bowX: 58,
    bowY: 138,
    cooldown: 0,
    shake: 0,
  };

  const stars = starField(46, 320, 110, 3);
  const grass = (() => {
    const arr = [];
    for (let x = 0; x < 320; x += 7) arr.push({ x, h: 2 + ((x * 37) % 5), o: ((x * 13) % 3) * 0.12 });
    return arr;
  })();

  function drawSky(g, t) {
    g.fillStyle = skyGradient(g, [
      [0, '#F3EADB'], [0.45, '#EDDFC9'], [0.72, '#E4CFB2'], [1, '#D8BC9B'],
    ], GROUND_Y);
    g.fillRect(0, 0, 320, GROUND_Y);
    drawStars(g, stars, t);

    // луна
    const halo = g.createRadialGradient(252, 40, 6, 252, 40, 34);
    halo.addColorStop(0, 'rgba(255,248,236,.62)');
    halo.addColorStop(1, 'rgba(255,236,203,0)');
    g.fillStyle = halo;
    g.beginPath(); g.arc(252, 40, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFF8EC';
    g.beginPath(); g.arc(252, 40, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#EFDCC0';
    g.beginPath(); g.arc(256, 36, 3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(248, 45, 2, 0, Math.PI * 2); g.fill();

    // дальние холмы
    g.fillStyle = '#C7B296';
    g.beginPath();
    g.moveTo(0, GROUND_Y);
    g.lineTo(0, 128); g.quadraticCurveTo(60, 96, 122, 126);
    g.quadraticCurveTo(170, 148, 230, 122);
    g.quadraticCurveTo(285, 100, 320, 130);
    g.lineTo(320, GROUND_Y); g.closePath(); g.fill();

    g.fillStyle = '#B9A386';
    g.beginPath();
    g.moveTo(0, GROUND_Y);
    g.lineTo(0, 148); g.quadraticCurveTo(80, 132, 150, 150);
    g.quadraticCurveTo(240, 166, 320, 144);
    g.lineTo(320, GROUND_Y); g.closePath(); g.fill();
  }

  function drawGround(g) {
    const grad = g.createLinearGradient(0, GROUND_Y, 0, 200);
    grad.addColorStop(0, '#9E8A6B');
    grad.addColorStop(0.55, '#8A7658');
    grad.addColorStop(1, '#75634A');
    g.fillStyle = grad;
    g.fillRect(0, GROUND_Y, 320, 200 - GROUND_Y);
    // кромка травы
    px(g, 0, GROUND_Y, 320, 2, '#A99B77');
    px(g, 0, GROUND_Y + 2, 320, 1, '#8E7C5C');
    // травинки над линией
    for (const b of grass) {
      px(g, b.x, GROUND_Y - b.h, 1, b.h, b.o > 0.2 ? '#8FA06F' : '#7A8B5C');
    }
    // тёмные кустики
    for (let i = 0; i < 7; i++) {
      const x = 12 + i * 44;
      px(g, x, GROUND_Y + 6, 5, 2, '#6E5E45');
      px(g, x + 1, GROUND_Y + 4, 3, 2, '#7C6B50');
    }
    // камешки и мелкие цветы
    px(g, 96, GROUND_Y + 12, 4, 2, '#7A6A50');
    px(g, 186, GROUND_Y + 22, 6, 2, '#7A6A50');
    px(g, 252, GROUND_Y + 10, 3, 1, '#82725A');
    px(g, 132, GROUND_Y + 8, 1, 2, '#6E6242');
    px(g, 132, GROUND_Y + 7, 1, 1, '#c9557a');
    px(g, 214, GROUND_Y + 16, 1, 2, '#6E6242');
    px(g, 214, GROUND_Y + 15, 1, 1, '#c9557a');
  }

  function drawArcher(g, t) {
    const bx = 44, by = GROUND_Y;
    const bob = Math.sin(t * 2) * 0.6;
    // ноги
    px(g, bx + 1, by - 9, 3, 9, '#2c2036');
    px(g, bx + 6, by - 9, 3, 9, '#241a2e');
    px(g, bx, by - 1, 11, 2, '#1a1224');
    // корпус
    px(g, bx + 1, by - 20 + bob, 8, 11, '#3d2a52');
    px(g, bx + 1, by - 20 + bob, 8, 3, '#4a3363');
    // голова
    px(g, bx + 2, by - 27 + bob, 6, 7, '#e8b98f');
    px(g, bx + 2, by - 28 + bob, 6, 3, '#2a1a20');
    px(g, bx + 8, by - 27 + bob, 1, 4, '#2a1a20');
    px(g, bx + 6, by - 24 + bob, 1, 1, '#2a1a20');
    // руки + лук (поворачивается к цели)
    const ax = bx + 10, ay = by - 20 + bob;
    g.save();
    g.translate(ax, ay);
    g.rotate(S.aim);
    // рука
    px(g, 0, -1, 6, 2, '#e8b98f');
    // тетива
    g.strokeStyle = '#efe6d4';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(6, -11); g.lineTo(6, 11); g.stroke();
    // дуга
    g.strokeStyle = '#c79a5c';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(-1, 0, 12, -1.15, 1.15);
    g.stroke();
    g.strokeStyle = '#8c6a3c';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(-1, 0, 13, -1.05, 1.05);
    g.stroke();
    g.restore();
  }

  function drawTarget(g, t) {
    const tg = S.target;
    const x = TARGET_X;
    // стойка
    px(g, x - 2, tg.y + 18, 4, GROUND_Y - tg.y - 18, '#6a4a2e');
    px(g, x - 8, GROUND_Y - 2, 16, 3, '#4b3320');
    // кольца
    const rings = [
      [30, '#f4ead6'],
      [20, '#d84c4c'],
      [11, '#f4ead6'],
      [4.5, '#d84c4c'],
    ];
    for (const [r, color] of rings) {
      g.fillStyle = color;
      g.beginPath(); g.arc(x, tg.y, r, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#3a2a20';
    g.lineWidth = 1;
    g.beginPath(); g.arc(x, tg.y, 30.5, 0, Math.PI * 2); g.stroke();
    if (tg.flash > 0) {
      g.globalAlpha = Math.min(1, tg.flash * 2.6);
      g.fillStyle = '#fff3c4';
      g.beginPath(); g.arc(x, tg.y, 33, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
    }
    // воткнутые стрелы
    for (const a of S.arrows) {
      if (a.stuck && a.targetHit) {
        g.strokeStyle = '#e6dcc4'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(x - 12, a.y); g.lineTo(x + 2, a.y - 1); g.stroke();
        px(g, x - 14, a.y - 2, 4, 3, '#c9484a');
      }
    }
  }

  function drawArrow(g, a) {
    const ang = Math.atan2(a.vy, a.vx);
    g.save();
    g.translate(a.x, a.y);
    g.rotate(ang);
    px(g, -7, 0, 12, 1, '#e8dfc8');
    px(g, 4, -1, 4, 2, '#cfd6e0');
    px(g, -9, -1, 3, 3, '#c9484a');
    g.restore();
    g.globalAlpha = 0.35;
    g.fillStyle = '#ffd9e0';
    g.fillRect(a.x - 22, a.y, 12, 1);
    g.globalAlpha = 1;
  }

  function drawAim(g) {
    if (!S.aiming) return;
    const dx = Math.cos(S.pointerAngle);
    const dy = Math.sin(S.pointerAngle);
    g.globalAlpha = 0.55;
    for (let d = 24; d < 200; d += 10) {
      const k = d / 200;
      px(g, S.bowX + dx * d, S.bowY + dy * d, 1 + (1 - k), 1 + (1 - k), '#ffd9e0');
    }
    g.globalAlpha = 1;
  }

  function spawnHitParts(x, y) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 90;
      S.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        life: 0.5 + Math.random() * 0.4, max: 0.9,
        c: ['#fff3c4', '#ffd9a0', '#d84c4c'][(Math.random() * 3) | 0],
        s: Math.random() > 0.6 ? 2 : 1,
      });
    }
  }

  const game = {
    id: 'bow',
    title: 'Лук',
    index: 0,
    piece: 3,
    hint: 'наведи и отпусти · на ПК можно просто кликнуть по мишени',
    instructions: [
      'Наведи прицел и отпусти — стрела полетит по линии.',
      'Два попадания в мишень, и фрагмент сердца твой.',
      'Мишень начинает двигаться после первого попадания.',
    ],

    reset(shell) {
      S.arrows.length = 0;
      S.parts.length = 0;
      S.hits = 0;
      S.aiming = false;
      S.cooldown = 0;
      S.shake = 0;
      S.target = { y: 92, vy: 0, flash: 0 };
      shell.setScore('попадания 0 / 2');
    },

    onDown(x, y) {
      if (S.cooldown > 0) return;
      S.aiming = true;
      S.aimAt(x, y);
    },

    onMove(x, y) {
      if (S.aiming) S.aimAt(x, y);
    },

    onUp() {
      if (!S.aiming || S.cooldown > 0) return;
      S.aiming = false;
      fire();
    },

    update(dt, t, shell) {
      SH = shell;
      S.cooldown = Math.max(0, S.cooldown - dt);
      S.shake = Math.max(0, S.shake - dt * 3.2);
      S.target.flash = Math.max(0, S.target.flash - dt * 2.6);

      // мишень ездит вверх-вниз после первого попадания
      if (S.hits > 0) {
        S.target.y += S.target.vy * dt;
        if (S.target.y < 58) { S.target.y = 58; S.target.vy = Math.abs(S.target.vy); }
        if (S.target.y > 126) { S.target.y = 126; S.target.vy = -Math.abs(S.target.vy); }
      }

      // стрелы
      for (let i = S.arrows.length - 1; i >= 0; i--) {
        const a = S.arrows[i];
        if (!a.stuck) {
          a.x += a.vx * dt;
          a.y += a.vy * dt;
          a.trail = (a.trail || 0) + dt;

          if (!a.checked && a.x >= TARGET_X - 12) {
            a.checked = true;
            const dy = Math.abs(a.y - S.target.y);
            if (dy <= 30) {
              a.stuck = true;
              a.targetHit = true;
              a.y = S.target.y + (dy <= 8 ? 0 : (a.y - S.target.y) * 0.6);
              S.target.flash = 1;
              S.shake = 1;
              spawnHitParts(TARGET_X - 12, a.y);
              audio.hit();
              S.hits++;
              shell.setScore(`попадания ${S.hits} / 2`);
              const sp = 16 + S.hits * 8;
              S.target.vy = (Math.random() < 0.5 ? -1 : 1) * sp;
              if (S.hits >= 2) {
                draw(dt, t);            // фиксируем кадр попадания
                shell.stopRound();
                setTimeout(() => shell.win('два из двух!'), 420);
                return;
              }
            } else {
              a.missed = true;
              audio.land();
            }
          }
          if (a.x > 330 || a.y < -20 || a.y > 210) S.arrows.splice(i, 1);
        } else if (a.x < TARGET_X - 16 || a.trail > 1.6) {
          S.arrows.splice(i, 1);
        } else {
          a.trail = (a.trail || 0) + dt;
        }
      }
      // «воткнутые» стрелы в мишени держим недолго
      S.arrows = S.arrows.filter((a) => !(a.stuck && a.trail > 1.4));

      for (let i = S.parts.length - 1; i >= 0; i--) {
        const p = S.parts[i];
        p.life -= dt;
        p.vy += 220 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) S.parts.splice(i, 1);
      }

      draw(dt, t);
    },

    onKey(key, down) {
      if (down && key === 'Space') {
        fire();
      }
    },
  };

  function fire() {
    if (S.cooldown > 0) return;
    S.cooldown = 0.22;
    const a = S.aim;
    const speed = 460;
    S.arrows.push({
      x: S.bowX + 8, y: S.bowY,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      checked: false, stuck: false, trail: 0,
    });
    audio.arrow();
  }

  S.aimAt = (x, y) => {
    const dx = x - S.bowX;
    const dy = y - S.bowY;
    if (Math.hypot(dx, dy) < 8) return;
    let ang = Math.atan2(dy, dx);
    const lim = 1.15;
    ang = Math.max(-lim, Math.min(lim, ang));
    S.aim = ang;
    S.pointerAngle = ang;
  };

  function draw(dt, t) {
    if (!SH) return;
    const g = SH.G;
    g.save();
    if (S.shake > 0) {
      g.translate((Math.random() - 0.5) * 2 * S.shake, (Math.random() - 0.5) * 2 * S.shake);
    }
    drawSky(g, t);
    drawGround(g);
    drawTarget(g, t);
    drawArcher(g, t);
    drawAim(g);
    for (const a of S.arrows) if (!a.stuck) drawArrow(g, a);
    for (const p of S.parts) {
      g.globalAlpha = Math.max(0, p.life / p.max);
      g.fillStyle = p.c;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    g.globalAlpha = 1;
    g.restore();
  }

  return new GameShell(ctx, game);
}
