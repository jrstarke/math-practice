import { chromium } from 'playwright';
const URL = process.env.URL ?? 'http://localhost:5173';
const OUT = '/tmp/claude-1000/pw/out';
const SEEDS = +(process.env.SEEDS ?? 15);
const LONG = "1 + 1 + 8 = 10. That's more than 9, so 0 goes in the answer and the 1 carries to the thousands.";
const views = process.env.VIEWS ? JSON.parse(process.env.VIEWS) : [
  ['se-tab', 375, 553], ['se-standalone', 375, 647], ['ip15-tab', 393, 659], ['ip15', 393, 852],
  ['ipad-p', 820, 1180], ['ipad-l', 1180, 820], ['ipad-l-tab', 1180, 745], ['ipad102-l-tab', 1080, 740], ['ipad102-p', 810, 1080], ['ipad102-p-tab', 810, 1005], ['se-land', 667, 375], ['ip15-land', 852, 393], ['ip15-land-notch', 852, 393],
  ['ipad6-l', 1024, 768], ['ipad6-l-tabs', 1024, 665], ['ipad102-l-tabs', 1080, 707], ['ipad6-p-tabs', 768, 918],
];
const STORAGE_KEY = 'math-practice-progress-v7';
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = ymd(new Date()), YESTERDAY = ymd(new Date(Date.now() - 86_400_000));
const ATTEMPT_CAP = 20;

// OP=× (default) or OP=÷ picks the operation under test, at the levels that stress its picture.
// The fixture saves a running unlock welcome for that op, so the first problem is always that op
// (see src/core/path.ts pickOp); the retry loop below stays only as a safety net.
const OP = process.env.OP ?? '×';
const OP_KEY = OP === '÷' ? 'division' : 'multiplication';
const LEVELS = OP === '÷' ? [1, 2, 6, 7, 8, 9] : [1, 7, 8, 9];
const nine = { level: 9, window: [], calibrationLeft: 0 };
function progressFor(level) {
  return {
    version: 7,
    unlocked: ['addition', 'subtraction', 'multiplication', 'division'],
    addition: nine,
    subtraction: nine,
    multiplication: OP === '÷' ? nine : { level, window: [], calibrationLeft: 0 },
    division: OP === '÷' ? { level, window: [], calibrationLeft: 0 } : nine,
    welcome: { op: OP_KEY, left: 3 },
    streak: 12, bestStreak: 12, total: +(process.env.TOTAL ?? 12), muted: false, installTipShown: false,
    // Hidden just now, so there's no welcome: flows that want one set hiddenAt: null.
    day: { date: null, right: 0, days: 0, lastDone: null }, hiddenAt: Date.now(),
  };
}

const browser = await chromium.launch({ channel: 'chromium' });
let failures = 0;

// Robo stands beside the pad on wide upright screens and peeks (hidden) on phones; elsewhere either is fine.
const STANDS = ['ipad102-p', 'ipad102-p-tab', 'ipad-p', 'ipad6-p-tabs'];
const PEEKS = ['se-tab', 'se-standalone', 'ip15-tab', 'ip15'];

const expectFor = name => STANDS.includes(name) ? 'stand' : PEEKS.includes(name) ? 'peek' : null;

