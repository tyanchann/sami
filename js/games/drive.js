/* ИГРА 2 — МАШИНКИ
   Ночное шоссе, три полосы, встречный поток. Доехать до финиша. */

import { GameShell } from './shell.js';
import { audio } from '../core/audio.js';
import { px, skyGradient, starField, drawStars } from './sprites.js';

const ROAD_L = 62;
const ROAD_R = 258;
const LANES = [ROAD_L + 33, ROAD_L + 98, ROAD_L + 163];
const CAR_W = 20;
const CAR_H = 30;

const PAINT = {
  player: { body: '#3fa7d6', light: '#7fd6f5', dark: '#1d6d90', glass: '#0e2233' },
  enemyA: { body: '#d94f4f', light: '#ff8a8a', dark: '#8c2b2b', glass: '#2a1016' },
  enemyB: { body: '#e0b04a', light: '#ffd98a', dark: '#8f6a20', glass: '#2a2010' },
  enemyC: { body: '#8b6cff', light: '#bda8ff', dark: '#4a3494', glass: '#1a1233' },
};

export function createDriveScene(ctx) {
  let SH = null;
  const S = {
    carX: LANES[1],
    targetX: LANES[1],
    obstacles: [],
    scroll: 0,
    distance: 0,
    total: 2300,   // ~22 c спокойного пути при скорости 104→140 px/с
    speed: 104,
    spawnIn: 1.5,
    lastLane: 1,
    shake: 0,
    sparks: [],
    roadSide: [],
    keyDir: 0,
  };

  const stars = starField(30, 320, 150, 11);

  function drawCar(g, cx, y, p, headlights = false) {
    const x = Math.round(cx - CAR_W / 2);
    // тень под машиной
    g.globalAlpha = 0.32;
    px(g, x + 2, y + 2, CAR_W, CAR_H, '#000');
    g.globalAlpha = 1;

    // шины
    px(g, x - 2, y + 4, 4, 9, '#0b0910');
    px(g, x + CAR_W - 2, y + 4, 4, 9, '#0b0910');
    px(g, x - 2, y + CAR_H - 13, 4, 9, '#0b0910');
    px(g, x + CAR_W - 2, y + CAR_H - 13, 4, 9, '#0b0910');

    // силуэт (контур) — сегменты сверху вниз: [смещение, высота, ширина]
    const segs = [[0, 3, 12], [3, 4, 16], [7, 9, CAR_W], [16, 10, CAR_W], [26, 3, 13]];
    for (const [dy, h, w] of segs) {
      px(g, x + (CAR_W - w) / 2, y + dy, w, h, '#15101f');
    }
    // кузов
    for (const [dy, h, w] of segs) {
      px(g, x + (CAR_W - w) / 2 + 1, y + dy, w - 2, h, p.body);
    }
    // блик по левой стороне
    for (const [dy, h, w] of segs) {
      px(g, x + (CAR_W - w) / 2 + 1, y + dy, 2, h, p.light);
    }
    // капот и багажник темнее
    px(g, x + 2, y + 3, CAR_W - 4, 4, p.dark);
    px(g, x + 3, y + 26, CAR_W - 6, 3, p.dark);

    // лобовое стекло (трапеция)
    px(g, x + 3, y + 8, CAR_W - 6, 1, p.glass);
    px(g, x + 2, y + 9, CAR_W - 4, 6, p.glass);
    px(g, x + 3, y + 15, CAR_W - 6, 1, p.glass);
    // крыша
    px(g, x + 2, y + 16, CAR_W - 4, 3, p.dark);
    // заднее стекло
    px(g, x + 3, y + 19, CAR_W - 6, 1, p.glass);
    px(g, x + 2, y + 20, CAR_W - 4, 5, p.glass);
    px(g, x + 3, y + 25, CAR_W - 6, 1, p.glass);
    // зеркала
    px(g, x - 1, y + 10, 3, 2, p.dark);
    px(g, x + CAR_W - 2, y + 10, 3, 2, p.dark);

    // фары / стопы
    if (headlights) {
      px(g, x + 2, y, 4, 2, '#fdffd4');
      px(g, x + CAR_W - 6, y, 4, 2, '#fdffd4');
      g.globalAlpha = 0.16;
      g.fillStyle = '#fdffd4';
      g.beginPath();
      g.moveTo(x + 2, y); g.lineTo(x + 6, y); g.lineTo(x + 14, y + 16); g.lineTo(x - 4, y + 16);
      g.closePath(); g.fill();
      g.globalAlpha = 1;
    } else {
      px(g, x + 2, y + CAR_H - 2, 4, 2, '#ff5a5a');
      px(g, x + CAR_W - 6, y + CAR_H - 2, 4, 2, '#ff5a5a');
    }
  }

  function drawRoad(g, t) {
    // трава по краям
    g.fillStyle = skyGradient(g, [[0, '#F1E6D3'], [1, '#E4D5C0']], 200);
    g.fillRect(0, 0, 320, 200);

    // звёзды и луна в «небе» сверху — это ночное шоссе сверху вниз
    g.globalAlpha = 0.5;
    drawStars(g, stars, t);
    g.globalAlpha = 1;

    // обочины с деревьями
    const scroll = S.scroll;
    for (let i = 0; i < 6; i++) {
      const y = ((i * 62 + scroll * 0.92) % 268) - 40;
      drawTree(g, 12 + (i % 2) * 14, y);
      drawTree(g, 276 + ((i + 1) % 2) * 12, y + 34);
    }
    // фонари
    for (let i = 0; i < 3; i++) {
      const y = ((i * 96 + scroll * 0.92) % 280) - 40;
      drawLamp(g, 46, y);
      drawLamp(g, 268, y + 52);
    }

    // полотно
    px(g, ROAD_L, 0, ROAD_R - ROAD_L, 200, '#8A7B67');
    // фактура асфальта
    for (let i = 0; i < 26; i++) {
      const ty = ((i * 47 + S.scroll * 1.0) % 260) - 30;
      const tx = ROAD_L + 8 + ((i * 71) % (ROAD_R - ROAD_L - 16));
      px(g, tx, ty, 6, 2, 'rgba(255,255,255,.028)');
      px(g, tx + 4, ty + 3, 3, 1, 'rgba(0,0,0,.22)');
    }
    px(g, ROAD_L, 0, 3, 200, '#B0A08A');
    px(g, ROAD_R - 3, 0, 3, 200, '#B0A08A');
    // разметка
    const dashY = (scroll * 1.0) % 40;
    for (let y = -40 + dashY; y < 210; y += 40) {
      px(g, LANES[0] + 33, y, 3, 20, '#F4ECE0');
      px(g, LANES[1] + 33, y, 3, 20, '#F4ECE0');
    }
    // крайние линии
    px(g, ROAD_L + 6, 0, 2, 200, '#C9B8A4');
    px(g, ROAD_R - 8, 0, 2, 200, '#C9B8A4');

    // финишная клетка впереди
    if (S.distance > 0.86) {
      const fy = ((1 - S.distance) / 0.14) * 210 - 30;
      for (let x = ROAD_L; x < ROAD_R; x += 10) {
        const odd = ((x - ROAD_L) / 10) % 2 < 1;
        px(g, x, fy, 10, 6, odd ? '#F4ECE0' : '#4A3B32');
        px(g, x, fy + 6, 10, 6, odd ? '#4A3B32' : '#F4ECE0');
      }
    }
  }

  function drawTree(g, x, y) {
    px(g, x + 3, y + 10, 2, 8, '#6B4A2C');
    px(g, x, y + 2, 8, 9, '#5F7A4E');
    px(g, x + 1, y, 6, 4, '#6E8A58');
    px(g, x + 2, y + 1, 3, 2, '#7E9A64');
  }

  function drawLamp(g, x, y) {
    px(g, x, y + 4, 2, 24, '#6B5E50');
    px(g, x - 3, y, 8, 4, '#7C6E5E');
    // световое пятно на земле (эллипс, мягко)
    g.globalAlpha = 0.10;
    g.fillStyle = '#ffd98a';
    g.beginPath();
    g.ellipse(x + 1, y + 8, 13, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    px(g, x - 2, y + 1, 6, 2, '#ffd98a');
  }

  function drawHud(g) {
    // полоса прогресса
    px(g, 10, 10, 300, 11, 'rgba(244,236,224,.92)');
    px(g, 10, 10, 300, 1, 'rgba(255,255,255,.75)');
    const w = Math.round(296 * Math.min(1, S.distance));
    px(g, 12, 13, 296, 5, 'rgba(74,59,50,.10)');
    if (w > 0) {
      px(g, 12, 13, w, 5, '#2F7D5C');
      px(g, 12, 13, w, 1, '#8FD3BA');
    }
  }

  const game = {
    id: 'drive',
    title: 'Машинки',
    index: 1,
    chipPos: 'bottom',
    piece: 4,
    hint: '← → или веди машину пальцем · доберись до финиша',
    instructions: [
      'Управляй машиной стрелками или пальцем.',
      'Уворачивайся от встречных машин и конусов.',
      'Доезжай до финиша, чтобы получить фрагмент.',
    ],

    reset(shell) {
      S.carX = LANES[1];
      S.targetX = LANES[1];
      S.obstacles.length = 0;
      S.sparks.length = 0;
      S.distance = 0;
      S.scroll = 0;
      S.speed = 104;
      S.spawnIn = 1.7;
      S.lastLane = 1;
      S.shake = 0;
      S.keyDir = 0;
      shell.setScore('дистанция 0%');
    },

    onDown(x) { S.targetX = x; },
    onMove(x) { S.targetX = x; },

    onKey(key, down) {
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') S.keyDir = down ? -1 : (S.keyDir === -1 ? 0 : S.keyDir);
      if (key === 'ArrowRight' || key === 'd' || key === 'D') S.keyDir = down ? 1 : (S.keyDir === 1 ? 0 : S.keyDir);
    },

    update(dt, t, shell) {
      SH = shell;
      S.shake = Math.max(0, S.shake - dt * 3);

      // движение игрока
      if (S.keyDir !== 0) {
        S.carX += S.keyDir * 170 * dt;
        S.targetX = S.carX;
      } else {
        S.carX += (S.targetX - S.carX) * Math.min(1, dt * 12);
      }
      S.carX = Math.max(ROAD_L + CAR_W / 2 + 4, Math.min(ROAD_R - CAR_W / 2 - 4, S.carX));

      // прокрутка и дистанция
      S.speed = 104 + Math.min(34, S.distance * 34);
      S.scroll += S.speed * dt;
      S.distance = Math.min(1, S.distance + (S.speed * dt) / S.total);

      // спавн препятствий
      S.spawnIn -= dt;
      if (S.spawnIn <= 0 && S.distance < 0.94) {
        S.spawnIn = Math.max(0.95, 1.5 - S.distance * 0.45);
        let lane = (Math.random() * 3) | 0;
        if (lane === S.lastLane) lane = (lane + 1 + ((Math.random() * 2) | 0)) % 3;
        S.lastLane = lane;
        const cone = Math.random() < 0.16;
        S.obstacles.push({
          lane, x: LANES[lane], y: -40,
          type: cone ? 'cone' : 'car',
          paint: [PAINT.enemyA, PAINT.enemyB, PAINT.enemyC][(Math.random() * 3) | 0],
          w: cone ? 12 : CAR_W,
          h: cone ? 14 : CAR_H,
        });
      }

      // движение препятствий + столкновения
      const px0 = S.carX - CAR_W / 2;
      const py0 = 158;
      for (let i = S.obstacles.length - 1; i >= 0; i--) {
        const o = S.obstacles[i];
        o.y += (S.speed + 40) * dt;
        if (o.y > 215) { S.obstacles.splice(i, 1); continue; }

        const ox = o.x - o.w / 2;
        const oy = o.y;
        const hit = px0 + 3 < ox + o.w - 3 && px0 + CAR_W - 3 > ox + 3
          && py0 + 4 < oy + o.h - 3 && py0 + CAR_H - 4 > oy + 3;
        if (hit) {
          spawnSparks(o.x, oy + 10);
          draw(g());                 // последний кадр до остановки цикла
          shell.fail('столкновение!');
          return;
        }
      }

      for (let i = S.sparks.length - 1; i >= 0; i--) {
        const s = S.sparks[i];
        s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 200 * dt;
        if (s.life <= 0) S.sparks.splice(i, 1);
      }

      shell.setScore(`дистанция ${Math.round(S.distance * 100)}%`);

      if (S.distance >= 1) {
        draw(g());
        shell.stopRound();
        setTimeout(() => shell.win('финиш!'), 260);
        return;
      }

      draw(g());
    },
  };

  function spawnSparks(x, y) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 120;
      S.sparks.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: 0.4 + Math.random() * 0.4,
        c: ['#ffd98a', '#ff8a5a', '#fff'][(Math.random() * 3) | 0],
      });
    }
  }

  function g() { return SH.G; }

  function draw(gc, t = 0) {
    const t2 = S.scroll / 100;
    gc.save();
    if (S.shake > 0) gc.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    drawRoad(gc, t2);
    for (const o of S.obstacles) {
      if (o.type === 'cone') {
        px(gc, o.x - 5, o.y, 10, 3, '#e0662f');
        px(gc, o.x - 4, o.y + 3, 8, 4, '#f4f0ff');
        px(gc, o.x - 3, o.y + 7, 6, 4, '#e0662f');
        px(gc, o.x - 5, o.y + 11, 10, 3, '#a34a1f');
      } else {
        drawCar(gc, o.x - CAR_W / 2, o.y, o.paint, true);
      }
    }
    drawCar(gc, S.carX - CAR_W / 2, 158, PAINT.player, false);
    for (const s of S.sparks) {
      gc.globalAlpha = Math.max(0, s.life * 1.8);
      gc.fillStyle = s.c;
      gc.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
    }
    gc.globalAlpha = 1;
    drawHud(gc);
    gc.restore();
  }

  return new GameShell(ctx, game);
}
