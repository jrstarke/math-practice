// @vitest-environment jsdom
import { defaultProgress, type Progress } from '../core/progress';
import { hintLimit, solve } from '../core/solver';
import { localDate } from '../core/days';
import { setup, START } from './testUtil';

test('renders a problem and number pad', () => {
  const s = setup();
  expect(s.current().a).toBeGreaterThan(0);
  for (const k of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', 'submit']) expect(s.q(`[data-key="${k}"]`)).not.toBeNull();
});

test('shows the build version above the mute button when given one', () => {
  const s = setup(1, { version: '2026-10-25 21:39 UTC' });
  const version = s.q('[data-role="version"]')!;
  expect(version.textContent).toBe('2026-10-25 21:39 UTC');
  expect(version.nextElementSibling).toBe(s.q('[data-action="mute"]'));
});

test('shows no version label without one', () => {
  const s = setup();
  expect(s.q('[data-role="version"]')).toBeNull();
});

test('correct answer records once, plays sound, advances after 1s', () => {
  const s = setup();
  const first = s.current();
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.saved).toHaveLength(1);
  expect(s.sound.correct.mock.calls.length + s.sound.levelUp.mock.calls.length).toBe(1);
  expect(s.q('[data-role="answer"]')!.classList.contains('correct')).toBe(true);
  expect(s.saved[0].streak).toBe(1);
  s.advance(1000);
  expect(s.current()).not.toEqual(first);
  expect(s.answerText()).toBe('');
});

test('total badge shows the saved total and goes up on a clean answer', () => {
  const s = setup(1, {}, { ...defaultProgress(), total: 41, streak: 3 });
  expect(s.q('[data-role="total"]')!.textContent).toBe('⭐ 41');
  expect(s.q('[data-role="streak"]')).toBeNull(); // hidden for now; still counted
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.q('[data-role="total"]')!.textContent).toBe('⭐ 42');
  expect(s.saved[0].total).toBe(42);
});

test('a wrong first try resets the streak but keeps the total', () => {
  const s = setup(1, {}, { ...defaultProgress(), total: 41, streak: 3 });
  s.typeAnswer(s.correctAnswer() + 1);
  s.tap('[data-key="submit"]');
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.q('[data-role="total"]')!.textContent).toBe('⭐ 41');
  expect(s.saved.at(-1)!.streak).toBe(0);
});

test('double-tapping submit on a correct answer records only once', () => {
  const s = setup();
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  s.tap('[data-key="submit"]');
  s.tap('[data-key="5"]');
  expect(s.saved).toHaveLength(1);
  s.advance(1000);
  expect(s.answerText()).toBe('');
});

test('wrong answer fades, shows message, does not record', () => {
  const s = setup();
  s.typeAnswer(s.correctAnswer() + 1);
  s.tap('[data-key="submit"]');
  expect(s.saved).toHaveLength(0);
  expect(s.sound.wrong).toHaveBeenCalledOnce();
  expect(s.q('[data-role="answer"]')!.classList.contains('faded')).toBe(true);
  expect(s.q('[data-role="message"]')!.textContent).toBe('Not quite — try again');
});

test('then correct after wrong resets streak to 0', () => {
  const s = setup();
  s.typeAnswer(s.correctAnswer() + 1);
  s.tap('[data-key="submit"]');
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.saved).toHaveLength(1);
  expect(s.saved[0].streak).toBe(0);
});

test('slow-but-correct timing is measured from display to first submit', () => {
  const s = setup();
  s.advance(60_000);
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.saved[0].streak).toBe(1); // slow answers still count for the streak
});

