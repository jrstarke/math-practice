import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chromium' });
const p = await b.newPage({ viewport: { width: 852, height: 393 } });
await p.goto('http://localhost:5173');
await p.waitForSelector('.pad');
console.log(await p.evaluate(() => ['.app', '.play', '.controls', '.actions', '.pad', '.key'].map(s => {
  const e = document.querySelector(s), r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return `${s} h=${r.height.toFixed(0)} top=${r.top.toFixed(0)} display=${cs.display} flex=${cs.flex} gar=${cs.gridAutoRows} gtr=${cs.gridTemplateRows} jc=${cs.justifyContent}`;
}).join('\n')));
await b.close();
