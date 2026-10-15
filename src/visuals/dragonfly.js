import data from './dragonfly-data.js';

const ramp = ' .,:;+=xX#@';
const decode = encoded => Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
const frame = decode(data.grid);
const raw = decode(data.points);
const view = new DataView(raw.buffer);
const points = Array.from({ length: data.pointCount }, (_, i) => {
  const offset = i * 7;
  const x = view.getInt16(offset, true) / 16000;
  const y = view.getInt16(offset + 2, true) / 16000;
  const value = raw[offset + 6];
  const column = Math.round((x + 1) / 2 * (data.columns - 1));
  const row = Math.round((0.56 - y) / 1.12 * (data.rows - 1));
  return { x, y, z: view.getInt16(offset + 4, true) / 16000, value, accent: value > 90 && (column * 13 + row * 7) % 67 === 0 };
});

/**
 * A real-model ASCII depth cloud, rendered with Canvas 2D and no WebGL dependency.
 * Draws its embedded static frame synchronously. The caller owns intro timing.
 * Keep /art/dragonfly-ascii.svg behind the canvas for pre-module/no-canvas fallback.
 * @param {HTMLCanvasElement} canvas
 * @param {{ animated?: boolean }} options
 * @returns {{ stop: () => void, dispose: () => void }}
 */
export function mountDragonfly(canvas, { animated = true } = {}) {
  let context;
  try { context = canvas.getContext('2d', { alpha: false }); } catch {}
  if (!context) return { stop() {}, dispose() {} };

  let width = 1, height = 1, raf = 0, stopped = false;
  let resizeObserver;
  let started = performance.now(), lastFrame = 0;
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const lowPower = navigator.connection?.saveData || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 3);
  const canAnimate = animated && !motion?.matches && !lowPower;
  canvas.setAttribute('aria-hidden', 'true');

  function beginDrawing() {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const density = Math.min(window.devicePixelRatio || 1, 1.5);
    const scale = Math.min(width / data.width, height / data.height);
    context.setTransform(density * scale, 0, 0, density * scale, density * (width - data.width * scale) / 2, density * (height - data.height * scale) / 2);
    context.font = '10px NaturalMono, ui-monospace, monospace';
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
  }
  function glyph(value, x, y, accent = false) {
    context.globalAlpha = 0.11 + Math.min(7, Math.floor(value / 24)) * 0.035;
    context.fillStyle = accent ? '#FA4C14' : '#F2F2F2';
    context.fillText(ramp[Math.min(ramp.length - 1, Math.max(1, Math.floor(value / 20)))], x, y);
  }
  function drawStatic() {
    beginDrawing();
    for (let i = 0; i < frame.length; i++) {
      const value = frame[i];
      if (!value) continue;
      const column = i % data.columns, row = Math.floor(i / data.columns);
      glyph(value, column * 8 + 4, row * 8.96 + 8, value > 90 && (column * 13 + row * 7) % 67 === 0);
    }
    context.globalAlpha = 1;
  }
  function resize() {
    if (stopped) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width || canvas.clientWidth || window.innerWidth);
    height = Math.max(1, rect.height || canvas.clientHeight || window.innerHeight);
    const density = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    drawStatic();
  }
  function render(time) {
    if (stopped) return;
    raf = requestAnimationFrame(render);
    if (document.hidden || time - lastFrame < 1000 / 24) return;
    lastFrame = time;
    const seconds = Math.max(0, (time - started - 250) / 1000);
    if (!seconds) return;
    const yaw = Math.sin(seconds * 0.45) * 0.035;
    const pitch = Math.sin(seconds * 0.38) * 0.014;
    const cosine = Math.cos(yaw), sine = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    beginDrawing();
    for (const point of points) {
      const x = point.x * cosine + point.z * sine;
      const z = point.z * cosine - point.x * sine;
      const y = point.y * cp - z * sp;
      glyph(point.value, (x + 1) / 2 * (data.columns - 1) * 8 + 4, (0.56 - y) / 1.12 * (data.rows - 1) * 8.96 + 8, point.accent);
    }
    context.globalAlpha = 1;
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    resizeObserver?.disconnect();
    window.removeEventListener('resize', resize);
    motion?.removeEventListener?.('change', onMotionChange);
  }
  function onMotionChange(event) { if (event.matches) stop(); }
  // This call completes before mountDragonfly returns. It never waits on a fetch,
  // model decoder, font promise, animation frame or image load.
  resize();
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
  } else window.addEventListener('resize', resize, { passive: true });
  motion?.addEventListener?.('change', onMotionChange);
  if (canAnimate) raf = requestAnimationFrame(render);
  return { stop, dispose: stop };
}

export const dragonflyFallback = '/art/dragonfly-ascii.svg';
