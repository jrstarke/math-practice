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
const STORAGE_KEY = 'math-practice-progress-v4';
const ATTEMPT_CAP = 20;

// One fixture per multiplication level under test. addition/subtraction stay calibrated
// at level 9 throughout, so they draw only the REVIEW_SHARE (0.2) of problems: at
// multiplication levels 1/7/8 (weight 1) that's ~71% multiplication, at level 9 (also
// REVIEW_SHARE once maxed) it drops to ~33% — see src/core/path.ts's pickOp/REVIEW_SHARE.
// Hence the retry-until-× logic below, applied at every level including 9.
const MULT_LEVELS = [1, 7, 8, 9];
const nine = { level: 9, window: [], calibrationLeft: 0 };
function progressFor(level) {
  return {
    version: 4,
    unlocked: ['addition', 'subtraction', 'multiplication'],
    addition: nine,
    subtraction: nine,
    multiplication: { level, window: [], calibrationLeft: 0 },
    streak: 12, bestStreak: 12, total: +(process.env.TOTAL ?? 12), muted: false, installTipShown: false,
  };
}

const browser = await chromium.launch({ channel: 'chromium' });
let failures = 0;

function measure(longHint) {
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
  return { issues, cell, key, act, bubbleOverTopbar: bub ? bub.top < top.bottom : false };
}

for (const level of MULT_LEVELS) {
  const progress = progressFor(level);
  for (const [name, w, h] of views) {
    for (const tip of [false, true]) {
      const label = `L${level}-${name}${tip ? '-tip' : ''}`;
      const agg = { issues: new Set(), cells: [], keys: [], overTop: 0, states: 0, maxAttempts: 0 };
      for (let seed = 1; seed <= SEEDS; seed++) {
        // Problem selection is probabilistic (REVIEW_SHARE draws addition/subtraction too), so retry
        // with a different derived seed until the rendered op is ×, up to ATTEMPT_CAP attempts.
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
          if (name.endsWith('notch')) await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
            const s = document.createElement('style'); s.textContent = '.app{padding-left:59px!important;padding-right:59px!important}'; document.head.append(s);
          }));
          await page.goto(URL);
          await page.waitForSelector('[data-role="answer"]', { state: 'attached' });
          const op = await page.$eval('[data-role="op"]', e => e.textContent);
          if (op === '×') { gotMult = true; break; }
          await ctx.close();
        }
        agg.maxAttempts = Math.max(agg.maxAttempts, attempts);
        if (!gotMult) { agg.issues.add(`no × after ${ATTEMPT_CAP} attempts [seed ${seed}]`); continue; }
        const cellsThisProblem = [];
        const snap = async (tag, longHint) => {
          const m = await page.evaluate(measure, longHint);
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
        (agg.maxAttempts > 2 ? ` [max ${agg.maxAttempts} attempts to roll ×]` : ''),
        ok ? '' : '\n    ' + issues.slice(0, 6).join('\n    ') + (issues.length > 6 ? `\n    …+${issues.length - 6}` : ''));
    }
  }
}
await browser.close();
process.exit(failures ? 1 : 0);
