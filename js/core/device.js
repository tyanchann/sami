/* device.js — определение возможностей устройства и «уровня качества» эффектов
   Задача: на слабом телефоне автоматически включать облегчённый режим. */

const mqReduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const device = {
  touch: false,
  dpr: 1,
  cores: 4,
  memory: 4,
  quality: 'high',      // 'high' | 'low'
  reducedMotion: false,
  tiny: false,          // очень маленький экран
  _listeners: new Set(),
};

export function initDevice() {
  device.touch = (navigator.maxTouchPoints || 0) > 0 ||
    window.matchMedia('(pointer: coarse)').matches;
  device.dpr = Math.min(window.devicePixelRatio || 1, 2);
  device.cores = navigator.hardwareConcurrency || 4;
  device.memory = navigator.deviceMemory || 4;
  device.reducedMotion = mqReduce();

  // «слабое» устройство: мало ядер / мало памяти / очень старый браузер
  const weak = device.cores <= 4 && device.memory <= 4 && device.touch;
  device.quality = weak ? 'low' : 'high';
  document.documentElement.classList.toggle('low-fx', device.quality === 'low');

  const onResize = () => { device.tiny = window.innerWidth < 360 || window.innerHeight < 560; };
  onResize();
  window.addEventListener('resize', onResize, { passive: true });

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = (e) => { device.reducedMotion = e.matches; emit(); };
  if (mq.addEventListener) mq.addEventListener('change', onMq);

  window.addEventListener('resize', emit, { passive: true });
  return device;
}

function emit() { device._listeners.forEach((fn) => fn(device)); }

export function onDeviceChange(fn) {
  device._listeners.add(fn);
  return () => device._listeners.delete(fn);
}

/** понизить качество по факту просадки FPS (вызывается из loop.js) */
export function degradeQuality() {
  if (device.quality === 'low') return;
  device.quality = 'low';
  document.documentElement.classList.add('low-fx');
  emit();
}

/** масштаб canvas под dpr с ограничением (экономия памяти на мобильных) */
export function canvasScale(canvas, cssW, cssH) {
  const dpr = device.quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return dpr;
}
