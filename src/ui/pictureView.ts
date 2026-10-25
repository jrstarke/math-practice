import type { PicturePart, PictureState } from '../core/operations/types';
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
function renderPart(part: PicturePart, colorClass: string | null): HTMLElement {
  const shape = shapeFor(part.label);
  const classes = ['block', shape];
  if (!part.revealed) classes.push('pending');
  else if (colorClass) classes.push(colorClass);
  const blocks = Array.from({ length: part.count }, () => el('span', { class: classes.join(' ') }));
  return el('div', { class: 'part' }, ...blocks);
}

/** One full "groups of" group, built from the shared parts breakdown. Two colours
 * distinguish revealed parts only once more than one part is revealed — a single
 * revealed part (or none) stays monochrome. */
function renderGroup(parts: PicturePart[]): HTMLElement {
  const useTwoColors = parts.filter(p => p.revealed).length > 1;
  let revealedIndex = 0;
  const partEls = parts.map(part => {
    let colorClass: string | null = null;
    if (part.revealed && useTwoColors) {
      colorClass = revealedIndex % 2 === 0 ? 'color-a' : 'color-b';
      revealedIndex++;
    }
    return renderPart(part, colorClass);
  });
  return el('div', { class: 'group' }, ...partEls);
}

/** A remaining, undetailed group (levels 8-9), shown as a labelled dashed circle. */
function renderOutline(groupSize: number): HTMLElement {
  return el('div', { class: 'group-outline' }, String(groupSize));
}

/**
 * Shrink --picture-cell (as a `calc(var(--cell) * ratio)` override on the container) just enough
 * that the picture's rendered content fits the vertical budget CSS reserves for it
 * (--picture-budget — see styles.css). The container's `max-height: var(--picture-budget)` means
 * `clientHeight` reads as the true budget in px whenever content overflows it (`scrollHeight` always
 * reads the full, unclipped content height, budget or not) — no guessed divisor is involved, and
 * every picture dimension is `calc(var(--picture-cell) * <constant>)`, so content height scales
 * linearly with --picture-cell: one measurement gives an exact ratio, not an estimate. A couple of
 * correction passes account for text/line-height not scaling perfectly linearly at small sizes; if
 * it still doesn't fit after that (only possible at the most extreme content + smallest viewports),
 * the CSS `overflow-y: auto` on .picture-host is the last-resort fallback so nothing paints over the
 * message or controls — it just scrolls internally instead.
 */
export function fitPicture(container: HTMLElement): void {
  container.style.removeProperty('--picture-cell'); // start from the full-size (--cell) baseline
  const pic = container.querySelector<HTMLElement>('.picture');
  pic?.classList.remove('side');
  let natural = container.scrollHeight;
  const budget = container.clientHeight;
  if (natural === 0) return;
  if (natural > budget + 1 && pic?.querySelector('.tally')?.childElementCount) {
    // Stacked (groups above tally) doesn't fit even at full scale: try the side-by-side layout
    // instead — if it measures shorter, keep it; a wrapping-width regression (narrow viewport)
    // would make it measure the same or taller, so this is a measured trade, not a guess.
    pic!.classList.add('side');
    const sideNatural = container.scrollHeight;
    if (sideNatural < natural) natural = sideNatural;
    else pic!.classList.remove('side');
  }
  if (natural <= budget + 1) return; // already fits at full size
  let scale = Math.max(0.2, (budget / natural) * 0.96);
  container.style.setProperty('--picture-cell', `calc(var(--cell) * ${scale.toFixed(4)})`);
  // Several elements inside the picture (borders, box-shadows, gaps) use fixed px values rather
  // than scaling with --picture-cell, so content height isn't *exactly* proportional to scale —
  // it's height = fixedOverhead + K*scale, not K*scale alone. A single ratio therefore slightly
  // under-shrinks; a few more passes converge geometrically onto the exact fit.
  for (let pass = 0; pass < 5; pass++) {
    const h = container.scrollHeight;
    if (h <= budget + 1) return;
    scale = Math.max(0.15, scale * (budget / h) * 0.97);
    container.style.setProperty('--picture-cell', `calc(var(--cell) * ${scale.toFixed(4)})`);
  }
}

/** Draw a PictureState's groups-of picture, or clear the container when there's nothing to show yet. */
export function renderPicture(container: HTMLElement, state: PictureState | null): void {
  if (!state) {
    container.replaceChildren();
    container.style.removeProperty('--picture-cell');
    return;
  }
  const groups = Array.from({ length: state.groupsShown }, () => renderGroup(state.parts));
  const outlines = Array.from({ length: state.groupsOutlined }, () => renderOutline(state.groupSize));
  const tally = el('ul', { class: 'tally' }, ...state.tally.map(line => el('li', {}, line)));
  container.replaceChildren(
    el('div', { class: 'picture' },
      el('div', { class: 'groups' }, ...groups, ...outlines),
      tally),
  );
  fitPicture(container);
}
