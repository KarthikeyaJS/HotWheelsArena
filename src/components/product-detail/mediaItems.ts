/**
 * Media model for the product gallery (pure). Today every item is an image; the `model` kind is
 * the extension point for a future 3D `.glb` viewer (see `ModelViewerSlot`).
 */
import { primaryImageOf } from '@/lib/product';
import type { Product, ProductImage } from '@/types';

/** A 3D asset for a car (not in the product schema yet — reserved for the admin site). */
export interface ModelAsset {
  /** URL of a `.glb` / `.gltf` file. */
  src: string;
  /** Accessible description of the model. */
  alt: string;
}

export interface ImageMediaItem {
  kind: 'image';
  id: string;
  image: ProductImage;
  /** Accessible label for the thumbnail, e.g. "View 2 of 3: alternate colourway". */
  label: string;
}

export interface ModelMediaItem {
  kind: 'model';
  id: string;
  src: string;
  /** Poster shown while the model loads — and instead of it until a viewer exists. */
  poster: ProductImage;
  label: string;
}

export type MediaItem = ImageMediaItem | ModelMediaItem;
export type MediaKind = MediaItem['kind'];

function viewLabel(index: number, total: number, alt: string): string {
  return `View ${index + 1} of ${total}: ${alt}`;
}

/**
 * Gallery items for a product: the primary image first, then the other images (deduplicated by
 * URL), then any 3D models. Always returns at least one item (a placeholder image).
 */
export function buildMediaItems(
  product: Pick<Product, 'images' | 'primaryImage' | 'name'>,
  models: readonly ModelAsset[] = [],
): MediaItem[] {
  const primary = primaryImageOf(product);
  const seen = new Set<string>([primary.url]);
  const images: ProductImage[] = [primary];
  for (const image of product.images) {
    if (!image.url || seen.has(image.url)) continue;
    seen.add(image.url);
    images.push({ ...image, alt: image.alt || product.name });
  }

  const validModels = models.filter((model) => isModelSource(model.src));
  const total = images.length + validModels.length;
  const items: MediaItem[] = images.map((image, index) => ({
    kind: 'image',
    id: `image-${index}`,
    image,
    label: viewLabel(index, total, image.alt),
  }));
  validModels.forEach((model, index) => {
    items.push({
      kind: 'model',
      id: `model-${index}`,
      src: model.src,
      poster: primary,
      label: viewLabel(images.length + index, total, `3D model — ${model.alt}`),
    });
  });
  return items;
}

/** True when `src` looks like a glTF model file (`.glb` / `.gltf`). */
export function isModelSource(src: string | null | undefined): src is string {
  return typeof src === 'string' && /\.(glb|gltf)(\?.*)?$/i.test(src.trim());
}

/** Wraps an index into `0..length-1` (for prev/next and arrow keys). */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}
