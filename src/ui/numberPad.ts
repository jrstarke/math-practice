import type { Key } from '../core/entry';
import { el } from './dom';

const LAYOUT: [Key, string][] = [
  ['1', '1'], ['2', '2'], ['3', '3'],
  ['4', '4'], ['5', '5'], ['6', '6'],
  ['7', '7'], ['8', '8'], ['9', '9'],
  ['back', '⌫'], ['0', '0'], ['submit', '✓'],
];

export function createNumberPad(): HTMLElement {
  return el('div', { class: 'pad' },
    ...LAYOUT.map(([key, label]) =>
      el('button', { type: 'button', class: `key key-${key}`, 'data-key': key, 'aria-label': key === 'back' ? 'Delete' : key === 'submit' ? 'Check' : key }, label)));
}

/** Map a hardware key to a pad key, or null if it isn't one. */
export function keyFromKeyboard(e: KeyboardEvent): Key | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (/^[0-9]$/.test(e.key)) return e.key as Key;
  if (e.key === 'Backspace') return 'back';
  if (e.key === 'Enter') return 'submit';
  return null;
}