function measure([longHint, expect]) {
  const r = s => document.querySelector(s)?.getBoundingClientRect();
  if (longHint) { const b = document.querySelector('[data-role="bubble"]'); b.textContent = longHint; b.classList.remove('empty'); b.classList.toggle('long', longHint.length > 70); }
  const top = r('.topbar'), prob = r('.problem'), msg = r('[data-role="message"]'), ctl = r('.controls'), stage = r('.stage');
  const bubbleEl = document.querySelector('[data-role="bubble"]');
  const bub = bubbleEl.classList.contains('empty') ? null : bubbleEl.getBoundingClientRect();
  // Only present once the first Hint reveals the multiplication picture (empty .picture-host is display:none).
  const pictureEl = document.querySelector('[data-role="picture"]');
  const pic = pictureEl && pictureEl.childElementCount > 0 ? pictureEl.getBoundingClientRect() : null;
  const side = ctl.left >= stage.right - 1;
  const issues = [];
  const de = document.documentElement;
  if (de.scrollHeight > innerHeight + 1) issues.push(`scrollH ${de.scrollHeight}>${innerHeight}`);
  if (de.scrollWidth > innerWidth + 1) issues.push(`scrollW ${de.scrollWidth}>${innerWidth}`);
  if (prob.top < top.bottom - 1) issues.push(`problem over topbar ${Math.round(top.bottom - prob.top)}`);
  const lowestBottom = pic ? Math.max(prob.bottom, msg.bottom, pic.bottom) : Math.max(prob.bottom, msg.bottom);
  if (!side && lowestBottom > ctl.top + 1) issues.push(`problem/msg/picture under controls ${Math.round(lowestBottom - ctl.top)}`);
  if (side && prob.right > ctl.left + 1) issues.push('problem into controls');
  if (side && pic && pic.right > ctl.left + 1) issues.push('picture into controls');
  if (prob.left < -1 || prob.right > innerWidth + 1) issues.push('problem off-screen x');
  if (ctl.bottom > innerHeight + 1) issues.push(`controls below viewport ${Math.round(ctl.bottom - innerHeight)}`);
  if (pic) {
    if (pic.left < -1 || pic.right > innerWidth + 1) issues.push('picture off-screen x');
    // Normal flex-column flow keeps the picture below the problem, so this is a tripwire, not expected to fire.
    if (pic.top < prob.bottom - 1) issues.push(`picture overlaps problem ${Math.round(prob.bottom - pic.top)}`);
    // .problem-area has no overflow clipping and sizes --cell off 100cqh: a tall level-8/9 picture can
    // spill past it and paint over the message line even when nothing scrolls and controls look fine
    // (this is the overflow risk the Task 5 reviewer flagged for level 7-9's worst-case block counts).
    if (pic.bottom > msg.top + 1) issues.push(`picture over message ${Math.round(pic.bottom - msg.top)}`);
    // .picture-host clips (overflow-x: hidden) or scrolls (overflow-y: auto) anything fitPicture() didn't
    // fit — the rects above can't see that, since the host's own box stays within budget either way.
    const { scrollHeight: sh, clientHeight: ch, scrollWidth: sw, clientWidth: cw } = pictureEl;
    if (sh > ch + 1 || sw > cw + 1) issues.push(`picture clipped ${sh}x${sw} > ${ch}x${cw}`);
  }
  if (bub) {
    if (bub.top < 0) issues.push(`bubble off top ${Math.round(-bub.top)}`);
    if (bub.left < 0 || bub.right > innerWidth) issues.push('bubble off-screen x');
    if (bub.bottom > prob.top + 1) issues.push(`bubble covers problem ${Math.round(bub.bottom - prob.top)}`);
    if (side && bub.right > ctl.left + 1) issues.push('bubble over controls');
  }
  // [data-role="top"] has no .cell in the horizontal (multiplication) equation — it's a plain operand
  // span, not a cell row (see horizontalProblemView.ts) — so this reads the answer row's leading cell
  // instead. Every row shares the same `.row` height rule, so the value is identical to the old
  // `[data-role="top"] .cell` reading for addition/subtraction too; this is not a behaviour change there.
  const cell = r('[data-role="answer"] .cell').height;
  const key = Math.min(...[...document.querySelectorAll('.key')].map(k => k.getBoundingClientRect().height));
  const act = Math.min(...[...document.querySelectorAll('.action')].map(k => k.getBoundingClientRect().height));
  if (cell < 38) issues.push(`cell ${cell.toFixed(0)}<38`);
  if (key < 44) issues.push(`key ${key.toFixed(0)}<44`);
  if (act < 44) issues.push(`action ${act.toFixed(0)}<44`);
  // Robo: wherever it is, it never covers the problem, answer boxes, bubble, picture or controls.
  const roboEl = document.querySelector('[data-role="robo"]');
  const shown = roboEl && !roboEl.hidden;
  if (expect === 'stand' && !shown) issues.push('Robo should stand here');
  if (expect === 'peek' && shown) issues.push('Robo should peek here');
  if (shown && !roboEl.hasAttribute('data-away')) {
    const hit = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    const place = roboEl.dataset.place;
    const rb = roboEl.getBoundingClientRect();
    const said = document.querySelector('[data-role="robo-bubble"]');
    const rbub = said && !said.classList.contains('empty') ? said.getBoundingClientRect() : null;
    const answer = r('[data-role="answer"]');
    if (rb.left < -1 || rb.right > innerWidth + 1 || rb.top < -1 || rb.bottom > innerHeight + 1) issues.push(`Robo off-screen (${place})`);
    for (const [n, b] of [['controls', ctl], ['problem', prob], ['answer', answer], ['bubble', bub], ['picture', pic]]) {
      if (hit(rb, b)) issues.push(`Robo (${place}) over ${n}`);
      if (hit(rbub, b)) issues.push(`Robo's bubble (${place}) over ${n}`);
    }
    if (place === 'up' && (rb.left < stage.left - 1 || rb.right > stage.right + 1 || rb.top < stage.top - 1 || rb.bottom > stage.bottom + 1)) issues.push('Robo up outside the stage');
    if (getComputedStyle(roboEl).pointerEvents !== 'none') issues.push('Robo takes taps');
  }
  return { issues, cell, key, act, bubbleOverTopbar: bub ? bub.top < top.bottom : false };
}

