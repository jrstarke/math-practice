// Dev-only page (robo-preview.html, not part of the build): every pose side by side, for screenshots.
import { createFigure, setFigure, type Arms, type Light, type Look, type Mouth } from './drawing';

const root = document.getElementById('preview')!;

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

const lights: Light[] = ['off', 'green', 'red'];
const mouths: Mouth[] = ['flat', 'smile', 'talk'];
section('Light × mouth', lights.flatMap(light => mouths.map(mouth => [`${light} / ${mouth}`, { light, mouth }] as [string, { light: Light; mouth: Mouth }])));
const arms: Arms[] = ['down', 'point', 'up', 'high-five'];
section('Arms', arms.map(a => [a, { arms: a, light: 'green', mouth: 'smile' }]));
const looks: Look[] = ['front', 'up', 'side'];
section('Looking', looks.map(l => [l, { look: l }]));

export {};
