import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { mulberry32 } from './core/rng';
import { createStore } from './storage';
import { mountApp } from './ui/app';
import { createSound } from './ui/sound';

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Dev only (stripped from builds): ?roboRng=<0..1> makes Robo's random picks fixed, so the layout check can play a
 * chosen celebration. Style k of a group of n (fresh memory) is (k + 0.5) / n. */
function devRoboRng(): (() => number) | undefined {
  if (!import.meta.env.DEV) return undefined;
  const v = Number(new URLSearchParams(location.search).get('roboRng') ?? NaN);
  return v >= 0 && v < 1 ? () => v : undefined;
}

mountApp({
  root: document.getElementById('app')!,
  rng: mulberry32(Date.now()),
  now: () => performance.now(),
  clock: () => Date.now(),
  store: createStore(safeLocalStorage()),
  sound: createSound(),
  version: __APP_VERSION__,
  roboRng: devRoboRng(),
});

registerSW({
  immediate: true,
  // A home-screen app is usually resumed, not relaunched, so also look for a new version each time it comes back
  // to the foreground. autoUpdate then activates it and reloads; progress is already saved after every answer.
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {}); // offline: try next time
    });
  },
});
