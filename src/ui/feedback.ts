/** Restart the gentle "try again" shake on an element. */
export function shake(node: HTMLElement): void {
  node.classList.remove('shake');
  void node.offsetWidth; // restart the CSS animation
  node.classList.add('shake');
  node.addEventListener('animationend', () => node.classList.remove('shake'), { once: true });
}
