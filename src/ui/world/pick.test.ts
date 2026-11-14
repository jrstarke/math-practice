// @vitest-environment jsdom
import { PLACE_PROMPT, pickPrompt, type WorldItem, type WorldKind } from '../../core/world';
import { fitFrame } from './frame';
import { PICK_CHEER_MS, createPick, type PickDeps } from './pick';

// The frame is stubbed to a 270×360 box at (100, 50): one client pixel per area unit, so area (x, y) is (x+100, y+50).
const FRAME = { left: 100, top: 50, width: 270, height: 360 };

function setup(over: Partial<PickDeps> = {}) {
  const onPlaced = vi.fn<(item: WorldItem) => void>();
  const onDone = vi.fn();
  const deps: PickDeps = {
    items: [], offer: ['tree', 'mountain', 'bush'], days: 10, cheer: () => 'Cool!', onPlaced, onDone, ...over,
  };
  const view = createPick(deps);
  document.body.append(view.el);
  const q = (sel: string) => view.el.querySelector<HTMLElement>(sel);
  const frame = q('[data-role="pick-frame"]')!;
  frame.getBoundingClientRect = () => ({ ...FRAME, right: FRAME.left + FRAME.width, bottom: FRAME.top + FRAME.height, x: FRAME.left, y: FRAME.top, toJSON: () => ({}) });
  const down = (target: Element, init: MouseEventInit = {}) =>
    target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, ...init }));
  const choose = (kind: WorldKind) => down(q(`[data-role="pick-kind"][data-kind="${kind}"]`)!);
  const tapArea = (x: number, y: number) => down(frame, { clientX: x + FRAME.left, clientY: y + FRAME.top });
  const ok = () => down(q('[data-role="pick-ok"]')!);
  const words = () => q('[data-role="pick-words"]')!.textContent;
  const ghost = () => q('[data-role="pick-ghost"]');
  const ghostAt = () => { const g = ghost(); return g ? { x: Number(g.dataset.x), y: Number(g.dataset.y), kind: g.dataset.kind } : null; };
  const dims = () => [...view.el.querySelectorAll<HTMLElement>('[data-role="pick-dim"]')].map((d) => d.style.cssText).join('|');
  const okDisabled = () => (q('[data-role="pick-ok"]') as HTMLButtonElement).disabled;
  return { view, deps, onPlaced, onDone, q, choose, tapArea, ok, words, ghost, ghostAt, dims, okDisabled };
}

beforeEach(() => { vi.useFakeTimers(); document.body.innerHTML = ''; });
afterEach(() => { vi.useRealTimers(); });

test('opens with the prompt, the three kinds in offer order, no zone and OK disabled', () => {
  const t = setup({ days: 15 });
  expect(t.view.el.dataset.role).toBe('pick');
  expect(t.view.el.getAttribute('role')).toBe('dialog');
  expect(t.words()).toBe(pickPrompt(15));
  const kinds = [...t.view.el.querySelectorAll<HTMLElement>('[data-role="pick-kind"]')];
  expect(kinds.map((k) => k.dataset.kind)).toEqual(['tree', 'mountain', 'bush']);
  expect(kinds.map((k) => k.textContent)).toEqual(['Tree', 'Mountain', 'Bush']);
  expect(kinds.some((k) => k.hasAttribute('data-selected'))).toBe(false);
  expect(t.view.el.querySelectorAll('[data-role="pick-dim"]').length).toBe(0);
  expect(t.ghost()).toBeNull();
  expect(t.okDisabled()).toBe(true);
});

test('taps before a kind is chosen do nothing', () => {
  const t = setup();
  t.tapArea(120, 200);
  expect(t.ghost()).toBeNull();
  expect(t.okDisabled()).toBe(true);
});

test('choosing mountain selects it, shows the dim layers and the place prompt', () => {
  const t = setup();
  t.choose('mountain');
  expect(t.q('[data-role="pick-kind"][data-kind="mountain"]')!.hasAttribute('data-selected')).toBe(true);
  expect(t.q('[data-role="pick-kind"][data-kind="tree"]')!.hasAttribute('data-selected')).toBe(false);
  expect(t.view.el.querySelectorAll('[data-role="pick-dim"]').length).toBeGreaterThan(0);
  expect(t.q('[data-role="pick-zone"]')).not.toBeNull();
  expect(t.words()).toBe(PLACE_PROMPT);
});

