/* eyes.js — финал, шаг 2: чёрно-белое разбитое сердце,
   из темноты проявляются пиксельные глаза. */

import { el, svg } from '../core/dom.js';
import { device } from '../core/device.js';
import { audio } from '../core/audio.js';
import { hud } from '../ui/hud.js';
import { buildHeart } from '../ui/heart.js';
import { finScene, autoExit } from './finaleKit.js';

const W = 19;
const H = 17;

/** трещина по сердцу */
function crackSVG() {
  const root = svg('svg', {
    class: 'fin__crack', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true', focusable: 'false',
  });
  root.appendChild(svg('path', {
    d: 'M9.6 2.6 L8.1 5.6 L9.8 7.9 L8.0 10.4 L9.3 13.2 L8.6 15.4',
    stroke: '#100a19', 'stroke-width': 0.85, fill: 'none',
    'stroke-linejoin': 'miter', 'stroke-linecap': 'square',
  }));
  root.appendChild(svg('path', {
    d: 'M10.2 3.0 L8.8 5.9 L10.4 8.1 L8.7 10.5 L9.8 13.0',
    stroke: 'rgba(255,255,255,.28)', 'stroke-width': 0.3, fill: 'none',
  }));
  root.appendChild(svg('path', {
    d: 'M6.4 9.8 L9.0 8.6',
    stroke: '#100a19', 'stroke-width': 0.6, fill: 'none',
  }));
  root.appendChild(svg('path', {
    d: 'M12.8 6.4 L11.0 8.4',
    stroke: '#100a19', 'stroke-width': 0.55, fill: 'none',
  }));
  return root;
}

/** глаз: белок + зрачок, всё клетками */
function eyeSVG(cx, cy) {
  const g = svg('g', { class: 'fin__eye' });
  g.appendChild(svg('rect', { x: cx - 1.3, y: cy - 1.05, width: 2.6, height: 2.1, fill: '#efe6e9' }));
  g.appendChild(svg('rect', { x: cx - 0.75, y: cy - 0.75, width: 1.5, height: 1.5, fill: '#1a1226' }));
  g.appendChild(svg('rect', { x: cx - 0.35, y: cy - 0.55, width: 0.55, height: 0.55, fill: '#f8ecdf' }));
  return g;
}

function eyesSVG() {
  const root = svg('svg', {
    class: 'fin__eyes', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true', focusable: 'false',
  });
  root.appendChild(eyeSVG(6.9, 6.4));
  root.appendChild(eyeSVG(12.1, 6.4));
  return root;
}

export function createEyesScene(ctx) {
  let exit = null;
  let timers = [];
  const K = () => (device.reducedMotion ? 0.55 : 1);
  const at = (ms, fn) => { timers.push(setTimeout(fn, Math.round(ms * K()))); };

  return {
    id: 'eyes',

    mount() {
      hud.setCinema(true);

      const heart = buildHeart({
        collected: [0, 1, 2, 3, 4, 5, 6, 7],
        classes: 'heart-svg fin__heart fin__heart--mono',
        label: 'Разбитое сердце',
      });

      const art = el('div', { class: 'fin__art' }, heart, crackSVG(), eyesSVG());

      exit = autoExit(ctx, 'matrix', 5400, { speed: K });
      const view = finScene('eyes', art);

      audio.heartbeat();
      at(260, () => art.classList.add('is-cracked'));
      at(900, () => art.classList.add('is-eye1'));
      at(1500, () => art.classList.add('is-eye2'));
      at(2100, () => audio.heartbeat());
      exit.start();

      return view;
    },

    destroy() {
      timers.forEach(clearTimeout);
      timers = [];
      if (exit) exit.stop();
      exit = null;
      hud.setCinema(false);
    },
  };
}
