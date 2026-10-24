import { defaultProgress } from '../core/progress';
import { shouldShowInstallTip } from './installTip';

test.each([
  [{ standalone: false }, false, true],
  [{ standalone: true }, false, false],
  [{}, false, false],
  [{ standalone: false }, true, false],
])('nav %o, shown %s → %s', (nav, shown, expected) =>
  expect(shouldShowInstallTip(nav, { ...defaultProgress(), installTipShown: shown })).toBe(expected));
