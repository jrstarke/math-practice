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
const lvl = { level: 9, window: [], calibrationLeft: 0 };
const progress = { version: 2, addition: lvl, subtraction: lvl, streak: 12, bestStreak: 12, total: +(process.env.TOTAL ?? 12), muted: false, installTipShown: false };
const browser = await chromium.launch({ channel: 'chromium' });
let failures = 0;

function measure(longHint) {
  const r = s => document.querySelector(s)?.getBoundingClientRect();
  if (longHint) { const b = document.querySelector('[data-role="bubble"]'); b.textContent = longHint; b.classList.remove('empty'); b.classList.toggle('long', longHint.length > 70); }
  const top = r('.topbar'), prob = r('.problem'), msg = r('[data-role="message"]'), ctl = r('.controls'), stage = r('.stage');
  const bubbleEl = document.querySelector('[data-role="bubble"]');
  const bub = bubbleEl.classList.contains('empty') ? null : bubbleEl.getBoundingClientRect();
  const side = ctl.left >= stage.right - 1;
  const issues = [];
  const de = document.documentElement;
  if (de.scrollHeight > innerHeight + 1) issues.push(`scrollH ${de.scrollHeight}>${innerHeight}`);
  if (de.scrollWidth > innerWidth + 1) issues.push(`scrollW ${de.scrollWidth}>${innerWidth}`);
  if (prob.top < top.bottom - 1) issues.push(`problem over topbar ${Math.round(top.bottom - prob.top)}`);
  if (!side && Math.max(prob.bottom, msg.bottom) > ctl.top + 1) issues.push(`problem/msg under controls ${Math.round(Math.max(prob.bottom, msg.bottom) - ctl.top)}`);
  if (side && prob.right > ctl.left + 1) issues.push('problem into controls');
  if (prob.left < -1 || prob.right > innerWidth + 1) issues.push('problem off-screen x');
  if (ctl.bottom > innerHeight + 1) issues.push(`controls below viewport ${Math.round(ctl.bottom - innerHeight)}`);
  if (bub) {
    if (bub.top < 0) issues.push(`bubble off top ${Math.round(-bub.top)}`);
    if (bub.left < 0 || bub.right > innerWidth) issues.push('bubble off-screen x');
    if (bub.bottom > prob.top + 1) issues.push(`bubble covers problem ${Math.round(bub.bottom - prob.top)}`);
    if (side && bub.right > ctl.left + 1) issues.push('bubble over controls');
  }
  const cell = r('[data-role="top"] .cell').height;
  const key = Math.min(...[...document.querySelectorAll('.key')].map(k => k.getBoundingClientRect().height));
  const act = Math.min(...[...document.querySelectorAll('.action')].map(k => k.getBoundingClientRect().height));
  if (cell < 38) issues.push(`cell ${cell.toFixed(0)}<38`);
  if (key < 44) issues.push(`key ${key.toFixed(0)}<44`);
  if (act < 44) issues.push(`action ${act.toFixed(0)}<44`);
  return { issues, cell, key, act, bubbleOverTopbar: bub ? bub.top < top.bottom : false };
}

for (const [name, w, h] of views) {
  for (const tip of [false, true]) {
    const label = `${name}${tip ? '-tip' : ''}`;
    const agg = { issues: new Set(), cells: [], keys: [], overTop: 0, states: 0 };
    for (let seed = 1; seed <= SEEDS; seed++) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 1000 });
      const page = await ctx.newPage();
      page.on('pageerror', e => agg.issues.add('PAGEERROR ' + e.message));
      await page.addInitScript(([p, tip, seed]) => {
        localStorage.setItem('math-practice-progress', JSON.stringify(p));
        if (tip) Object.defineProperty(navigator, 'standalone', { value: false });
        let first = true; const real = Date.now;
        Date.now = () => (first ? (first = false, seed * 7919) : real());
      }, [progress, tip, seed]);
      if (name.endsWith('notch')) await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style'); s.textContent = '.app{padding-left:59px!important;padding-right:59px!important}'; document.head.append(s);
      }));
      await page.goto(URL);
      await page.waitForSelector('[data-role="answer"]', { state: 'attached' });
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
      `cell ${Math.min(...agg.cells).toFixed(0)}-${Math.max(...agg.cells).toFixed(0)}px key ${Math.min(...agg.keys).toFixed(0)}px bubble>topbar ${agg.overTop}/${agg.states}`,
      ok ? '' : '\n    ' + issues.slice(0, 6).join('\n    ') + (issues.length > 6 ? `\n    …+${issues.length - 6}` : ''));
  }
}
await browser.close();
process.exit(failures ? 1 : 0);
