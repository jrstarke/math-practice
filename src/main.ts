import './styles.css';
import { mulberry32 } from './core/rng';
import { createStore } from './storage';
import { mountApp } from './ui/app';
import { createSilentSound } from './ui/sound';

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
  sound: createSilentSound(),
});
