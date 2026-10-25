// @vitest-environment jsdom
import type { PictureState } from '../core/operations/types';
import { renderPicture } from './pictureView';

function pic(overrides: Partial<PictureState> = {}): PictureState {
  return {
    totalGroups: 1,
    groupSize: 1,
    groupsShown: 0,
    groupsOutlined: 0,
    parts: [],
    tally: [],
    ...overrides,
  };
}

function mount(): HTMLElement {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
}

test('renderPicture(el, null) leaves the container empty', () => {
  const host = mount();
  renderPicture(host, null);
  expect(host.children.length).toBe(0);
});

test('a level-1-shaped state renders exactly 3 full groups and 0 outlines', () => {
  const host = mount();
  const state = pic({
    totalGroups: 6,
    groupSize: 2,
    groupsShown: 3,
    groupsOutlined: 0,
    parts: [{ label: '2', count: 2, revealed: true }],
    tally: [],
  });
  renderPicture(host, state);
  expect(host.querySelectorAll('.group').length).toBe(3);
  expect(host.querySelectorAll('.group-outline').length).toBe(0);
});

test('a level-8-shaped state renders exactly 1 full group and 2 outline circles', () => {
  const host = mount();
  const state = pic({
    totalGroups: 3,
    groupSize: 24,
    groupsShown: 1,
    groupsOutlined: 2,
    parts: [
      { label: 'tens', count: 2, revealed: true },
      { label: 'ones', count: 4, revealed: true },
    ],
    tally: [],
  });
  renderPicture(host, state);
  expect(host.querySelectorAll('.group').length).toBe(1);
  expect(host.querySelectorAll('.group-outline').length).toBe(2);
});

test('tally lines render in order as the state tally array', () => {
  const host = mount();
  const state = pic({ tally: ['6 tens = 60', '24'] });
  renderPicture(host, state);
  const lines = [...host.querySelectorAll('.tally li')].map(li => li.textContent);
  expect(lines).toEqual(['6 tens = 60', '24']);
});

// The single most important distinction in this task: 'hundreds'/'tens'/'ones'
// labels mean place-value blocks (count = digit at that place, i.e. the number
// of flats/rods/squares to draw), while any other label means `count` plain
// unit squares. A level-8-shaped picture with a 'tens' part of count 2 and an
// 'ones' part of count 4 must draw 2 ten-rods and 4 unit-squares (6 blocks
// total across two distinct shapes) — NOT 6 plain unit squares.
test('place-value labels draw the matching block shape, not plain unit squares', () => {
  const host = mount();
  const state = pic({
    totalGroups: 3,
    groupSize: 24,
    groupsShown: 1,
    groupsOutlined: 2,
    parts: [
      { label: 'tens', count: 2, revealed: true },
      { label: 'ones', count: 4, revealed: true },
    ],
    tally: [],
  });
  renderPicture(host, state);
  expect(host.querySelectorAll('.block.rod').length).toBe(2);
  expect(host.querySelectorAll('.block.square').length).toBe(4);
  expect(host.querySelectorAll('.block.flat').length).toBe(0);
  expect(host.querySelectorAll('.block').length).toBe(6);
});

test('a plain non-place-value label draws `count` unit squares, never a rod/flat', () => {
  const host = mount();
  const state = pic({
    groupsShown: 1,
    parts: [{ label: 'pair', count: 2, revealed: true }],
  });
  renderPicture(host, state);
  expect(host.querySelectorAll('.block.square').length).toBe(2);
  expect(host.querySelectorAll('.block.rod').length).toBe(0);
});

test('two colours are used only once more than one part is revealed', () => {
  const host = mount();
  const oneRevealed = pic({
    groupsShown: 1,
    parts: [
      { label: 'pair', count: 2, revealed: true },
      { label: 'one', count: 1, revealed: false },
    ],
  });
  renderPicture(host, oneRevealed);
  expect(host.querySelectorAll('.block.color-a, .block.color-b').length).toBe(0);

  const bothRevealed = pic({
    groupsShown: 1,
    parts: [
      { label: 'pair', count: 2, revealed: true },
      { label: 'one', count: 1, revealed: true },
    ],
  });
  renderPicture(host, bothRevealed);
  expect(host.querySelectorAll('.block.color-a').length).toBe(2);
  expect(host.querySelectorAll('.block.color-b').length).toBe(1);
});