test('hardware keyboard works', () => {
  const s = setup();
  for (const d of String(s.correctAnswer())) window.dispatchEvent(new KeyboardEvent('keydown', { key: d }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(s.saved).toHaveLength(1);
});

test('tapping a scratch box routes digits there, not to the answer', () => {
  const s = setup(7, {}, { ...defaultProgress(), addition: { level: 4, window: [], calibrationLeft: 10 } });
  const box = s.q('[data-scratch]');
  expect(box).not.toBeNull(); // calibration always picks the current level; level 4 problems have boxes
  box!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  s.tap('[data-key="1"]');
  expect(s.q('[data-scratch]')!.textContent).toBe('1');
  expect(s.q('[data-scratch]')!.classList.contains('focused')).toBe(true);
  expect(s.answerText()).toBe('');
  s.tap('[data-role="answer"]');
  s.tap('[data-key="2"]');
  expect(s.answerText()).toBe('2');
});

test('first pointerdown unlocks sound', () => {
  const s = setup();
  s.tap('[data-key="3"]');
  expect(s.sound.unlock).toHaveBeenCalled();
});

test('destroy removes keyboard listener', () => {
  const s = setup();
  s.app.destroy();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(s.saved).toHaveLength(0);
});

test('mute toggle saves and updates icon', () => {
  const s = setup();
  expect(s.sound.setMuted).toHaveBeenLastCalledWith(false);
  expect(s.q('[data-action="mute"]')!.textContent).toBe('🔊');
  s.tap('[data-action="mute"]');
  expect(s.sound.setMuted).toHaveBeenLastCalledWith(true);
  expect(s.saved.at(-1)!.muted).toBe(true);
  expect(s.q('[data-action="mute"]')!.textContent).toBe('🔇');
  s.tap('[data-action="mute"]');
  expect(s.sound.setMuted).toHaveBeenLastCalledWith(false);
});

test('install tip shows on iOS Safari and dismiss saves installTipShown', () => {
  const s = setup(1, { nav: { standalone: false } });
  expect(s.q('[data-role="install-tip"]')!.textContent).toContain('Add to Home Screen');
  s.tap('[data-action="dismiss-tip"]');
  expect(s.q('[data-role="install-tip"]')).toBeNull();
  expect(s.saved.at(-1)!.installTipShown).toBe(true);
});

test('install tip hidden when not iOS Safari', () => {
  const s = setup(1, { nav: {} });
  expect(s.q('[data-role="install-tip"]')).toBeNull();
});

test('sound unlock is retried on every pointerup and keydown (iOS gesture rules)', () => {
  const s = setup();
  s.q('[data-key="3"]')!.dispatchEvent(new Event('pointerup', { bubbles: true }));
  s.q('[data-key="3"]')!.dispatchEvent(new Event('pointerup', { bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
  expect(s.sound.unlock).toHaveBeenCalledTimes(3);
});

// One clean, quick answer at level 1 during calibration, after a perfect one, moves addition to 2 and unlocks subtraction.
const nearUnlock = () => ({ ...defaultProgress(), addition: { level: 1, window: [1], calibrationLeft: 9 } });

test('unlocking subtraction plays the level-up sound and shows a friendly message', () => {
  const s = setup(1, {}, nearUnlock());
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.sound.levelUp).toHaveBeenCalledOnce();
  expect(s.sound.correct).not.toHaveBeenCalled();
  const msg = s.q('[data-role="message"]')!;
  expect(msg.textContent).toBe('New: subtraction!');
  expect(msg.classList.contains('good')).toBe(true);
  expect(s.saved[0].unlocked).toEqual(['addition', 'subtraction']);
});

// Addition 6 / subtraction 5 meets multiplication's unlock rule; calibrating (calibrationLeft > 0)
// keeps each op at its own level, so whichever op is drawn, finish() checks unlocks on this answer.
const nearMultiplication = (): Progress => ({
  ...defaultProgress(),
  unlocked: ['addition', 'subtraction'],
  addition: { level: 6, window: [], calibrationLeft: 9 },
  subtraction: { level: 5, window: [], calibrationLeft: 9 },
});

test('reaching addition 6 / subtraction 5 shows exactly one "New: multiplication!"', () => {
  const s = setup(1, {}, nearMultiplication());
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.sound.levelUp).toHaveBeenCalledOnce();
  expect(s.q('[data-role="message"]')!.textContent).toBe('New: multiplication!');
  expect(s.saved[0].unlocked).toEqual(['addition', 'subtraction', 'multiplication']);
  s.advance(1000);
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.q('[data-role="message"]')!.textContent).not.toContain('New:');
  expect(s.saved[1].unlocked).toEqual(['addition', 'subtraction', 'multiplication']);
});

// Only multiplication unlocked, calibrating at level 1, so every problem is multiplication
// at a known level — bypasses storage validation entirely via testUtil's raw `initial` override.
const multiplicationOnly = (level = 1): Progress => ({
  ...defaultProgress(),
  unlocked: ['multiplication'],
  multiplication: { level, window: [], calibrationLeft: 10 },
});

test('multiplication renders the horizontal × layout and records a clean answer', () => {
  const s = setup(1, {}, multiplicationOnly());
  expect(s.current().op).toBe('×');
  expect(s.q('[data-role="op"]')!.textContent).toBe('×');
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.saved).toHaveLength(1);
  expect(s.saved[0].streak).toBe(1);
  expect(s.q('[data-role="answer"]')!.classList.contains('correct')).toBe(true);
});

test('multiplication: Hint is gated at hintLimit (never reaching the pass-only step), Pass reveals the rest', () => {
  const s = setup(1, {}, multiplicationOnly());
  const c = s.current();
  const steps = solve({ op: '×', a: c.a, b: c.b, level: 1 });
  const limit = hintLimit(steps);
  expect(limit).toBeLessThan(steps.length); // multiplication's trailing step is pass-only

  for (let i = 0; i < limit; i++) s.tap('[data-action="hint"]');
  expect((s.q('[data-action="hint"]') as HTMLButtonElement).disabled).toBe(true);
  expect(s.root.querySelectorAll('[data-ghost]').length).toBe(0); // answer not yet revealed
  const bubbleAtLimit = s.q('[data-role="bubble"]')!.textContent;

  // A determined extra tap on the disabled Hint button must not reach the pass-only step.
  s.tap('[data-action="hint"]');
  expect(s.q('[data-role="bubble"]')!.textContent).toBe(bubbleAtLimit);
  expect(s.q('[data-role="bubble"]')!.textContent).not.toBe(steps.at(-1)!.text);
  expect(s.root.querySelectorAll('[data-ghost]').length).toBe(0);

  s.tap('[data-action="pass"]');
  const ghosts = [...s.root.querySelectorAll('[data-ghost]')]
    .sort((x, y) => Number(x.getAttribute('data-ghost')) - Number(y.getAttribute('data-ghost')))
    .reverse()
    .map(e => e.textContent)
    .join('');
  expect(ghosts).toBe(String(c.a * c.b));
  expect(s.q('[data-action="next"]')).not.toBeNull();
});

test('multiplication: picture appears only after the first hint tap', () => {
  const s = setup(1, {}, multiplicationOnly());
  expect(s.q('[data-role="picture"]')!.children.length).toBe(0);
  s.tap('[data-action="hint"]');
  expect(s.q('[data-role="picture"]')!.children.length).toBeGreaterThan(0);
});

test('unlock message survives the auto-advance and clears on the next key', () => {
  const s = setup(1, {}, nearUnlock());
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  s.advance(1000);
  expect(s.q('[data-role="message"]')!.textContent).toBe('New: subtraction!');
  s.tap('[data-key="1"]');
  expect(s.q('[data-role="message"]')!.textContent).toBe('');
  expect(s.q('[data-role="message"]')!.classList.contains('good')).toBe(false);
});

// Only division unlocked, calibrating at level 1, so every problem is division at a known level.
const divisionOnly = (): Progress => ({
  ...defaultProgress(),
  unlocked: ['division'],
  multiplication: { level: 5, window: [], calibrationLeft: 0 },
  division: { level: 1, window: [], calibrationLeft: 10 },
});

test('division renders the horizontal ÷ layout and records a clean answer', () => {
  const s = setup(1, {}, divisionOnly());
  expect(s.current().op).toBe('÷');
  expect(s.q('.problem.horizontal')).not.toBeNull();
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.saved[0].streak).toBe(1);
});

