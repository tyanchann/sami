/* interlude.js — короткая кинематографичная пауза между вопросами и мини-играми */

import { el, wait } from '../core/dom.js';
import { audio } from '../core/audio.js';
import { state } from '../state.js';
import { buildHeart, updateHeart } from '../ui/heart.js';
import { hud } from '../ui/hud.js';
import { fx } from '../ui/fx.js';

export function createInterludeScene(ctx) {
  let offBtn = null;

  return {
    id: 'interlude',

    mount(container) {
      hud.show(true);

      const heart = buildHeart({
        collected: state.fragmentList(),
        classes: 'heart-svg interlude__heart',
        label: 'Сердце',
      });
      const heartWrap = el('div', { class: 'interlude__heartwrap' }, heart);

      const line1 = el('p', { class: 'interlude__line interlude__line--1', text: 'три вопроса позади' });
      const line2 = el('p', { class: 'interlude__line interlude__line--2', text: 'впереди пять испытаний' });
      const names = el('p', {
        class: 'interlude__names',
        text: 'лук · машинки · стикман · сердечки · память',
      });
      const namesWrap = el('div', { class: 'interlude__nameswrap' }, names);

      const btn = el('button', { class: 'btn interlude__btn', type: 'button', text: 'к испытаниям' });
      const go = () => {
        audio.click();
        ctx.go(ctx.nextSceneId());
      };
      btn.addEventListener('click', go);
      offBtn = () => btn.removeEventListener('click', go);

      const view = el('div', { class: 'interlude' },
        heartWrap,
        el('div', { class: 'interlude__text' }, line1, line2),
        namesWrap,
        btn,
      );

      // сердце пульсирует, вокруг — тихие искры
      setTimeout(() => { if (heart.isConnected) heart.classList.add('is-beating'); }, 700);
      setTimeout(() => {
        if (!heart.isConnected) return;
        const r = heart.getBoundingClientRect();
        fx.burst(r.left + r.width / 2, r.top + r.height / 2, {
          count: 10,
          colors: ['#ffd0da', '#ff8fa8'],
          speed: 90,
          size: 4,
          life: 0.9,
          gravity: -40,
          spread: Math.PI * 2,
        });
      }, 500);

      updateHeart(heart, state.fragmentList());
      return view;
    },

    destroy() { if (offBtn) offBtn(); },
  };
}
