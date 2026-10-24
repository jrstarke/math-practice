import { el } from './dom';

/** Speech bubble showing the current hint / worked-solution step. */
export function createHintBubble(): { el: HTMLElement; set(text: string): void } {
  const node = el('div', { class: 'bubble', 'data-role': 'bubble', 'aria-live': 'polite' });
  return {
    el: node,
    set(text) {
      node.textContent = text;
      node.classList.toggle('empty', text === '');
    },
  };
}
