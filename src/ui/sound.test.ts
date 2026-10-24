import { createSound } from './sound';

function fakeCtor() {
  const created: string[] = [];
  const instances: { state: string; resume: ReturnType<typeof vi.fn> }[] = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class Fake {
    currentTime = 0;
    destination = {};
    state = 'suspended';
    resume = vi.fn(() => Promise.resolve());
    constructor() { instances.push(this); }
    createOscillator() {
      created.push('osc');
      return { type: '', frequency: param(), connect(n: unknown) { return n; }, start() {}, stop() {} };
    }
    createGain() { return { gain: param(), connect(n: unknown) { return n; } }; }
  }
  return { ctor: Fake as unknown as typeof AudioContext, created, instances };
}

test('no sound before unlock; plays after', () => {
  const f = fakeCtor();
  const s = createSound(f.ctor);
  s.correct();
  expect(f.created).toHaveLength(0);
  s.unlock();
  s.correct();
  expect(f.created.length).toBeGreaterThan(0);
});

test('each sound plays something', () => {
  for (const name of ['correct', 'wrong', 'levelUp'] as const) {
    const f = fakeCtor();
    const s = createSound(f.ctor);
    s.unlock();
    s[name]();
    expect(f.created.length).toBeGreaterThan(0);
  }
});

test('muted plays nothing; unmuting plays again', () => {
  const f = fakeCtor();
  const s = createSound(f.ctor);
  s.unlock();
  s.setMuted(true);
  s.correct(); s.wrong(); s.levelUp();
  expect(f.created).toHaveLength(0);
  s.setMuted(false);
  s.correct();
  expect(f.created.length).toBeGreaterThan(0);
});

test('missing AudioContext never throws', () => {
  const s = createSound(undefined);
  expect(() => { s.unlock(); s.correct(); s.wrong(); s.levelUp(); s.setMuted(true); }).not.toThrow();
});

test('unlock resumes a suspended context every time, but leaves a running one alone', () => {
  const f = fakeCtor();
  const s = createSound(f.ctor);
  s.unlock();
  s.unlock(); // iOS: the first gesture may not have counted
  const ctx = f.instances[0];
  expect(f.instances).toHaveLength(1);
  expect(ctx.resume).toHaveBeenCalledTimes(2);
  ctx.state = 'running';
  s.unlock();
  expect(ctx.resume).toHaveBeenCalledTimes(2);
  ctx.state = 'interrupted'; // iOS after lock screen / app switch
  s.unlock();
  expect(ctx.resume).toHaveBeenCalledTimes(3);
});
