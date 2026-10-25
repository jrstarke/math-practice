import type { PicturePart, PictureState, Place } from '../core/operations/types';
import { el } from './dom';

type BlockShape = 'flat' | 'rod' | 'square';

/**
 * Which base-ten block a part draws. Only 'hundreds'/'tens' get their own
 * shape (hundred-flat / ten-rod); every other label — including 'ones' and
 * any bare-numeral/word label — draws plain unit squares. `part.count` is
 * always literally how many of that shape to draw (see types.ts's
 * PicturePart comment: for place-value labels it's the digit at that place,
 * which *is* the flat/rod count, not a value to be scaled).
 */
function shapeFor(label: string): BlockShape {
  if (label === 'hundreds') return 'flat';
  if (label === 'tens') return 'rod';
  return 'square';
}

/** One part's blocks: faded/neutral while not yet revealed, otherwise its assigned colour (if any). */
function renderPart(part: PicturePart, colorClass: string | null, highlighted: boolean): HTMLElement {
  const shape = shapeFor(part.label);
  const classes = ['block', shape];
  if (!part.revealed) classes.push('pending');
  else if (colorClass) classes.push(colorClass);
  const blocks = Array.from({ length: part.count }, () => el('span', { class: classes.join(' ') }));
  return el('div', { class: highlighted ? 'part hl' : 'part' }, ...blocks);
}

/** One full "groups of" group, built from the shared parts breakdown. Two colours
 * distinguish revealed parts only once more than one part is revealed — a single
 * revealed part (or none) stays monochrome. `highlighted` marks a group a skip-count
 * hint is counting; `place` marks the part a level 8-9 hint is working on. */
function renderGroup(parts: PicturePart[], highlighted: boolean, place: Place | undefined): HTMLElement {
  const useTwoColors = parts.filter(p => p.revealed).length > 1;
  let revealedIndex = 0;
  const partEls = parts.map(part => {
    let colorClass: string | null = null;
    if (part.revealed && useTwoColors) {
      colorClass = revealedIndex % 2 === 0 ? 'color-a' : 'color-b';
      revealedIndex++;
    }
    return renderPart(part, colorClass, place !== undefined && part.label === place);
  });
  return el('div', { class: highlighted ? 'group hl' : 'group' }, ...partEls);
}

const PLACE_INDEX: Record<Place, number> = { ones: 0, tens: 1, hundreds: 2 }; // digits from the right

/**
 * A remaining, undetailed group (levels 8-9): the same dashed circle as the drawn group,
 * holding the same blocks as invisible spacers so it is exactly the drawn group's size at
 * every --picture-cell scale, with its value written across it. Each label digit is its own
 * span so a hint can highlight the digit for the place it is working on.
 */
function renderOutline(groupSize: number, parts: PicturePart[], place: Place | undefined): HTMLElement {
  const spacers = parts.map(part => el('div', { class: 'part' },
    ...Array.from({ length: part.count }, () => el('span', { class: `spacer ${shapeFor(part.label)}` }))));
  const digits = String(groupSize).split('');
  const label = el('span', { class: 'outline-label' }, ...digits.map((d, i) =>
    el('span', { class: place !== undefined && digits.length - 1 - i === PLACE_INDEX[place] ? 'hl' : undefined }, d)));
  return el('div', { class: 'group-outline' }, ...spacers, label);
}

/**
 * Shrink --picture-cell (as a `calc(var(--cell) * ratio)` override on the container) just enough
 * that the picture's rendered content fits the box CSS reserves for it (--picture-budget tall — see
 * styles.css — and the container's width). The container's `max-height: var(--picture-budget)` means
 * `clientHeight` reads as the true budget in px whenever content overflows it (`scrollHeight` always
 * reads the full, unclipped content height, budget or not) — no guessed divisor is involved, and
 * every picture dimension is `calc(var(--picture-cell) * <constant>)`, so content size scales
 * linearly with --picture-cell: one measurement gives an exact ratio, not an estimate. A couple of
 * correction passes account for text/line-height not scaling perfectly linearly at small sizes.
 * The CSS `overflow-y: auto` on .picture-host stays as a safety net so nothing paints over the
 * message or controls, but the layout check (.context/playwright/shots.mjs) fails if it's ever used.
 */
