type Attrs = Record<string, string | number | boolean | undefined>;

/** Tiny element builder: el('div', { class: 'x', 'data-key': '1' }, 'text', child). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs: Attrs = {}, ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    node.setAttribute(k, v === true ? '' : String(v));
  }
  node.append(...children);
  return node;
}
