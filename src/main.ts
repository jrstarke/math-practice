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

mountApp({
  root: document.getElementById('app')!,
  rng: mulberry32(Date.now()),
  now: () => performance.now(),
  store: createStore(safeLocalStorage()),
  sound: createSound(),
  version: __APP_VERSION__,
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
