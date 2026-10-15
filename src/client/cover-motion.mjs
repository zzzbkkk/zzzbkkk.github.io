// One finite sequence per card entry. Re-entering can replay; moving between
// links in the same card never restarts the sequence. No touch hover handling.
export function setupCoverMotion(root = document) {
  const controller = new AbortController();
  const { signal } = controller;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const states = [];

  root.querySelectorAll('.work-card').forEach(card => {
    const cover = card.querySelector('[data-cover-motion]');
    if (!cover) return;
    const state = { cover, pointer: false, keyboard: false, played: false, timer: 0 };
    states.push(state);
    const reset = () => {
      clearTimeout(state.timer);
      cover.removeAttribute('data-cover-active');
      state.played = false;
    };
    const play = () => {
      if (reduced.matches || state.played) return;
      state.played = true;
      cover.setAttribute('data-cover-active', '');
      // OiiOii 840ms; Drimo 980ms; T5 560ms. A small tail allows the
      // final frame to finish before dropping the declarative state.
      const duration = { oiioii: 880, drimo: 1020, 'yesoul-t5': 600 }[cover.dataset.coverMotion] || 1020;
      state.timer = setTimeout(() => cover.removeAttribute('data-cover-active'), duration);
    };
    card.addEventListener('pointerenter', event => {
      if (!hover.matches || !['mouse', 'pen'].includes(event.pointerType)) return;
      state.pointer = true;
      play();
    }, { signal });
    card.addEventListener('pointerleave', () => {
      state.pointer = false;
      if (!state.keyboard) reset();
    }, { signal });
    card.addEventListener('focusin', event => {
      if (!event.target.matches(':focus-visible')) return;
      state.keyboard = true;
      play();
    }, { signal });
    card.addEventListener('focusout', event => {
      if (card.contains(event.relatedTarget)) return;
      state.keyboard = false;
      if (!state.pointer) reset();
    }, { signal });
  });

  const clear = () => states.forEach(state => {
    clearTimeout(state.timer);
    state.cover.removeAttribute('data-cover-active');
    state.played = false;
    state.pointer = false;
    state.keyboard = false;
  });
  reduced.addEventListener('change', clear, { signal });
  hover.addEventListener('change', clear, { signal });
  return () => { controller.abort(); clear(); };
}
