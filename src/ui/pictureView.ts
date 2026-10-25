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

/** Draw a PictureState's groups-of picture, or clear the container when there's nothing to show yet. */
export function renderPicture(container: HTMLElement, state: PictureState | null): void {
  if (!state) {
    container.replaceChildren();
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
}
