import { describe, expect, it } from 'vitest';
import { chooseMode, GAP, laneTop, peekPosition, placeUp, ROBO_H, ROBO_W, spotPosition, union, type Box } from './layout';

const box = (left: number, top: number, right: number, bottom: number): Box => ({ left, top, right, bottom });

describe('chooseMode', () => {
  it('iPad upright (810 wide, controls 175–635) stands', () => {
    expect(chooseMode(810, box(175, 640, 635, 1068))).toBe('standing');
  });
  it('iPhone SE (375 wide, controls 16–359) peeks', () => {
    expect(chooseMode(375, box(16, 380, 359, 655))).toBe('peek');
  });
  it('exactly ROBO_W + 2*GAP to spare stands; one pixel less peeks', () => {
    const spare = ROBO_W + 2 * GAP;
    expect(chooseMode(500 + spare, box(40, 0, 500, 100))).toBe('standing');
    expect(chooseMode(500 + spare - 1, box(40, 0, 500, 100))).toBe('peek');
  });
});

describe('spotPosition', () => {
  it('spot sits right of the controls with its feet on their bottom', () => {
    expect(spotPosition(box(175, 640, 635, 1068))).toEqual({ left: 635 + GAP, top: 1068 - ROBO_H });
  });
});

describe('placeUp', () => {
  const stage = box(16, 80, 794, 620);
  it('room beside the problem: no shift', () => {
    const content = box(300, 200, 500, 400);
    expect(placeUp(stage, content)).toEqual({ shift: 0, left: 500 + GAP, top: 200 });
  });
  it('a little short: shifts left by the difference', () => {
    // 794 - 700 = 94 free; Robo needs 124 → shift 30.
    const content = box(400, 200, 700, 400);
    expect(placeUp(stage, content)).toEqual({ shift: 30, left: 700 - 30 + GAP, top: 200 });
  });
  it('no room even after shifting: null', () => {
    const content = box(30, 200, 760, 400); // only 14 px to the left to shift into
    expect(placeUp(stage, content)).toBeNull();
  });
  it('a tall Robo next to a low problem is pulled up inside the stage', () => {
    const content = box(300, 560, 500, 610);
    expect(placeUp(stage, content)).toEqual({ shift: 0, left: 500 + GAP, top: 620 - ROBO_H });
  });
  it('stage too short for Robo: null', () => {
    const short = box(16, 80, 794, 80 + ROBO_H - 1);
    expect(placeUp(short, box(300, 90, 500, 150))).toBeNull();
  });
});

describe('union', () => {
  it('union with no picture is the problem box', () => {
    expect(union(box(1, 2, 3, 4), null)).toEqual(box(1, 2, 3, 4));
  });
  it('union with a picture covers both', () => {
    expect(union(box(300, 200, 500, 300), box(250, 310, 480, 500))).toEqual(box(250, 200, 500, 500));
  });
});

describe('peek and lane', () => {
  it('peek is centred on the stage, just above the controls', () => {
    expect(peekPosition(box(12, 60, 363, 380), box(12, 390, 363, 655)))
      .toEqual({ left: (12 + 363) / 2 - ROBO_W / 2, top: 390 - ROBO_H });
  });
  it('the walk lane is the row just above the controls', () => {
    expect(laneTop(box(175, 640, 635, 1068))).toBe(640 - ROBO_H);
  });
});
