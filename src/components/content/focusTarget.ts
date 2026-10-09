/**
 * Moves keyboard focus to an in-page `#id` target after the router has scrolled to it, so the
 * next Tab continues from the section the collector jumped to instead of the link they left.
 * Prefers the section heading (`<id>-title`); a target without a `tabindex` gets `-1`.
 */
export function focusHashTarget(id: string): void {
  window.requestAnimationFrame(() => {
    const target = document.getElementById(`${id}-title`) ?? document.getElementById(id);
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}
