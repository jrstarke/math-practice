import './robo.css';

export type Light = 'off' | 'green' | 'red';
export type Mouth = 'flat' | 'smile' | 'talk';
export type Look = 'front' | 'up' | 'side';
export type Arms = 'down' | 'point' | 'up' | 'high-five';

/** Light colours from character/robot-character.md. Off is the child's pick: pale grey, no glow, no rays. */
export const LIGHT: Record<Light, { light: string; glow: string | null; rays: string | null }> = {
  off: { light: '#e4e1d8', glow: null, rays: null },
  green: { light: '#4cd964', glow: '#c8f7c5', rays: '#2fa84f' },
  red: { light: '#ff5a4f', glow: '#ffd2cc', rays: '#d9362b' },
};

export interface LightColours { light: string; glow: string; rays: string }

/** The conga friends' lights, friend 1 to 9 in this fixed order: each new hundred adds the next one at the end of the
 * line. Never red; the orange and pink stay well away from it. */
export const CONGA_LIGHTS: readonly LightColours[] = [
  { light: '#f5c400', glow: '#fff0a8', rays: '#c99a00' }, // yellow
  { light: '#3d8bff', glow: '#cfe2ff', rays: '#1f5fc4' }, // blue
  { light: '#a259ff', glow: '#e6d4ff', rays: '#7339c4' }, // purple
  { light: '#ff9a1f', glow: '#ffe0b8', rays: '#c76a00' }, // orange
  { light: '#ff6fcf', glow: '#ffd6f1', rays: '#c23d98' }, // pink
  { light: '#1fc7b6', glow: '#c4f4ef', rays: '#138c80' }, // teal
  { light: '#6fd3ff', glow: '#d9f4ff', rays: '#2f9fcf' }, // light blue
  { light: '#b6e61e', glow: '#ecfac2', rays: '#7fa30f' }, // lime
  { light: '#c9a7ff', glow: '#f0e6ff', rays: '#8f6ad1' }, // lavender
];

/** A lit light in any colour: data-light stays 'green' so the glow and rays show as for any lit light. */
export function paintLight(f: HTMLElement, c: LightColours): void {
  f.dataset.light = 'green';
  f.style.setProperty('--robo-light', c.light);
  f.style.setProperty('--robo-glow', c.glow);
  f.style.setProperty('--robo-rays', c.rays);
}

const HAND = 'fill="#2b2b2b" stroke="none"';

// Each arm hangs from a joint (outer <g> keeps the translate) and its poses sit in inner <g>s, which CSS may
// animate: a CSS transform would replace an SVG transform attribute, so animated groups never carry one.
// Left arm: 'point' reaches up and left, toward the problem (Robo stands to its right).
const ARM_LEFT = `
  <g data-pose="down"><path d="M0 0 C-10 12 -16 26 -18 40"/><circle cx="-19" cy="51" r="12" ${HAND}/></g>
  <g data-pose="point"><path d="M0 0 C-18 -2 -34 -14 -42 -32"/><circle cx="-47" cy="-43" r="12" ${HAND}/></g>
  <g data-pose="up"><path d="M0 0 C-14 -6 -24 -22 -28 -42"/><circle cx="-30" cy="-54" r="12" ${HAND}/></g>
  <g data-pose="high-five"><path d="M0 0 C-10 12 -16 26 -18 40"/><circle cx="-19" cy="51" r="12" ${HAND}/></g>`;
const ARM_RIGHT = `
  <g data-pose="down"><path d="M0 0 C10 12 16 26 18 40"/><circle cx="19" cy="51" r="12" ${HAND}/></g>
  <g data-pose="point"><path d="M0 0 C10 12 16 26 18 40"/><circle cx="19" cy="51" r="12" ${HAND}/></g>
  <g data-pose="up"><path d="M0 0 C14 -6 24 -22 28 -42"/><circle cx="30" cy="-54" r="12" ${HAND}/></g>
  <g data-pose="high-five"><path d="M0 0 L30 0 L30 -28"/><circle cx="30" cy="-42" r="14" ${HAND}/></g>`;

