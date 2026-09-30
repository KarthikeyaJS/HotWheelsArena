/**
 * Reserved slot for a future interactive 3D car viewer (`.glb`).
 *
 * No 3D runtime ships with the storefront today, so this component renders nothing and the
 * `MediaViewer` keeps showing the poster image underneath it. To enable 3D later:
 *
 * 1. Add a `model3d` asset to the product document (admin site) and pass it to
 *    `buildMediaItems(product, models)` so the gallery gets a `kind: 'model'` item.
 * 2. Install a viewer (e.g. `@google/model-viewer`, or three.js + react-three-fiber) and
 *    `React.lazy`-import it **inside this file only**, so the library stays out of every other
 *    chunk; render it here when `src` points at a `.glb` / `.gltf` file.
 * 3. Keep the poster as the viewer's loading / error fallback and honour reduced motion (no
 *    auto-rotate).
 *
 * Nothing else in the page has to change: the gallery, thumbnails, keyboard support and tilt
 * gating already handle the `model` kind.
 */
export interface ModelViewerSlotProps {
  /** URL of the `.glb` / `.gltf` model; nothing renders without one. */
  src: string | null | undefined;
  /** Poster image URL (already shown underneath by `MediaViewer`). */
  poster: string;
  /** Accessible description of the model. */
  alt: string;
  className?: string;
}

/** Placeholder for the future 3D viewer — intentionally renders nothing until one is wired up. */
export function ModelViewerSlot(_props: ModelViewerSlotProps): null {
  return null;
}
