/* reward.js — «большой момент» получения фрагмента сердца.
   Экран мягко затемняется, в центре появляется сердце,
   светящийся фрагмент отделяется от места события, летит по дуге,
   встаёт на своё место, искры, звук пазла, пульс. */

import { HEART } from './heartData.js';
import { el, svg, wait, nextFrame } from '../core/dom.js';
import { audio } from '../core/audio.js';
import { device } from '../core/device.js';
import { state, TOTAL_FRAGMENTS } from '../state.js';
import { buildHeart, updateHeart, pieceCenter, HEART_GRID } from './heart.js';
import { hud } from './hud.js';
import { fx } from './fx.js';

/** svg одного фрагмента по его пикселям */
function pieceSVG(pieceId) {
  const piece = HEART.pieces[pieceId];
  const xs = piece.cells.map((c) => c[0]);
  const ys = piece.cells.map((c) => c[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const w = Math.max(...xs) - minX + 1;
  const h = Math.max(...ys) - minY + 1;
  const root = svg('svg', {
    viewBox: `${minX} ${minY} ${w} ${h}`,
    class: 'piece-svg',
    preserveAspectRatio: 'xMidYMid meet',
  });
  for (const [x, y, s] of piece.cells) {
    root.appendChild(svg('rect', {
      x: x - 0.01, y: y - 0.01, width: 1.02, height: 1.02, 'data-s': s,
    }));
  }
  return root;
}

/** экранные координаты центра фрагмента внутри отрисованного сердца */
function pieceScreenPos(heartEl, pieceId) {
  const rect = heartEl.getBoundingClientRect();
  const scale = Math.min(rect.width / HEART_GRID.w, rect.height / HEART_GRID.h);
  const offX = rect.left + (rect.width - HEART_GRID.w * scale) / 2;
  const offY = rect.top + (rect.height - HEART_GRID.h * scale) / 2;
  const c = pieceCenter(pieceId);
  return { x: offX + c.x * scale, y: offY + c.y * scale };
}

/**
 * Показать получение фрагмента.
 * @param {number} pieceId 0..7
 * @param {{from?:{x:number,y:number}}} opts from — точка, откуда вылетает фрагмент
 */
export async function showFragmentReward(pieceId, opts = {}) {
  const stage = document.querySelector('#stage');
  if (!stage) return;

  const collectedBefore = state.fragmentList();
  const alreadyHas = collectedBefore.includes(pieceId);
  const reduce = device.reducedMotion;

  const overlay = el('div', { class: 'reward', 'aria-live': 'polite' });
  const inner = el('div', { class: 'reward__inner' });
  const heartWrap = el('div', { class: 'reward__heart' });
  const heart = buildHeart({ collected: collectedBefore, classes: 'heart-svg', label: 'Сердце' });
  heartWrap.appendChild(heart);

  const num = collectedBefore.length + (alreadyHas ? 0 : 1);
  const cap = el('p', {
    class: 'reward__cap',
    text: `фрагмент ${Math.min(num, TOTAL_FRAGMENTS)} из ${TOTAL_FRAGMENTS}`,
  });

  inner.append(heartWrap, cap);
  overlay.append(inner);
  stage.appendChild(overlay);

  await nextFrame();
  overlay.classList.add('is-in');
  await wait(reduce ? 30 : 220);

  if (!alreadyHas) {
    const target = pieceScreenPos(heart, pieceId);
    const from = opts.from || { x: window.innerWidth / 2, y: window.innerHeight * 0.82 };

    const flyer = el('div', { class: 'reward__flyer', 'aria-hidden': 'true' });
    flyer.style.left = `${from.x}px`;
    flyer.style.top = `${from.y}px`;
    const piece = pieceSVG(pieceId);
    flyer.appendChild(piece);
    overlay.appendChild(flyer);

    const dx = target.x - from.x;
    const dy = target.y - from.y;

    if (reduce) {
      flyer.remove();
    } else {
      const arcX = dx * 0.42;
      const arcY = Math.min(dy, 0) - Math.max(60, window.innerHeight * 0.12);
      const flight = flyer.animate([
        { transform: 'translate(-50%,-50%) scale(1.1) rotate(-14deg)' },
        {
          transform: `translate(calc(-50% + ${arcX}px), calc(-50% + ${arcY}px)) scale(1.25) rotate(10deg)`,
          offset: 0.45,
        },
        {
          transform: `translate(calc(-50% + ${dx * 0.86}px), calc(-50% + ${dy * 0.92}px)) scale(0.62) rotate(-4deg)`,
          offset: 0.82,
        },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.42) rotate(0deg)` },
      ], { duration: 680, easing: 'cubic-bezier(.32,.06,.30,1)', fill: 'forwards' });

      let raf = requestAnimationFrame(function track() {
        const r = flyer.getBoundingClientRect();
        fx.trail(r.left + r.width / 2, r.top + r.height / 2, { color: '#ffd0da', size: 5, life: 0.38 });
        if (flyer.isConnected) raf = requestAnimationFrame(track);
        else cancelAnimationFrame(raf);
      });

      await flight.finished.catch(() => {});
      cancelAnimationFrame(raf);
      flyer.remove();
    }

    // ---- встал на место ----
    state.addFragment(pieceId);
    audio.fragment();
    updateHeart(heart, state.fragmentList(), [pieceId]);
    heart.classList.add('is-beating');

    fx.burst(target.x, target.y, {
      count: 14,
      colors: ['#ffd0da', '#ff8fa8', '#fff3ea'],
      speed: 190,
      size: 5,
      life: 0.6,
      gravity: 320,
      spread: Math.PI * 2,
    });

    hud.refresh();
    hud.pulseHeart();
    hud.pulseProgress();
  }

  await wait(reduce ? 320 : 980);
  overlay.classList.remove('is-in');
  await wait(reduce ? 40 : 300);
  overlay.remove();
  heart.classList.remove('is-beating');
}