test('division: the picture with its pile appears only after the first hint; Pass fills the answer', () => {
  const s = setup(1, {}, divisionOnly());
  const c = s.current();
  expect(s.q('[data-role="picture"]')!.children.length).toBe(0);
  s.tap('[data-action="hint"]');
  expect(s.q('[data-role="picture"] .pile')).not.toBeNull();
  s.tap('[data-action="pass"]');
  s.advance(10000);
  const ghosts = [...s.root.querySelectorAll('[data-ghost]')]
    .sort((x, y) => Number(x.getAttribute('data-ghost')) - Number(y.getAttribute('data-ghost')))
    .reverse().map(e => e.textContent).join('');
  expect(ghosts).toBe(String(c.a / c.b));
});

test('reaching multiplication 2 announces division and the next 3 problems are division', () => {
  const nearDivision: Progress = {
    ...defaultProgress(),
    unlocked: ['addition', 'subtraction', 'multiplication'],
    addition: { level: 9, window: [], calibrationLeft: 0 },
    subtraction: { level: 9, window: [], calibrationLeft: 0 },
    multiplication: { level: 1, window: [1], calibrationLeft: 9 },
    welcome: { op: 'multiplication', left: 1 }, // makes the first problem ×, whatever the seed
  };
  const s = setup(1, {}, nearDivision);
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.q('[data-role="message"]')!.textContent).toBe('New: division!');
  for (let i = 0; i < 3; i++) {
    s.advance(1000);
    expect(s.current().op).toBe('÷');
    s.typeAnswer(s.correctAnswer());
    s.tap('[data-key="submit"]');
  }
  expect(s.saved.at(-1)!.welcome).toBeNull();
});