// ROBO_ONLY=1 skips the per-level picture checks and runs only the Robo flow below.
for (const level of process.env.ROBO_ONLY ? [] : LEVELS) {
  const progress = progressFor(level);
  for (const [name, w, h] of views) {
    for (const tip of [false, true]) {
      const label = `${OP === '÷' ? 'D' : 'L'}${level}-${name}${tip ? '-tip' : ''}`;
      const agg = { issues: new Set(), cells: [], keys: [], overTop: 0, states: 0, maxAttempts: 0 };
      for (let seed = 1; seed <= SEEDS; seed++) {
        // Problem selection is probabilistic (REVIEW_SHARE draws addition/subtraction too), so retry
        // with a different derived seed until the rendered op is OP, up to ATTEMPT_CAP attempts.
        let ctx, page, attempts = 0, gotMult = false;
        for (attempts = 1; attempts <= ATTEMPT_CAP; attempts++) {
          ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 1000 });
          page = await ctx.newPage();
          page.on('pageerror', e => agg.issues.add('PAGEERROR ' + e.message));
          const trySeed = seed * 1000 + attempts;
          await page.addInitScript(([p, tip, s, key]) => {
            localStorage.setItem(key, JSON.stringify(p));
            if (tip) Object.defineProperty(navigator, 'standalone', { value: false });
            let first = true; const real = Date.now;
            Date.now = () => (first ? (first = false, s * 7919) : real());
          }, [progress, tip, trySeed, STORAGE_KEY]);
          // These checks measure layout, not motion: settle Robo's glide between places at once.
          await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
            const s = document.createElement('style'); s.textContent = '.robo{transition:none!important}'; document.head.append(s);
          }));
          if (name.endsWith('notch')) await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
            const s = document.createElement('style'); s.textContent = '.app{padding-left:59px!important;padding-right:59px!important}'; document.head.append(s);
          }));
          await page.goto(URL);
          await page.waitForSelector('[data-role="answer"]', { state: 'attached' });
          const op = await page.$eval('[data-role="op"]', e => e.textContent);
          if (op === OP) { gotMult = true; break; }
          await ctx.close();
        }
        agg.maxAttempts = Math.max(agg.maxAttempts, attempts);
        if (!gotMult) { agg.issues.add(`no ${OP} after ${ATTEMPT_CAP} attempts [seed ${seed}]`); continue; }
        const cellsThisProblem = [];
        const snap = async (tag, longHint) => {
          const m = await page.evaluate(measure, [longHint, expectFor(name)]);
          m.issues.forEach(i => agg.issues.add(`${i} [seed ${seed} ${tag}]`));
          agg.cells.push(m.cell); agg.keys.push(m.key); agg.states++; if (m.bubbleOverTopbar) agg.overTop++;
          cellsThisProblem.push(m.cell);
          if (seed === 1 && tag === 'hint3') await page.screenshot({ path: `${OUT}/${label}.png` });
        };
        await snap('empty');
        for (let i = 1; i <= 12; i++) {
          if (await page.$eval('[data-action="hint"]', b => b.disabled)) break;
          await page.dispatchEvent('[data-action="hint"]', 'pointerdown');
          await snap(`hint${i}`);
        }
        for (const d of '1234') await page.dispatchEvent(`[data-key="${d}"]`, 'pointerdown');
        await snap('typed');
        await page.dispatchEvent('[data-action="pass"]', 'pointerdown');
        await snap('passing');
        for (let i = 0; i < 12 && !(await page.$('[data-action="next"]')); i++) await page.dispatchEvent('[data-role="bubble"]', 'pointerdown');
        await snap('passed');
        if (seed === 1) await page.screenshot({ path: `${OUT}/${label}-passed.png` });
        if (Math.max(...cellsThisProblem) - Math.min(...cellsThisProblem) > 0.5) agg.issues.add(`cell size changed within problem [seed ${seed}]`);
        await snap('longhint', LONG);
        if (seed === 1) await page.screenshot({ path: `${OUT}/${label}-long.png` });
        await ctx.close();
      }
      const ok = agg.issues.size === 0;
      if (!ok) failures++;
      const issues = [...agg.issues];
      console.log(label.padEnd(22), ok ? 'ok  ' : 'FAIL',
        `cell ${Math.min(...agg.cells).toFixed(0)}-${Math.max(...agg.cells).toFixed(0)}px key ${Math.min(...agg.keys).toFixed(0)}px bubble>topbar ${agg.overTop}/${agg.states}` +
        (agg.maxAttempts > 2 ? ` [max ${agg.maxAttempts} attempts to roll ${OP}]` : ''),
        ok ? '' : '\n    ' + issues.slice(0, 6).join('\n    ') + (issues.length > 6 ? `\n    …+${issues.length - 6}` : ''));
    }
  }
}
// ---- Robo flow, once per view: thinking, up with a hint (then rotated and back), wrong (red), and mid-moment
// frames for a walk (40th star), a high five (division level-up) and a kick (division unlock), then every
// celebration (each level-up and 20-star style, conga-2 and conga-10) forced with ?roboRng. RM=1 runs it with
// prefers-reduced-motion. Screenshots: OUT/robo-<view>-<state>.png
const RM = !!process.env.RM;
const all9 = ['addition', 'subtraction', 'multiplication', 'division'];
const roboFixtures = {
  walk: { ...progressFor(1), total: 39 },
  highFive: { ...progressFor(1), unlocked: all9, total: 12, multiplication: nine,
    division: { level: 1, window: [1], calibrationLeft: 9 }, welcome: { op: 'division', left: 3 } },
  kick: { ...progressFor(1), unlocked: all9.slice(0, 3), total: 12, division: { level: 1, window: [], calibrationLeft: 10 },
    multiplication: { level: 1, window: [1], calibrationLeft: 9 }, welcome: { op: 'multiplication', left: 3 } },
  welcome: { ...progressFor(1), total: 39, hiddenAt: null },
};
// The next right answer completes day N (9 right today, N - 1 days in a row up to yesterday).
const dayFixture = n => ({ ...progressFor(1), total: 12, day: { date: TODAY, right: 9, days: n - 1, lastDone: YESTERDAY } });

