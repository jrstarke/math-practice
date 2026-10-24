import { solve } from '/workspace/src/core/solver';
let max = { len: 0, t: '', p: '' };
for (let a = 10; a < 1000; a++) for (let b = 1; b < 1000; b++) for (const op of ['+', '-'] as const) {
  if (op === '-' && b > a) continue;
  for (const s of solve({ a, b, op } as any)) if (s.text.length > max.len) max = { len: s.text.length, t: s.text, p: `${a}${op}${b}` };
}
console.log(max);
