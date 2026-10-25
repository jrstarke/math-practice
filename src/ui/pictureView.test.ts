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

test('highlightGroups marks exactly the first n drawn groups with .hl', () => {
  const host = mount();
  renderPicture(host, pic({
    totalGroups: 6, groupSize: 2, groupsShown: 6,
    parts: [{ label: '2', count: 2, revealed: true }],
    highlightGroups: 5,
  }));
  const groups = [...host.querySelectorAll('.group')];
  expect(groups.map(g => g.classList.contains('hl'))).toEqual([true, true, true, true, true, false]);
});

test('no highlight fields → nothing is highlighted', () => {
  const host = mount();
  renderPicture(host, pic({ totalGroups: 3, groupSize: 24, groupsShown: 1, groupsOutlined: 2,
    parts: [{ label: 'tens', count: 2, revealed: true }, { label: 'ones', count: 4, revealed: false }] }));
  expect(host.querySelectorAll('.hl').length).toBe(0);
});

test('highlightPlace marks that part of the drawn group and that digit of each outline label', () => {
  const host = mount();
  renderPicture(host, pic({
    totalGroups: 3, groupSize: 24, groupsShown: 1, groupsOutlined: 2,
    parts: [{ label: 'tens', count: 2, revealed: true }, { label: 'ones', count: 4, revealed: false }],
    highlightPlace: 'tens',
  }));
  const hlParts = [...host.querySelectorAll('.group .part.hl')];
  expect(hlParts).toHaveLength(1);
  expect(hlParts[0].querySelectorAll('.block.rod')).toHaveLength(2);
  const outlines = [...host.querySelectorAll('.group-outline')];
  expect(outlines).toHaveLength(2);
  for (const o of outlines) {
    expect(o.textContent).toBe('24');
    expect([...o.querySelectorAll('.hl')].map(d => d.textContent)).toEqual(['2']);
  }
});

test('highlightPlace on a zero-tens level-9 label picks the right digit', () => {
  const host = mount();
  renderPicture(host, pic({
    totalGroups: 3, groupSize: 305, groupsShown: 1, groupsOutlined: 2,
    parts: [{ label: 'hundreds', count: 3, revealed: true }, { label: 'ones', count: 5, revealed: true }],
    highlightPlace: 'ones',
  }));
  for (const o of host.querySelectorAll('.group-outline'))
    expect([...o.querySelectorAll('.hl')].map(d => d.textContent)).toEqual(['5']);
  expect(host.querySelector('.group .part.hl .block.square')).not.toBeNull();
});

test('outline groups hold the same (invisible) blocks as the drawn group, so they are the same size', () => {
  const host = mount();
  renderPicture(host, pic({
    totalGroups: 3, groupSize: 24, groupsShown: 1, groupsOutlined: 2,
    parts: [{ label: 'tens', count: 2, revealed: false }, { label: 'ones', count: 4, revealed: false }],
  }));
  for (const o of host.querySelectorAll('.group-outline')) {
    expect(o.querySelectorAll('.spacer.rod')).toHaveLength(2);
    expect(o.querySelectorAll('.spacer.square')).toHaveLength(4);
    expect(o.querySelectorAll('.block')).toHaveLength(0);
  }
});
