/* dom.js — крошечные помощники для DOM, анимаций и математики */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** создать HTML-элемент: el('div', {class:'x', text:'...'}, child1, child2) */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  applyProps(node, props);
  append(node, children);
  return node;
}

/** создать SVG-элемент */
export function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    node.setAttribute(k, v);
  }
  append(node, children);
  return node;
}

function applyProps(node, props) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
}

function append(node, children) {
  for (const c of children.flat(4)) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/** подписка с автоматической отпиской */
export function on(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  return () => target.removeEventListener(type, fn, opts);
}

/** навесить набор слушателей в «мешок» и снять их разом */
export function listenerBag() {
  const bag = [];
  const add = (target, type, fn, opts) => bag.push(on(target, type, fn, opts));
  add.clear = () => { while (bag.length) { try { bag.pop()(); } catch (_) {} } };
  return add;
}

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
export const randInt = (a, b) => Math.floor(rand(b + 1, a));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

/** обёртка над анимацией: всегда завершается, даже при reduced motion */
export function animate(node, keyframes, options = {}) {
  if (!node.animate) return Promise.resolve();
  if (window_matchMediaReduce()) return Promise.resolve();
  const anim = node.animate(keyframes, { duration: 300, easing: 'ease', fill: 'none', ...options });
  return anim.finished.catch(() => {});
}

let _rm = null;
export function window_matchMediaReduce() {
  if (_rm === null) _rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return _rm;
}

/** разделить длинную строку на слова-элементы (для каскадного появления) */
export function splitWords(text, cls = 'w') {
  return text.split(/(\s+)/).map((chunk) =>
    /^\s+$/.test(chunk) ? ' ' : el('span', { class: cls, text: chunk }));
}