test('a mountain tapped in its band snaps to the horizon; a tap in the sky above changes nothing', () => {
  const t = setup();
  t.choose('mountain');
  t.tapArea(100, 60);
  expect(t.ghostAt()).toEqual({ kind: 'mountain', x: 100, y: 90 });
  expect(t.okDisabled()).toBe(false);
  t.tapArea(150, 20);
  expect(t.ghostAt()).toEqual({ kind: 'mountain', x: 100, y: 90 });
  expect(t.okDisabled()).toBe(false);
});

test('switching from a horizon mountain to a tree removes the ghost, disables OK and changes the dim', () => {
  const t = setup();
  t.choose('mountain');
  t.tapArea(100, 60);
  const mountainDims = t.dims();
  t.choose('tree');
  expect(t.ghost()).toBeNull();
  expect(t.okDisabled()).toBe(true);
  expect(t.dims()).not.toBe(mountainDims);
  expect(t.q('[data-role="pick-kind"][data-kind="tree"]')!.hasAttribute('data-selected')).toBe(true);
  expect(t.q('[data-role="pick-kind"][data-kind="mountain"]')!.hasAttribute('data-selected')).toBe(false);
});

test('switching from a tree to a bush keeps the ghost where it is; tapping elsewhere moves it', () => {
  const t = setup();
  t.choose('tree');
  t.tapArea(120, 200);
  expect(t.ghostAt()).toEqual({ kind: 'tree', x: 120, y: 200 });
  t.choose('bush');
  expect(t.ghostAt()).toEqual({ kind: 'bush', x: 120, y: 200 });
  expect(t.okDisabled()).toBe(false);
  t.tapArea(60, 300);
  expect(t.ghostAt()).toEqual({ kind: 'bush', x: 60, y: 300 });
  expect(t.view.el.querySelectorAll('[data-role="pick-ghost"]').length).toBe(1);
});

test('OK with no ghost does nothing', () => {
  const t = setup();
  t.ok();
  t.choose('tree');
  t.ok();
  expect(t.onPlaced).not.toHaveBeenCalled();
  vi.advanceTimersByTime(PICK_CHEER_MS * 2);
  expect(t.onDone).not.toHaveBeenCalled();
});

test('OK places once (even on a double tap), cheers, then calls onDone after exactly PICK_CHEER_MS', () => {
  const t = setup();
  t.choose('bush');
  t.tapArea(60, 300);
  t.ok();
  t.ok();
  expect(t.onPlaced).toHaveBeenCalledTimes(1);
  expect(t.onPlaced).toHaveBeenCalledWith({ kind: 'bush', area: 0, x: 60, y: 300 });
  expect(t.words()).toBe('Cool!');
  const fig = t.q('.robo-figure')!;
  expect([fig.dataset.light, fig.dataset.mouth, fig.dataset.arms]).toEqual(['green', 'smile', 'up']);
  vi.advanceTimersByTime(PICK_CHEER_MS - 1);
  expect(t.onDone).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(t.onDone).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(PICK_CHEER_MS * 2);
  expect(t.onDone).toHaveBeenCalledTimes(1);
});

test('after OK, kind buttons and frame taps change nothing', () => {
  const t = setup();
  t.choose('tree');
  t.tapArea(120, 200);
  t.ok();
  const dims = t.dims();
  t.choose('bush');
  t.tapArea(60, 300);
  expect(t.q('[data-role="pick-kind"][data-kind="bush"]')!.hasAttribute('data-selected')).toBe(false);
  expect(t.dims()).toBe(dims);
  expect(t.words()).toBe('Cool!');
  expect(t.q('[data-role="pick-frame"]')!.dataset.placed).toBe('tree');
  expect(t.ghost()).toBeNull();
  t.ok();
  expect(t.onPlaced).toHaveBeenCalledTimes(1);
});

test('destroy before the timer means onDone never fires', () => {
  const t = setup();
  t.choose('tree');
  t.tapArea(120, 200);
  t.ok();
  t.view.destroy();
  vi.advanceTimersByTime(PICK_CHEER_MS * 2);
  expect(t.onDone).not.toHaveBeenCalled();
});

test('fitFrame is the largest centred 3:4 box', () => {
  expect(fitFrame(810, 1080)).toEqual({ left: 0, top: 0, width: 810, height: 1080 });
  expect(fitFrame(1080, 810)).toEqual({ left: 236.25, top: 0, width: 607.5, height: 810 });
  expect(fitFrame(390, 844)).toEqual({ left: 0, top: 162, width: 390, height: 520 });
});