/** Robo, centred on x = 0 with the body from y = 0 (top of the arch) to 140, feet on y ≈ 214. */
const SVG = `
<svg viewBox="-125 -90 250 305" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" focusable="false"
     fill="none" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <g class="robo-body-group">
    <g data-part="leg-left" transform="translate(-30 140)"><g class="robo-leg">
      <path d="M0 0 L0 55"/><ellipse class="robo-foot" cx="-6" cy="62" rx="19" ry="12" ${HAND}/>
    </g></g>
    <g data-part="leg-right" transform="translate(30 140)"><g class="robo-leg">
      <path d="M0 0 L0 55"/><ellipse class="robo-foot" cx="6" cy="62" rx="19" ry="12" ${HAND}/>
    </g></g>
    <circle data-part="glow" cx="0" cy="-38" r="34" stroke="none"/>
    <path data-part="rays" d="M0 -72 L0 -82 M-30 -62 L-37 -69 M30 -62 L37 -69 M-38 -38 L-48 -38 M38 -38 L48 -38" stroke-width="3"/>
    <path data-part="light" d="M-20 -12 L-20 -38 A20 22 0 0 1 20 -38 L20 -12 Z"/>
    <path data-part="highlight" d="M-11 -22 L-11 -38 C-11 -46 -7 -51 -2 -53" stroke="#ffffff" stroke-width="3"/>
    <path data-part="body" d="M-65 140 L-65 70 A65 70 0 0 1 65 70 L65 140 Z" fill="#ffffff"/>
    <path data-part="mount" d="M-28 6.8 L-28 -8 Q-28 -12 -24 -12 L24 -12 Q28 -12 28 -8 L28 6.8 A65 70 0 0 0 -28 6.8 Z" fill="#2b2b2b"/>
    <g class="robo-eyes">
      <path data-part="eyes-front" d="M-18 40 L-18 50 M18 40 L18 50"/>
      <path data-part="eyes-up" d="M-23 32 L-23 42 M13 32 L13 42"/>
      <path data-part="eyes-side" d="M-26 40 L-26 50 M10 40 L10 50"/>
    </g>
    <path data-part="mouth-flat" d="M-22 78 L22 78"/>
    <path data-part="mouth-smile" d="M-22 76 Q0 86 22 76"/>
    <ellipse data-part="mouth-talk" cx="0" cy="80" rx="9" ry="7" ${HAND}/>
    <g data-part="arm-left" transform="translate(-63 82)"><g class="robo-arm">${ARM_LEFT}</g></g>
    <g data-part="arm-right" transform="translate(63 82)"><g class="robo-arm">${ARM_RIGHT}</g></g>
  </g>
</svg>`;

/** A Robo figure. State lives in data attributes on the returned element, which CSS reads. */
export function createFigure(): HTMLElement {
  const f = document.createElement('div');
  f.className = 'robo-figure';
  f.setAttribute('aria-hidden', 'true');
  f.innerHTML = SVG;
  setFigure(f, { light: 'off', mouth: 'flat', look: 'front', arms: 'down' });
  return f;
}

export function setFigure(f: HTMLElement, s: Partial<{ light: Light; mouth: Mouth; look: Look; arms: Arms }>): void {
  if (s.light) {
    f.dataset.light = s.light;
    const c = LIGHT[s.light];
    f.style.setProperty('--robo-light', c.light);
    f.style.setProperty('--robo-glow', c.glow ?? 'transparent');
    f.style.setProperty('--robo-rays', c.rays ?? 'transparent');
  }
  if (s.mouth) f.dataset.mouth = s.mouth;
  if (s.look) f.dataset.look = s.look;
  if (s.arms) f.dataset.arms = s.arms;
}
