import { describe, expect, it } from 'vitest';
import { chooseMode, GAP, laneTop, MIN_MOMENT_H, momentSize, peekPosition, placeUp, ROBO_H, ROBO_W, spotPosition, union, type Box } from './layout';

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
  it("peek sits at the stage's bottom left corner (clear of the centred text line)", () => {
    expect(peekPosition(box(12, 60, 363, 380), ROBO_H)).toEqual({ left: 12, top: 380 - ROBO_H });
    expect(peekPosition(box(12, 60, 363, 380), 68)).toEqual({ left: 12, top: 380 - 68 });
  });
  it('phone landscape: the peek stays in the stage column, not above the controls beside it', () => {
    expect(peekPosition(box(16, 52, 330, 367), 80)).toEqual({ left: 16, top: 367 - 80 });
  });
  it('the walk lane is the bottom row of the stage, just above the controls', () => {
    expect(laneTop(box(16, 80, 794, 628), ROBO_H)).toBe(628 - ROBO_H);
    expect(laneTop(box(16, 80, 794, 628), 80)).toBe(548);
  });
});

describe('momentSize', () => {
  it('full size when the gap under the problem has room', () => {
    expect(momentSize(640, 400)).toBe(ROBO_H);
  });
  it('shrinks to fit the gap between the problem and the controls (phones)', () => {
    expect(momentSize(640, 565)).toBe(71); // 75 px gap, 4 px clear of the answer row
  });
  it('never smaller than MIN_MOMENT_H', () => {
    expect(momentSize(640, 620)).toBe(MIN_MOMENT_H);
  });
});
