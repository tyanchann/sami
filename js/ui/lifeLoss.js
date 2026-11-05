/* lifeLoss.js — «сердце вылетает, трескается и разбивается».
   Ровно то, что описано в задании:
   вспышка → звук → сердце летит из HUD в центр → трещины → осколки → счётчик −1. */

import { el, svg, wait } from '../core/dom.js';
import { audio } from '../core/audio.js';
import { device } from '../core/device.js';
import { state } from '../state.js';
import { fx } from './fx.js';
import { lifeHeart } from './heart.js';
import { hud } from './hud.js';

const CRACK_PATHS = [
  'M4.6 0.4 L4.1 2.5 L5.05 3.8 L4.15 5.3 L4.55 7.6',
  'M4.1 2.5 L1.55 3.7',
  'M5.05 3.8 L7.45 3.0',
  'M4.15 5.3 L1.85 6.3',
];

function buildFlyer(rect) {
  const wrap = el('div', { class: 'flyer', 'aria-hidden': 'true' });
  wrap.style.left = `${rect.left}px`;
  wrap.style.top = `${rect.top}px`;
  wrap.style.width = `${rect.width}px`;
  wrap.style.height = `${rect.height}px`;

  const heart = lifeHeart(true);
  heart.style.width = '100%';
  heart.style.height = '100%';

  const cracks = svg('svg', {
    viewBox: '0 0 9 8',
    class: 'flyer__cracks',
    preserveAspectRatio: 'none',
  });
  CRACK_PATHS.forEach((d, i) => {
    cracks.appendChild(svg('path', { d, style: `transition-delay:${i * 40}ms` }));
  });

  wrap.append(heart, cracks);
  return wrap;
}

/**
 * Проиграть потерю одной жизни.
 * @param {{index?:number}} opts index — какое сердце «умирает» (по умолчанию последнее полное)
 * @returns {Promise<void>}
 */
export async function loseLife(opts = {}) {
  const index = Number.isInteger(opts.index) ? opts.index : Math.max(0, state.lives - 1);
  const heartEl = hud.hearts[index];
  const stage = document.querySelector('#stage');

  const rect = heartEl
    ? heartEl.getBoundingClientRect()
    : { left: window.innerWidth - 60, top: 24, width: 26, height: 23 };

  if (heartEl) heartEl.style.visibility = 'hidden';

  const flyer = buildFlyer(rect);
  stage.appendChild(flyer);

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tx = vw / 2 - cx;
  const ty = vh / 2 - cy;

  const reduce = device.reducedMotion;
  const duration = reduce ? 40 : 660;

  const flight = flyer.animate([
    { transform: 'translate(0px,0px) scale(1) rotate(0deg)' },
    {
      transform: `translate(${tx * 0.30}px, ${ty * 0.22 - vh * 0.10}px) scale(1.55) rotate(-7deg)`,
      offset: 0.34,
    },
    {
      transform: `translate(${tx * 0.78}px, ${ty * 0.82 - vh * 0.03}px) scale(2.10) rotate(5deg)`,
      offset: 0.72,
    },
    { transform: `translate(${tx}px, ${ty}px) scale(2.40) rotate(0deg)` },
  ], { duration, easing: 'cubic-bezier(.34,.05,.40,1)', fill: 'forwards' });

  // след из искр во время полёта
  let trailTimer = 0;
  if (!reduce) {
    const track = () => {
      const r = flyer.getBoundingClientRect();
      fx.trail(r.left + r.width / 2, r.top + r.height / 2, { color: '#ff8fa8', size: 5, life: 0.35 });
      trailTimer = requestAnimationFrame(track);
    };
    trailTimer = requestAnimationFrame(track);
  }

  // трещины появляются на середине пути
  setTimeout(() => {
    flyer.classList.add('is-cracked');
    if (!reduce) audio.crack();
  }, Math.round(duration * 0.55));

  await flight.finished.catch(() => {});
  cancelAnimationFrame(trailTimer);

  // ---- разбивается в центре ----
  flyer.remove();
  audio.shatter();

  const bx = cx + tx;
  const by = cy + ty;
  fx.burst(bx, by, {
    count: 22,
    colors: ['#e8253a', '#ff8b96', '#c03a5e', '#8d1226', '#ffd9e0'],
    speed: 330,
    size: 8,
    life: 0.95,
    gravity: 980,
    spread: Math.PI * 2,
    angle: -Math.PI / 2,
  });
  for (let i = 0; i < 6; i++) {
    fx.spark(bx, by, {
      color: '#ffb8c6', size: 4, life: 0.6,
      vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260,
    });
  }

  if (!reduce && stage) {
    stage.animate([
      { transform: 'translate(0,0)' },
      { transform: 'translate(-5px,2px)' },
      { transform: 'translate(4px,-2px)' },
      { transform: 'translate(0,0)' },
    ], { duration: 190, easing: 'ease-out' });
  }

  // счётчик и HUD
  state.loseLife();
  hud.animateLifeLost(index);
  if (heartEl) heartEl.style.visibility = '';
  hud.refresh();

  await wait(reduce ? 60 : 260);
}
