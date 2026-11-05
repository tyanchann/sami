/* intro.js — титульный экран. Здесь же происходит первое касание:
   разблокируется звук и начинается история. */

import { el } from '../core/dom.js';
import { audio } from '../core/audio.js';
import { state } from '../state.js';
import { buildHeart, updateHeart } from '../ui/heart.js';
import { hud } from '../ui/hud.js';

export function createIntroScene(ctx) {
  let offClick = null;
  let offState = null;

  return {
    id: 'intro',

    mount(container) {
      const fragments = state.fragmentList();
      const returning = fragments.length > 0;

      const view = el('div', { class: 'intro' });

      const heart = buildHeart({
        collected: fragments,
        classes: 'heart-svg intro__heart heart-float',
        label: 'Разбитое сердце',
      });

      const kicker = el('p', { class: 'kicker', text: 'маленькая история' });
      const title = el('h1', { class: 'title', text: 'SAMINA' });
      const sub = el('p', {
        class: 'subtitle',
        text: returning
          ? `собрано ${fragments.length} из 8 фрагментов`
          : 'восемь фрагментов, пять испытаний и одно письмо',
      });

      const btn = el('button', {
        class: 'btn',
        type: 'button',
        text: returning ? 'продолжить' : 'начать',
      });
      btn.setAttribute('aria-label', returning ? 'Продолжить историю' : 'Начать историю');

      const stack = el('div', { class: 'intro__stack' }, kicker, heart, title, sub, btn);
      view.append(stack);

      // точка входа в «этап вопросов»
      offClick = () => btn.removeEventListener('click', onStart);
      const onStart = () => {
        btn.classList.add('is-tapped');
        setTimeout(() => btn.classList.remove('is-tapped'), 180);
        audio.unlock();
        audio.click();
        ctx.go(returning && state.questionsDone > 0 ? ctx.nextSceneId() : 'questions');
      };
      btn.addEventListener('click', onStart);

      // если фрагменты появятся/сбросятся, пока открыт титульный экран
      offState = state.subscribe(() => {
        updateHeart(heart, state.fragmentList());
      });

      hud.show(true);
      return view;
    },

    destroy() {
      if (offClick) offClick();
      if (offState) offState();
    },
  };
}
