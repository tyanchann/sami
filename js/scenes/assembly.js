/* assembly.js — финал, шаг 1: затемнение, восемь фрагментов слетаются в сердце
   и появляются две надписи. Других надписей в сцене нет. */

import { el } from '../core/dom.js';
import { device } from '../core/device.js';
import { audio } from '../core/audio.js';
import { state } from '../state.js';
import { buildHeart } from '../ui/heart.js';
import { hud } from '../ui/hud.js';
import { fx } from '../ui/fx.js';
import { FINAL_LINE_1, FINAL_LINE_2 } from '../data/texts.js';
import { finScene, autoExit } from './finaleKit.js';

export function createAssemblyScene(ctx) {
  let exit = null;
  let timers = [];

  // при «уменьшенном движении» финал идёт быстрее
  const K = () => (device.reducedMotion ? 0.55 : 1);
  const at = (ms, fn) => { timers.push(setTimeout(fn, Math.round(ms * K()))); };

  return {
    id: 'assembly',

    mount() {
      hud.setCinema(true);

      const heart = buildHeart({
        collected: state.fragmentList(),
        classes: 'heart-svg fin__heart',
        label: 'Сердце, собранное из восьми фрагментов',
      });

      // каждый фрагмент стартует со своего края экрана
      const pieces = Array.from(heart.querySelectorAll('.hp'));
      pieces.forEach((g, i) => {
        const a = (i / pieces.length) * Math.PI * 2 - Math.PI / 2 + 0.35;
        const dist = 92 + (i % 4) * 30;
        g.style.setProperty('--fx', `${(Math.cos(a) * dist).toFixed(1)}px`);
        g.style.setProperty('--fy', `${(Math.sin(a) * dist).toFixed(1)}px`);
        g.style.setProperty('--fr', `${((i % 2 ? 1 : -1) * (12 + i * 5)).toFixed(0)}deg`);
        g.style.setProperty('--fd', `${i * 80}ms`);
      });
      heart.classList.add('is-scattered');

      const line1 = el('p', { class: 'fin__line fin__line--1', text: FINAL_LINE_1 });
      const line2 = el('p', { class: 'fin__line fin__line--2', text: FINAL_LINE_2 });
      const lines = el('div', { class: 'fin__lines' }, line1, line2);

      exit = autoExit(ctx, 'eyes', 6200, { speed: K });

      const veil = el('span', { class: 'fin__veil', 'aria-hidden': 'true' });
      const view = finScene('assembly', veil,
        el('div', { class: 'fin__heartwrap' }, heart),
        lines);

      // 1. темнота; сердце собирается
      requestAnimationFrame(() => {
        heart.classList.remove('is-scattered');
        audio.heartbeat();
      });

      // 2. фрагменты встали — аккорд, пульс, искры
      at(1500, () => {
        if (!heart.isConnected) return;
        audio.assemble();
        heart.classList.add('is-beating');
        const r = heart.getBoundingClientRect();
        fx.burst(r.left + r.width / 2, r.top + r.height / 2, {
          count: 18,
          colors: ['#ffd0da', '#ff8fa8', '#f0537a'],
          speed: 120,
          size: 4,
          life: 1.1,
          gravity: -30,
        });
      });

      // 3. надписи — одна за другой
      at(1750, () => line1.classList.add('is-in'));
      at(2650, () => line2.classList.add('is-in'));

      // 4. стрелка «дальше» — только когда всё прочитано
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