async function open(name, w, h, progress, query = '') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 1000, reducedMotion: RM ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  await page.addInitScript(([p, key]) => {
    localStorage.setItem(key, JSON.stringify({ ...p, installTipShown: true }));
    let first = true; const real = Date.now;
    Date.now = () => (first ? (first = false, 7919) : real());
  }, [progress, STORAGE_KEY]);
  await page.goto(URL + query);
  await page.waitForSelector('[data-role="answer"]', { state: 'attached' });
  await page.waitForTimeout(300); // first ResizeObserver measure
  return { ctx, page, errors };
}

const answerNow = page => page.evaluate(() => {
  const t = s => document.querySelector(s).textContent;
  const a = +t('[data-role="top"]').replace(/\D/g, ''), b = +t('[data-role="bottom"]').replace(/\D/g, ''), op = t('[data-role="op"]');
  const n = op.includes('+') ? a + b : op.includes('×') ? a * b : op.includes('÷') ? a / b : a - b;
  const tap = sel => document.querySelector(sel).dispatchEvent(new Event('pointerdown', { bubbles: true }));
  for (const d of String(n)) tap(`[data-key="${d}"]`);
  tap('[data-key="submit"]');
});

// During a moment: taps reach the pad, and nothing Robo draws covers the problem, answer boxes or controls.
const momentCheck = page => page.evaluate(() => {
  const issues = [];
  const r = s => document.querySelector(s)?.getBoundingClientRect();
  const hit = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const k = r('[data-key="5"]');
  const at = document.elementFromPoint(k.left + k.width / 2, k.top + k.height / 2);
  if (!document.querySelector('[data-key="5"]').contains(at)) issues.push('a tap on 5 does not reach the key');
  if (!document.querySelector('[data-moment]')) issues.push('no moment playing');
  const parts = [...document.querySelectorAll('[data-role="robo-moment"] :is(.robo-slot, .robo-words, .robo-fireworks, .robo-ball, .robo-goal)')]
    .map(e => e.getBoundingClientRect()).filter(b => b.width > 0);
  for (const [n, b] of [['problem', r('.problem')], ['answer', r('[data-role="answer"]')], ['bubble', r('[data-role="bubble"]:not(.empty)')],
    ['picture', r('.picture-host svg')], ['controls', r('.controls')]]) {
    if (parts.some(p => hit(p, b))) issues.push(`moment over ${n}`);
  }
  // Nothing above or below the lane (the scene's box). Robots' drawn bodies count too in scenes that don't rotate
  // them (a rotated box overstates the drawing; cartwheel/sway/rock/balance are checked by eye and by sums).
  const ROTATING = ['cartwheel', 'dance', 'light-show', 'ball-ride', 'header'];
  for (const scene of document.querySelectorAll('[data-role="robo-moment"] .robo-scene')) {
    const lane = scene.getBoundingClientRect();
    const sel = ROTATING.includes(scene.dataset.moment) ? '' : ', .robo-body-group';
    for (const e of scene.querySelectorAll(`:is(.robo-slot, .robo-words, .robo-fireworks, .robo-ball, .robo-goal${sel})`)) {
      const b = e.getBoundingClientRect();
      if (b.width > 0 && (b.top < lane.top - 1 || b.bottom > lane.bottom + 1)) {
        issues.push(`moment outside lane (${e.getAttribute('class')} ${Math.round(b.top - lane.top)}/${Math.round(b.bottom - lane.bottom)})`);
        break;
      }
    }
  }
  // Reduce Motion: only fades, appear/disappear and colour changes may run during a moment.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const still = ['robo-fade', 'robo-fade-in', 'robo-show', 'robo-hide', 'robo-ls-light', 'robo-ls-glow', 'robo-ls-rays', 'robo-pulse', 'robo-kick-glow'];
    const moving = [...new Set(document.getAnimations().map(x => x.animationName).filter(n => n && !still.includes(n)))];
    if (moving.length) issues.push(`moves under Reduce Motion: ${moving.join(', ')}`);
  }
  return issues;
});

