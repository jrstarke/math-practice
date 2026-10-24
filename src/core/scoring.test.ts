import { score } from './scoring';

const base = { wrongSubmits: 0, hintsUsed: 0, passed: false, firstSubmitMs: 5000, targetMs: 12000 };

test.each([
  [{}, 1.0], [{ firstSubmitMs: 12000 }, 1.0], [{ firstSubmitMs: 12001 }, 0.6],
  [{ wrongSubmits: 2 }, 0.3], [{ wrongSubmits: 2, hintsUsed: 1 }, 0.2], [{ hintsUsed: 3 }, 0.2],
  [{ passed: true, hintsUsed: 2 }, 0],
])('score(%o) = %d', (over, expected) => expect(score({ ...base, ...over })).toBe(expected));