describe('Robo', () => {
  const robo = (s: ReturnType<typeof setup>) => s.q('[data-role="robo"]')!;
  const light = (s: ReturnType<typeof setup>) => robo(s).querySelector<HTMLElement>('.robo-figure')!.dataset.light;
  const roboSays = (s: ReturnType<typeof setup>) => s.q('[data-role="robo-bubble"]')!.textContent;
  const message = (s: ReturnType<typeof setup>) => s.q('[data-role="message"]')!;
  const answerRight = (s: ReturnType<typeof setup>) => { s.typeAnswer(s.correctAnswer()); s.tap('[data-key="submit"]'); };
  const answerWrong = (s: ReturnType<typeof setup>) => { s.typeAnswer(s.correctAnswer() + 1); s.tap('[data-key="submit"]'); };
  const standing = { roboMode: 'standing' as const };
  // Hidden just now, so no welcome: these tests see only the walk.
  const at39 = () => ({ ...defaultProgress(), total: 39, hiddenAt: START });

  // Rectangles like an upright iPad, so Robo has room to go up beside the problem (jsdom's are all zeros).
  function ipadRects() {
    const boxes: [string, DOMRect][] = [
      ['stage', new DOMRect(16, 80, 778, 540)],
      ['problem-anchor', new DOMRect(300, 200, 200, 200)],
      ['controls', new DOMRect(175, 640, 460, 428)],
    ];
    return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return boxes.find(([cls]) => this.classList.contains(cls))?.[1] ?? new DOMRect(0, 0, 0, 0);
    });
  }
  afterEach(() => vi.restoreAllMocks());

  test('Robo watches with its light off while she works', () => {
    const s = setup(1, standing);
    expect(light(s)).toBe('off');
    expect(robo(s).hidden).toBe(false);
    expect(robo(s).getAttribute('aria-hidden')).toBe('true');
  });

  test('a wrong answer turns Robo red with "Not quite — try again!"; her next key turns it off', () => {
    const s = setup(1, standing);
    answerWrong(s);
    expect(light(s)).toBe('red');
    expect(roboSays(s)).toBe('Not quite — try again!');
    expect(message(s).textContent).toContain('Not quite — try again');
    expect(message(s).classList.contains('sr-only')).toBe(true);
    s.tap('[data-key="back"]');
    expect(light(s)).toBe('off');
    expect(roboSays(s)).toBe('');
  });

  test('right after a wrong try Robo says "You got it!"', () => {
    const s = setup(1, standing);
    answerWrong(s);
    s.tap('[data-key="back"]'); s.tap('[data-key="back"]'); s.tap('[data-key="back"]'); s.tap('[data-key="back"]');
    answerRight(s);
    expect(light(s)).toBe('green');
    expect(roboSays(s)).toBe('You got it!');
  });

  test('a clean right answer: green, no words', () => {
    const s = setup(1, standing);
    answerRight(s);
    expect(light(s)).toBe('green');
    expect(roboSays(s)).toBe('');
    s.advance(1000);
    expect(light(s)).toBe('off');
  });

  test('Hint sends Robo up and shows the hint in the bubble; the next problem brings it back', () => {
    ipadRects();
    const s = setup(1, standing);
    s.tap('[data-action="hint"]');
    expect(robo(s).dataset.place).toBe('up');
    expect(s.q('[data-role="bubble"]')!.classList.contains('robo-says')).toBe(true);
    expect(s.q('[data-role="bubble"]')!.textContent).not.toBe('');
    expect(robo(s).querySelector<HTMLElement>('.robo-figure')!.dataset.mouth).toBe('talk');
    answerRight(s);
    s.advance(1000);
    expect(robo(s).dataset.place).toBe('spot');
    expect(s.q('[data-role="bubble"]')!.classList.contains('robo-says')).toBe(false);
  });

  test('Hint with no room beside the problem: Robo points from its spot', () => {
    const s = setup(1, standing); // jsdom: every rectangle is zero, so there's no room
    s.tap('[data-action="hint"]');
    expect(robo(s).dataset.place).toBe('point');
    expect(s.q('[data-role="bubble"]')!.classList.contains('robo-says')).toBe(false);
  });

  test('a wrong answer while Robo is up keeps the hint and shows the message on the text line', () => {
    ipadRects();
    const s = setup(1, standing);
    s.tap('[data-action="hint"]');
    const hint = s.q('[data-role="bubble"]')!.textContent;
    answerWrong(s);
    expect(s.q('[data-role="bubble"]')!.textContent).toBe(hint);
    expect(message(s).textContent).toContain('Not quite — try again');
    expect(message(s).classList.contains('sr-only')).toBe(false);
    expect(light(s)).toBe('red');
    s.tap('[data-key="back"]');
    expect(light(s)).toBe('off');
  });

  test('right after hints while up: "You figured it out!" in the bubble beside the problem', () => {
    ipadRects();
    const s = setup(1, standing);
    s.tap('[data-action="hint"]');
    answerRight(s);
    expect(light(s)).toBe('green');
    expect(s.q('[data-role="bubble"]')!.textContent).toBe('You figured it out!');
  });

  test('reaching 40 stars plays the walk with its words and the chirp, and it ends after 4s', () => {
    const s = setup(1, standing, at39());
    answerRight(s);
    expect(s.q('[data-moment="walk"]')).not.toBeNull();
    expect(s.q('[data-role="moment-words"]')!.textContent).toBe("You've gotten 40 questions right! Keep going!");
    expect(s.sound.robo).toHaveBeenCalledOnce();
    expect(s.sound.correct).toHaveBeenCalledOnce();
    s.advance(4000);
    expect(s.q('[data-role="robo-moment"]')!.childElementCount).toBe(0);
    expect(robo(s).hasAttribute('data-away')).toBe(false);
  });

  test('reaching multiplication 2 kicks with "New: division!"', () => {
    const s = setup(1, standing, {
      ...defaultProgress(),
      unlocked: ['addition', 'subtraction', 'multiplication'],
      addition: { level: 9, window: [], calibrationLeft: 0 },
      subtraction: { level: 9, window: [], calibrationLeft: 0 },
      multiplication: { level: 1, window: [1], calibrationLeft: 9 },
      welcome: { op: 'multiplication', left: 1 },
    });
    answerRight(s);
    expect(s.q('[data-moment="kick"]')).not.toBeNull();
    expect(s.q('[data-role="moment-words"]')!.textContent).toBe('New: division!');
    expect(message(s).textContent).toBe('New: division!');
    expect(message(s).classList.contains('sr-only')).toBe(true);
    expect(s.sound.levelUp).toHaveBeenCalledOnce();
  });

  test('tapping Hint during a walk ends the walk and sends Robo up', () => {
    ipadRects();
    const s = setup(1, standing, at39());
    answerRight(s);
    s.advance(1000);
    expect(s.q('[data-moment]')).not.toBeNull();
    s.tap('[data-action="hint"]');
    expect(s.q('[data-moment]')).toBeNull();
    expect(s.root.querySelectorAll('[data-role="robo"]')).toHaveLength(1);
    expect(robo(s).hasAttribute('data-away')).toBe(false);
    expect(robo(s).dataset.place).toBe('up');
  });

  test('rotating to a layout with no room and back: Robo hides, then goes up beside the hint again', () => {
    ipadRects();
    const s = setup(1); // no roboMode: measured from the (mocked) layout
    s.tap('[data-action="hint"]');
    expect(robo(s).dataset.place).toBe('up');
    const wide = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('controls') ? new DOMRect(560, 16, 500, 780) : new DOMRect(0, 0, 0, 0);
    });
    window.dispatchEvent(new Event('resize'));
    expect(robo(s).hidden).toBe(true);
    expect(s.q('[data-role="bubble"]')!.classList.contains('robo-says')).toBe(false);
    wide.mockRestore();
    ipadRects();
    window.dispatchEvent(new Event('resize'));
    expect(robo(s).hidden).toBe(false);
    expect(robo(s).dataset.place).toBe('up');
    expect(s.q('[data-role="bubble"]')!.classList.contains('robo-says')).toBe(true);
  });

  test('wrong, then Hint: Robo goes up without the words and the text line shows them', () => {
    ipadRects();
    const s = setup(1, standing);
    answerWrong(s);
    expect(roboSays(s)).toBe('Not quite — try again!');
    s.tap('[data-action="hint"]');
    expect(robo(s).dataset.place).toBe('up');
    expect(roboSays(s)).toBe('');
    expect(message(s).classList.contains('sr-only')).toBe(false);
  });

  test('a wrong answer during a walk: when the walk ends, Robo says it and the text line hands back', () => {
    const s = setup(1, standing, at39());
    answerRight(s);
    s.advance(1000);
    answerWrong(s);
    expect(message(s).classList.contains('sr-only')).toBe(false);
    s.advance(3000); // the walk ends
    expect(roboSays(s)).toBe('Not quite — try again!');
    expect(message(s).classList.contains('sr-only')).toBe(true);
  });

  test('rotating mid-walk into a layout with no room ends the walk', () => {
    ipadRects();
    const s = setup(1, {}, at39());
    answerRight(s);
    expect(s.q('[data-moment="walk"]')).not.toBeNull();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('controls') ? new DOMRect(560, 16, 500, 780) : new DOMRect(0, 0, 0, 0);
    });
    window.dispatchEvent(new Event('resize'));
    expect(s.q('[data-moment]')).toBeNull();
  });

  test('the next problem appearing mid-walk refits the walk to the room under it', () => {
    let anchorBottom = 400;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('stage')) return new DOMRect(16, 80, 778, 540); // bottom 620
      if (this.classList.contains('problem-anchor')) return new DOMRect(300, 200, 200, anchorBottom - 200);
      if (this.classList.contains('controls')) return new DOMRect(175, 640, 460, 428);
      return new DOMRect(0, 0, 0, 0);
    });
    const s = setup(1, standing, at39());
    answerRight(s);
    expect(s.q('[data-moment="walk"]')!.style.height).toBe('136px');
    anchorBottom = 540; // a taller column problem comes next: 80 px left under it
    s.advance(1000);
    const walk = s.q('[data-moment="walk"]')!;
    expect([walk.style.top, walk.style.height]).toEqual(['544px', '76px']);
  });

  test('a resize that leaves the layout where it was does not cut a walk short', () => {
    ipadRects();
    const s = setup(1, {}, at39());
    answerRight(s);
    window.dispatchEvent(new Event('resize'));
    expect(s.q('[data-moment="walk"]')).not.toBeNull();
  });

  test('rotating mid-peek into a layout with room ends the peek: only one Robo', () => {
    const wide = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('controls') ? new DOMRect(560, 16, 500, 780) : new DOMRect(0, 0, 0, 0);
    });
    const s = setup(1, {}, at39());
    expect(robo(s).hidden).toBe(true);
    answerRight(s);
    expect(s.q('[data-moment="peek"]')).not.toBeNull();
    wide.mockRestore();
    ipadRects();
    window.dispatchEvent(new Event('resize'));
    expect(robo(s).hidden).toBe(false);
    expect(s.q('[data-moment]')).toBeNull();
  });

  test('a wrong answer during a walk shows the message on the text line', () => {
    const s = setup(1, standing, at39());
    answerRight(s);
    s.advance(1000);
    answerWrong(s);
    expect(message(s).textContent).toContain('Not quite — try again');
    expect(message(s).classList.contains('sr-only')).toBe(false);
  });

  test('a walk that ended early does not cut short a later moment', () => {
    const s = setup(1, { ...standing, roboRng: () => 0 }, at39());
    answerRight(s); // t=0: the walk starts; its timer would end it at 4000
    s.advance(1000);
    s.tap('[data-action="hint"]'); // ends the walk now
    answerRight(s); // hinted: a line, no surprise
    s.advance(2000);
    answerRight(s); // t=3000: clean, so a surprise until 4200
    expect(robo(s).dataset.surprise).toMatch(/^(wave|bounce)$/);
    s.advance(1000); // t=4000: the ended walk's timer must not fire
    expect(robo(s).hasAttribute('data-surprise')).toBe(true);
    s.advance(200);
    expect(robo(s).hasAttribute('data-surprise')).toBe(false);
  });

  test('destroy during a walk removes Robo and fires no more timers', () => {
    const s = setup(1, standing, at39());
    answerRight(s);
    s.app.destroy();
    expect(document.querySelector('[data-role="robo"]')).toBeNull();
    expect(document.querySelector('[data-role="robo-moment"]')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  test('peek mode: hints and messages work as today, and 40 stars plays a peek', () => {
    const s = setup(1, { roboMode: 'peek' }, at39());
    expect(robo(s).hidden).toBe(true);
    s.tap('[data-action="hint"]');
    expect(s.q('[data-role="bubble"]')!.classList.contains('robo-says')).toBe(false);
    answerWrong(s);
    expect(message(s).classList.contains('sr-only')).toBe(false);
    s.tap('[data-key="back"]'); s.tap('[data-key="back"]'); s.tap('[data-key="back"]'); s.tap('[data-key="back"]');
    answerRight(s); // not clean: no star, so no walk
    s.advance(1000);
    answerRight(s); // clean: the 40th star
    expect(s.q('[data-moment="peek"]')).not.toBeNull();
    expect(s.q('[data-role="moment-words"]')!.textContent).toBe("You've gotten 40 questions right! Keep going!");
  });

  test('a surprise plays now and then on a clean answer', () => {
    const s = setup(1, { ...standing, roboRng: () => 0 });
    answerRight(s);
    expect(robo(s).dataset.surprise).toMatch(/^(wave|bounce)$/);
    s.advance(1200);
    expect(robo(s).hasAttribute('data-surprise')).toBe(false);
  });

  // ---- Welcome and the day streak ----
  const MIN = 60_000;
  const today = localDate(new Date(START));
  const yesterday = localDate(new Date(START - 24 * 60 * MIN));
  const sawWelcome = (s: ReturnType<typeof setup>) => /some math!$/.test(roboSays(s) ?? '');

  test('opening the app for the first time: Robo waves and says hi', () => {
    const s = setup(1, standing);
    expect(roboSays(s)).toBe("Hi! Let's do some math!");
    expect(robo(s).dataset.surprise).toBe('wave');
    expect(s.sound.robo).toHaveBeenCalledTimes(1);
    s.advance(3000);
    expect(roboSays(s)).toBe('');
    expect(robo(s).hasAttribute('data-surprise')).toBe(false);
  });

  test('opening the app again: "Welcome back"; her first key clears the words', () => {
    const s = setup(1, standing, { ...defaultProgress(), total: 41 });
    expect(roboSays(s)).toBe("Welcome back, let's do some math!");
    s.tap('[data-key="1"]');
    expect(roboSays(s)).toBe('');
  });

  test('a reload soon after a short switch is not a fresh start', () => {
    expect(sawWelcome(setup(1, standing, { ...defaultProgress(), total: 41, hiddenAt: START - 5 * MIN }))).toBe(false);
    expect(sawWelcome(setup(1, standing, { ...defaultProgress(), total: 41, hiddenAt: START - 31 * MIN }))).toBe(true);
  });

  test('coming back after 30 minutes or more welcomes her; a shorter switch does not', () => {
    const s = setup(1, standing, { ...defaultProgress(), total: 41, hiddenAt: START - 5 * MIN });
    s.hide();
    expect(s.saved.at(-1)!.hiddenAt).toBe(START);
    s.away(10 * MIN);
    s.show();
    expect(sawWelcome(s)).toBe(false);
    s.hide();
    s.away(31 * MIN);
    s.show();
    expect(roboSays(s)).toBe("Welcome back, let's do some math!");
  });

  test('coming back while Robo is up with a hint: no welcome, Robo stays beside the problem', () => {
    ipadRects();
    const s = setup(1, standing, { ...defaultProgress(), total: 41, hiddenAt: START - 5 * MIN });
    s.tap('[data-action="hint"]');
    expect(robo(s).dataset.place).toBe('up');
    s.hide();
    s.away(31 * MIN);
    s.show();
    expect(sawWelcome(s)).toBe(false);
    expect(robo(s).dataset.place).toBe('up');
  });

  test('small screens: coming back during a hint does not peek in over it', () => {
    const s = setup(1, { roboMode: 'peek' }, { ...defaultProgress(), total: 41, hiddenAt: START - 5 * MIN });
    s.tap('[data-action="hint"]');
    s.hide();
    s.away(31 * MIN);
    s.show();
    expect(s.q('[data-moment]')).toBeNull();
  });

  test('coming back while a day celebration is still playing: no welcome, the celebration carries on', () => {
    const s = setup(1, standing, { ...defaultProgress(), total: 41, hiddenAt: START,
      day: { date: today, right: 9, days: 2, lastDone: yesterday } });
    answerRight(s);
    expect(robo(s).hasAttribute('data-away')).toBe(true);
    s.hide();
    s.away(31 * MIN);
    s.show();
    expect(sawWelcome(s)).toBe(false);
    expect(s.q('[data-moment="day"]')).not.toBeNull();
  });

  test('her 10th right answer of the day celebrates the days in a row', () => {
    const s = setup(1, standing, { ...defaultProgress(), total: 41, hiddenAt: START,
      day: { date: today, right: 9, days: 2, lastDone: yesterday } });
    answerRight(s);
    const m = s.q('[data-moment="day"]')!;
    expect(m.dataset.tier).toBe('arms');
    expect(s.q('[data-role="moment-words"]')!.textContent).toBe('You did your math 3 days in a row! Keep it up!');
    expect(s.saved.at(-1)!.day).toEqual({ date: today, right: 10, days: 3, lastDone: today });
  });
});