for (const [name, w, h] of views) {
  const issues = new Set();
  const add = (tag, list) => list.forEach(i => issues.add(`${i} [${tag}]`));
  const shot = (page, state) => page.screenshot({ path: `${OUT}/robo-${name}-${state}${RM ? '-rm' : ''}.png` });
  const snap = async (page, tag, expect = expectFor(name)) => add(tag, (await page.evaluate(measure, [undefined, expect])).issues);

  let { ctx, page, errors } = await open(name, w, h, roboFixtures.walk);
  await snap(page, 'thinking'); await shot(page, 'thinking');
  await page.dispatchEvent('[data-action="hint"]', 'pointerdown');
  await page.waitForTimeout(400);
  await snap(page, 'hint1');
  await page.dispatchEvent('[data-action="hint"]', 'pointerdown');
  await page.waitForTimeout(400);
  await snap(page, 'hint2'); await shot(page, 'hint');
  await page.setViewportSize({ width: h, height: w });
  await page.waitForTimeout(500);
  await snap(page, 'rotated', null); await shot(page, 'hint-rotated');
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(500);
  await snap(page, 'rotated back');
  for (const d of '99') await page.dispatchEvent(`[data-key="${d}"]`, 'pointerdown');
  await page.dispatchEvent('[data-key="submit"]', 'pointerdown');
  await page.waitForTimeout(200);
  await snap(page, 'wrong'); await shot(page, 'wrong');
  add('errors', errors); await ctx.close();

  // Welcome: Robo says hello at its spot (or peeks in), covering nothing.
  ({ ctx, page, errors } = await open(name, w, h, roboFixtures.welcome));
  await page.waitForTimeout(500);
  const hello = await page.evaluate(() => [document.querySelector('[data-role="robo-bubble"]')?.textContent ?? '',
    document.querySelector('[data-role="moment-words"]')?.textContent ?? '']);
  if (!hello.some(t => t === "Welcome back, let's do some math!")) add('welcome', [`no welcome words (${hello.join(' | ')})`]);
  await snap(page, 'welcome'); await shot(page, 'welcome');
  add('errors', errors); await ctx.close();

  const days = [1, 3, 7, 12].map(n => [`day-${n}`, dayFixture(n), 1200]);
  for (const [moment, fixture, wait] of [['walk', roboFixtures.walk, 1600], ['high-five', roboFixtures.highFive, 1000], ['kick', roboFixtures.kick, 1500], ...days]) {
    ({ ctx, page, errors } = await open(name, w, h, fixture));
    await answerNow(page);
    await page.waitForTimeout(wait);
    add(moment, await momentCheck(page));
    await snap(page, moment);
    await shot(page, moment);
    if (moment === 'walk') {
      // Review Focus 2, mid-moment: rotating ends the moment, so there's never a stale walk or a second Robo.
      await page.setViewportSize({ width: h, height: w });
      await page.waitForTimeout(400);
      const left = await page.evaluate(() => document.querySelectorAll('[data-moment]').length);
      if (left) add('walk rotated', ['a moment is still playing after rotating']);
      await snap(page, 'walk rotated', null);
    }
    add('errors', errors); await ctx.close();
  }

  // Every celebration, forced with the dev-only ?roboRng (style k of n is (k + 0.5) / n), checked at ~40% and ~70%.
  const LEVEL_UPS = [['high-five', 2500], ['jump-together', 2800], ['pass', 3200], ['dance', 3200], ['tower', 3600],
    ['keepy-uppy', 3800], ['light-show', 3200], ['header', 3800], ['cartwheel', 3600]];
  const STARS = [['walk', 4000], ['walk-friend', 4000], ['dribble', 4000], ['hop', 4000], ['stop-wave', 4500], ['ball-ride', 4400], ['cartwheel', 3600]];
  const congaMs = n => Math.round(4000 * (w + 112 * (1 + 0.7 * (n - 1)) + 226) / (w + 338));
  const celebrations = [
    ...LEVEL_UPS.map(([style, ms], k) => [style, ms, roboFixtures.highFive, (k + 0.5) / 9]),
    ...STARS.map(([style, ms], k) => [style, ms, roboFixtures.walk, (k + 0.5) / 7]),
    ['conga', congaMs(2), { ...progressFor(1), total: 99 }, 0.5, 2],
    ['conga', congaMs(10), { ...progressFor(1), total: 899 }, 0.5, 10],
  ];
  for (const [style, fullMs, fixture, pick, robots] of celebrations) {
    const tag = robots ? `conga-${robots}` : `${fixture === roboFixtures.walk ? 'stars' : 'level'}-${style}`;
    ({ ctx, page, errors } = await open(name, w, h, fixture, `?roboRng=${pick}`));
    await answerNow(page);
    await page.waitForTimeout(50);
    const [moment, peeking, count] = await page.evaluate(() => [document.querySelector('[data-moment]')?.dataset.moment,
      document.querySelector('[data-role="robo"]').hidden, document.querySelectorAll('[data-role="robo-moment"] .robo-figure').length]);
    if (moment !== (peeking ? 'peek' : style)) add(tag, [`played ${moment}, not ${style}`]);
    if (robots && !peeking && count !== robots) add(tag, [`${count} robots, not ${robots}`]);
    const ms = peeking ? 2500 : fullMs;
    await page.waitForTimeout(0.4 * ms - 50);
    add(`${tag} 40%`, await momentCheck(page));
    await shot(page, `${tag}-40`);
    await page.waitForTimeout(0.3 * ms);
    add(`${tag} 70%`, await momentCheck(page));
    if (robots === 10) {
      // Review Focus 4: rotating mid-conga ends it like any moment.
      await page.setViewportSize({ width: h, height: w });
      await page.waitForTimeout(400);
      if (await page.evaluate(() => document.querySelectorAll('[data-moment]').length)) add('conga rotated', ['a moment is still playing after rotating']);
      await snap(page, 'conga rotated', null);
    }
    add('errors', errors); await ctx.close();
  }

  const ok = issues.size === 0;
  if (!ok) failures++;
  const list = [...issues];
  console.log(`robo-${name}`.padEnd(22), ok ? 'ok' : 'FAIL', ok ? '' : '\n    ' + list.slice(0, 8).join('\n    ') + (list.length > 8 ? `\n    …+${list.length - 8}` : ''));
}

await browser.close();
process.exit(failures ? 1 : 0);
