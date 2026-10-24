import { el } from './dom';

/** Hints longer than this (e.g. borrowing across a zero) use a smaller font so the bubble fits above the problem. */
export const LONG_HINT = 70;

/** Speech bubble showing the current hint / worked-solution step. */
export function createHintBubble(): { el: HTMLElement; set(text: string): void } {
  const node = el('div', { class: 'bubble', 'data-role': 'bubble', 'aria-live': 'polite' });
  return {
    el: node,
    set(text) {
      node.textContent = text;
      node.classList.toggle('empty', text === '');
      node.classList.toggle('long', text.length > LONG_HINT);
    },
  };
}
