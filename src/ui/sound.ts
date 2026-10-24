export interface SoundPlayer {
  unlock(): void;
  correct(): void;
  wrong(): void;
  levelUp(): void;
  setMuted(m: boolean): void;
}

export function createSilentSound(): SoundPlayer {
  const noop = () => {};
  return { unlock: noop, correct: noop, wrong: noop, levelUp: noop, setMuted: noop };
}
