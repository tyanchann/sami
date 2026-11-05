/* questions.js — первый этап: три вопроса.
   Тексты вопросов, вариантов и правильные ответы — строго по заданию. */

import { el, wait } from '../core/dom.js';
import { audio } from '../core/audio.js';
import { state } from '../state.js';
import screens from '../ui/screens.js';
import hud from '../ui/hud.js';
import { loseLife } from '../ui/lifeLoss.js';
import { showFragmentReward } from '../ui/reward.js';
import { showRetry } from '../ui/retry.js';

export const QUESTIONS = [
  {
    q: 'Какого я роста?',
    options: ['155 см', '167 sm', '169'],
    correct: 2,
    piece: 0,
  },
  {
    q: 'Какой у меня телефон?',
    options: ['Honor x6a', 'Samsa 22', 'IPhone 12'],
    correct: 0,
    piece: 1,
  },
  {
    q: 'Сколько мне лет?',
    options: ['14 лет', '15', '18'],
    correct: 1,
    piece: 2,
  },
];

export function createQuestionsScene(ctx) {
  let busy = false;
  let qi = Math.min(state.questionsDone, QUESTIONS.length - 1);
  let view = null;
  let kickerEl = null;
  let dotsEl = null;
  let cardEl = null;
  let qEl = null;
  let optsEl = null;
  const offs = [];

  function renderHead() {
    kickerEl.textContent = `вопрос ${qi + 1} из ${QUESTIONS.length}`;
    dotsEl.innerHTML = '';
    for (let i = 0; i < QUESTIONS.length; i++) {
      const d = el('span', {
        class: 'quiz__dot' + (i < qi ? ' is-done' : i === qi ? ' is-on' : ''),
      });
      dotsEl.appendChild(d);
    }
  }

  function renderQuestion(animate = true) {
    const q = QUESTIONS[qi];
    renderHead();
    qEl.textContent = q.q;
    optsEl.innerHTML = '';

    q.options.forEach((text, i) => {
      const btn = el('button', {
        class: 'opt',
        type: 'button',
      },
        el('span', { class: 'opt__n', text: String(i + 1) }),
        el('span', { class: 'opt__t', text }),
      );
      btn.setAttribute('aria-label', `Вариант ${i + 1}: ${text}`);
      if (animate) {
        btn.style.animationDelay = `${60 + i * 70}ms`;
        btn.classList.add('opt--in');
      }
      btn.addEventListener('click', () => onAnswer(btn, i));
      optsEl.appendChild(btn);
    });

    cardEl.classList.remove('is-swap');
    void cardEl.offsetWidth;
    if (animate) cardEl.classList.add('is-swap');
  }

  async function onAnswer(btn, idx) {
    if (busy) return;
    busy = true;
    const q = QUESTIONS[qi];
    const buttons = Array.from(optsEl.querySelectorAll('.opt'));

    if (idx === q.correct) {
      /* ---------- верно ---------- */
      audio.correct();
      screens.flash('right');
      btn.classList.add('is-right');
      buttons.forEach((b) => { if (b !== btn) b.classList.add('is-dim'); b.disabled = true; });

      const r = btn.getBoundingClientRect();
      const from = { x: r.left + r.width / 2, y: r.top + r.height / 2 };

      await wait(300);
      await showFragmentReward(q.piece, { from });

      state.markQuestionDone(qi + 1);
      qi += 1;

      if (qi >= QUESTIONS.length) {
        await wait(120);
        busy = false;
        ctx.go('interlude');
        return;
      }
      await wait(80);
      renderQuestion(true);
      busy = false;
      return;
    }

    /* ---------- неверно ---------- */
    audio.wrong();
    screens.flash('wrong');
    btn.classList.add('is-wrong');
    btn.disabled = true;

    await wait(140);
    await loseLife({ index: Math.max(0, state.lives - 1) });

    if (state.isDead) {
      await showRetry({
        title: 'Сердце разбилось',
        text: 'Но это не конец. Собранные фрагменты остались с нами — попробуй ещё раз.',
        button: 'Попробовать снова',
      });
      state.refillLives();
      hud.refresh();
      hud.animateLifeGain(4);
      renderQuestion(true);
      busy = false;
      return;
    }

    // можно попробовать другой вариант
    btn.classList.add('is-dim');
    busy = false;
  }

  return {
    id: 'questions',

    mount(container) {
      hud.show(true);

      kickerEl = el('p', { class: 'kicker' });
      dotsEl = el('div', { class: 'quiz__dots', 'aria-hidden': 'true' });
      qEl = el('h2', { class: 'quiz__q', id: 'question-text' });
      optsEl = el('div', { class: 'quiz__opts' });
      cardEl = el('div', { class: 'card' }, qEl, optsEl);

      view = el('div', { class: 'quiz' },
        el('div', { class: 'quiz__head' }, kickerEl, dotsEl),
        cardEl,
      );
      view.setAttribute('aria-labelledby', 'question-text');

      renderQuestion(true);

      // если сюда вернулись после третьего вопроса — сразу дальше
      if (state.questionsDone >= QUESTIONS.length) {
        busy = true;
        wait(120).then(() => { busy = false; ctx.go('interlude'); });
      }

      return view;
    },

    destroy() {
      offs.forEach((f) => f());
      offs.length = 0;
      busy = true;   // блокируем «хвосты» анимаций после уничтожения сцены
    },
  };
}
