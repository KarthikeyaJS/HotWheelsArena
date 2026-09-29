import { useScanlinesActive } from '@/store/uiStore';

/**
 * Fixed CRT scanline layer over the whole viewport. Visibility follows the user preference
 * (`uiStore.scanlines`: `auto` = dark theme only, `on`, `off`). Very subtle (opacity token
 * `--scanline-opacity`), pointer-transparent, hidden from assistive tech and print.
 * Mounted once in `AppLayout`.
 */
export function ScanlinesOverlay() {
  const active = useScanlinesActive();
  if (!active) return null;
  return (
    <div
      aria-hidden="true"
      data-testid="scanlines-overlay"
      className="scanlines pointer-events-none fixed inset-0 z-scanlines print:hidden"
    />
  );
}