export function fitPicture(container: HTMLElement): void {
  const pic = container.querySelector<HTMLElement>('.picture');
  resetScale(container);
  pic?.classList.remove('side');
  const natural = container.scrollHeight;
  const budget = container.clientHeight;
  if (natural === 0) return;
  const hasTally = !!pic?.querySelector('.tally')?.childElementCount;
  if (natural > budget + 1 && hasTally) {
    // Stacked (groups above tally) doesn't fit even at full scale: try the side-by-side layout
    // instead — if it measures shorter, keep it; a wrapping-width regression (narrow viewport)
    // would make it measure the same or taller, so this is a measured trade, not a guess. It must
    // also not be wider than the container: .picture-host hides horizontal overflow, so a too-wide
    // side-by-side layout would be clipped rather than wrapped.
    pic!.classList.add('side');
    if (!(container.scrollHeight < natural && container.scrollWidth <= container.clientWidth + 1)) pic!.classList.remove('side');
  }
  if (shrinkToFit(container, budget) || !hasTally) return;
  // Even fully shrunk, the layout picked at full size doesn't fit (only the densest level-9
  // pictures on the smallest phones): try the other layout — side-by-side can be too wide at full
  // size yet fit once shrunk — and keep whichever overflows less.
  const before = overflow(container, budget);
  pic!.classList.toggle('side');
  if (shrinkToFit(container, budget) || overflow(container, budget) <= before) return;
  pic!.classList.toggle('side');
  shrinkToFit(container, budget);
}

/** Last-resort block-unit floors (see shrinkToFit). */
const UNIT_FLOOR_STEPS = ['3.5px', '3px', '2.5px', '2px', '1.5px'];

function resetScale(container: HTMLElement): void {
  container.style.removeProperty('--picture-cell'); // back to the full-size (--cell) baseline
  container.style.removeProperty('--unit-floor');
}

function fits(container: HTMLElement, budget: number): boolean {
  return container.scrollHeight <= budget + 1 && container.scrollWidth <= container.clientWidth + 1;
}

function overflow(container: HTMLElement, budget: number): number {
  return Math.max(0, container.scrollHeight - budget) + Math.max(0, container.scrollWidth - container.clientWidth);
}

/** Scale the picture down in its current layout until it fits; true if it does. */
function shrinkToFit(container: HTMLElement, budget: number): boolean {
  resetScale(container);
  if (fits(container, budget)) return true; // already fits at full size
  const ratio = () => Math.min(budget / container.scrollHeight, container.clientWidth / container.scrollWidth);
  let scale = Math.max(0.2, ratio() * 0.96);
  container.style.setProperty('--picture-cell', `calc(var(--cell) * ${scale.toFixed(4)})`);
  // Several elements inside the picture (borders, gaps, text floors) don't scale exactly with
  // --picture-cell, so content size isn't *exactly* proportional to scale — it's
  // fixedOverhead + K*scale, not K*scale alone. A single ratio therefore slightly under-shrinks;
  // a few more passes converge geometrically onto the exact fit.
  for (let pass = 0; pass < 5; pass++) {
    if (fits(container, budget)) return true;
    scale = Math.max(0.15, scale * ratio() * 0.97);
    container.style.setProperty('--picture-cell', `calc(var(--cell) * ${scale.toFixed(4)})`);
  }
  // Last resort, for the densest pictures on the smallest viewports (e.g. 968 × 5 on an iPhone SE:
  // five same-size groups of 9 flats, 6 rods and 8 squares): by now --picture-cell is so small that
  // the block unit's 4px legibility floor (--unit in styles.css) is what sets the picture's size,
  // so lower that floor step by step until it fits. Every block is a multiple of the unit, so
  // flats/rods/squares keep their exact base-ten proportions — just drawn smaller (spec: "level 9
  // may draw flats smaller").
  for (const floor of UNIT_FLOOR_STEPS) {
    if (fits(container, budget)) return true;
    container.style.setProperty('--unit-floor', floor);
  }
  return fits(container, budget);
}

/** Draw a PictureState's groups-of picture, or clear the container when there's nothing to show yet. */
export function renderPicture(container: HTMLElement, state: PictureState | null): void {
  if (!state) {
    container.replaceChildren();
    container.style.removeProperty('--picture-cell');
    container.style.removeProperty('--unit-floor');
    return;
  }
  const groups = Array.from({ length: state.groupsShown },
    (_, i) => renderGroup(state.parts, i < (state.highlightGroups ?? 0), state.highlightPlace));
  const outlines = Array.from({ length: state.groupsOutlined },
    () => renderOutline(state.groupSize, state.parts, state.highlightPlace));
  const tally = el('ul', { class: 'tally' }, ...state.tally.map(line => el('li', {}, line)));
  container.replaceChildren(
    el('div', { class: 'picture' },
      el('div', { class: outlines.length > 0 ? 'groups outlined' : 'groups' }, ...groups, ...outlines),
      tally),
  );
  fitPicture(container);
}
