// Dev-only page (robo-preview.html, not part of the build): every pose side by side, for screenshots.
// ?moment=walk|walk-friend|<any level-up style>|stars-<any 20-star style>|conga-2|conga-5|conga-10|kick|day-1|day-3|day-7|day-12|welcome|peek|surprise|wrong|right|up plays that
// moment on a mock iPad-upright layout.
import { LEVEL_UPS, LEVEL_UP_WORDS, STAR_STYLES, dayTier, dayWords, walkWords, welcomeWords, type BigMoment } from '../../core/robo';
import { createFigure, setFigure, type Arms, type Light, type Look, type Mouth } from './drawing';
import { laneTop, peekPosition, spotPosition, type Box } from './layout';
import { createRobo } from './robo';

const root = document.getElementById('preview')!;
const moment = new URLSearchParams(location.search).get('moment');

function section(title: string, items: [string, Parameters<typeof setFigure>[1]][]) {
  const h = document.createElement('h2');
  h.textContent = title;
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const [label, state] of items) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const box = document.createElement('div');
    box.className = 'box';
    const f = createFigure();
    setFigure(f, state);
    box.append(f);
    cell.append(box, label);
    grid.append(cell);
  }
  root.append(h, grid);
}

function mock(): void {
  const w = innerWidth, h = innerHeight;
  const controls: Box = { left: (w - 460) / 2, top: h - 440, right: (w + 460) / 2, bottom: h - 12 };
  const stage: Box = { left: 16, top: 60, right: w - 16, bottom: controls.top - 12 };
  const pad = document.createElement('div');
  Object.assign(pad.style, { position: 'fixed', left: `${controls.left}px`, top: `${controls.top}px`,
    width: `${controls.right - controls.left}px`, height: `${controls.bottom - controls.top}px`, background: '#e6dccb', borderRadius: '16px' });
  const problem = document.createElement('div');
  Object.assign(problem.style, { position: 'fixed', left: `${w / 2 - 110}px`, top: `${stage.top + 140}px`, width: '220px', height: '250px',
    background: '#fff', border: '2px dashed #8a87a8', borderRadius: '12px' });
  document.body.append(pad, problem);
  const robo = createRobo();
  document.body.append(robo.el, robo.overlay);
  const spot = spotPosition(controls);
  robo.moveTo(spot, 'spot');
  robo.think();
  const size = Number(new URLSearchParams(location.search).get('size') ?? 136);
  const at = { mode: 'standing' as const, spot, laneTop: laneTop(stage, size), size, viewportWidth: w, peek: peekPosition(stage, size),
    wordsAt: { x: w / 2, bottom: stage.top + 128, width: w - 32 } };
  const bigs: Record<string, BigMoment> = {
    walk: { kind: 'stars', style: 'walk', words: "You've gotten 40 questions right! Keep going!" },
    'walk-friend': { kind: 'stars', style: 'walk-friend', words: "You've gotten 100 questions right! Keep going!" },
    'high-five': { kind: 'levelUp', style: 'high-five', words: 'High five!' },
    kick: { kind: 'kick', words: 'New: division!' },
  };
  for (const style of LEVEL_UPS) bigs[style] = { kind: 'levelUp', style, words: LEVEL_UP_WORDS[style] };
  for (const style of STAR_STYLES) bigs[`stars-${style}`] = { kind: 'stars', style, words: walkWords(40) };
  for (const robots of [2, 5, 10]) bigs[`conga-${robots}`] = { kind: 'conga', robots, words: walkWords(robots * 100 - 100) };
  for (const days of [1, 3, 7, 12]) bigs[`day-${days}`] = { kind: 'day', days, tier: dayTier(days), words: dayWords(days) };
  if (moment === 'peek') robo.play(bigs.walk, { ...at, mode: 'peek' });
  else if (moment === 'surprise') robo.surprise();
  else if (moment === 'welcome') robo.greet(welcomeWords(41), at);
  else if (moment === 'wrong') robo.wrong('Not quite — try again!');
  else if (moment === 'right') robo.right('You figured it out!');
  else if (moment === 'up') { robo.moveTo({ left: w / 2 + 122, top: stage.top + 140 }, 'up'); robo.think(); robo.talk(true); }
  else if (moment && bigs[moment]) robo.play(bigs[moment], at);
}

if (moment) mock();
else {
  const lights: Light[] = ['off', 'green', 'red'];
  const mouths: Mouth[] = ['flat', 'smile', 'talk'];
  section('Light × mouth', lights.flatMap(light => mouths.map(mouth => [`${light} / ${mouth}`, { light, mouth }] as [string, { light: Light; mouth: Mouth }])));
  const arms: Arms[] = ['down', 'point', 'up', 'high-five'];
  section('Arms', arms.map(a => [a, { arms: a, light: 'green', mouth: 'smile' }]));
  const looks: Look[] = ['front', 'up', 'side'];
  section('Looking', looks.map(l => [l, { look: l }]));
}

export {};
