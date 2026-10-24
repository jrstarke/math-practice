import type { Progress } from '../core/progress';
import { el } from './dom';

export const INSTALL_TIP = 'Tip: tap Share, then "Add to Home Screen" to keep your progress safe and play full-screen.';

/** Only iOS Safari exposes `navigator.standalone`; false there means "not installed". */
export function shouldShowInstallTip(nav: { standalone?: boolean }, progress: Progress): boolean {
  return 'standalone' in nav && nav.standalone === false && !progress.installTipShown;
}

export function createInstallTip(): HTMLElement {
  return el('div', { class: 'install-tip', 'data-role': 'install-tip', role: 'note' },
    el('span', {}, INSTALL_TIP),
    el('button', { type: 'button', class: 'tip-dismiss', 'data-action': 'dismiss-tip', 'aria-label': 'Dismiss tip' }, '✕'));
}
