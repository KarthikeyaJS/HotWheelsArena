import { useState, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from 'react';
import { FALLBACK_CAR_IMAGE } from '@/config/site';
import {
  productImageSrcSet,
  productImageUrl,
  type CloudinaryCrop,
  type CloudinaryGravity,
} from '@/lib/cloudinary';
import { cn } from '@/lib/cn';
import type { ProductImage } from '@/types';

type NativeImgProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  | 'src'
  | 'srcSet'
  | 'alt'
  | 'width'
  | 'height'
  | 'sizes'
  | 'loading'
  | 'decoding'
  | 'fetchPriority'
  | 'className'
  | 'style'
  | 'children'
>;

export interface CarImageProps extends NativeImgProps {
  /** Product image (`{ publicId, url, alt }`). Cloudinary is used when enabled, else `url`. */
  image?: ProductImage | null;
  /** Plain URL (e.g. a cart line snapshot). Ignored when `image` is given. */
  src?: string;
  /** Required, meaningful alt text (`''` only for purely decorative duplicates). */
  alt: string;
  /** Intrinsic render width in CSS px (also the Cloudinary transformation width). */
  width: number;
  /** Intrinsic render height in CSS px (the box keeps this aspect ratio). */
  height: number;
  /** `sizes` for the responsive Cloudinary `srcset` (default `${width}px`). */
  sizes?: string;
  /** LCP image: eager loading + `fetchpriority="high"`. Default lazy. */
  priority?: boolean;
  /** Object fit inside the aspect box. Car silhouettes default to `contain`. */
  fit?: 'contain' | 'cover';
  /** Cloudinary crop mode (default `fit` — never crops the car). */
  crop?: CloudinaryCrop;
  gravity?: CloudinaryGravity;
  /** Widths (px) for the Cloudinary `srcset` (default ½×, 1×, 1.5×, 2× of `width`). */
  widths?: readonly number[];
  /**
   * Keep the `width / height` aspect box on the wrapper (default true). Set false when the
   * parent already sizes the box (e.g. `absolute inset-0` / fixed-size thumbnails).
   */
  aspectBox?: boolean;
  /** Wrapper classes (sizing, positioning, rounded corners…). */
  className?: string;
  /** Classes for the `<img>` itself (hover transforms, filters…). */
  imgClassName?: string;
  style?: CSSProperties;
  /**
   * Replaces the `<img>` with custom media (e.g. a future 3D `.glb` viewer) while keeping the
   * same sized wrapper. Receives the resolved image URL (for a poster/fallback).
   */
  renderMedia?: (resolvedSrc: string) => ReactNode;
}

/** Lowercase HTML attribute (React 18 warns on the camelCase `fetchPriority` prop). */
const HIGH_PRIORITY_ATTRS: Readonly<Record<string, string>> = { fetchpriority: 'high' };
const NO_ATTRS: Readonly<Record<string, string>> = {};

function uniqueSources(sources: ReadonlyArray<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const source of sources) {
    if (source && !seen.has(source)) {
      seen.add(source);
      result.push(source);
    }
  }
  return result;
}

/**
 * Product/car image. Resolution order: Cloudinary transformation (when
 * `VITE_CLOUDINARY_CLOUD_NAME` is set and the image has a `publicId`) → the image's local `url`
 * → `/placeholders/car-generic.svg`; each `onError` steps to the next source. Lazy + async
 * decoding by default, explicit `width`/`height` and an aspect-ratio box to prevent layout
 * shift. The wrapper is a `<span>` so it is valid inside links and buttons.
 */
export function CarImage({
  image,
  src,
  alt,
  width,
  height,
  sizes,
  priority = false,
  fit = 'contain',
  crop = 'fit',
  gravity,
  widths,
  aspectBox = true,
  className,
  imgClassName,
  style,
  renderMedia,
  onError,
  ...imgProps
}: CarImageProps) {
  const source: ProductImage | string | null = image ?? src ?? null;
  const transform = { w: width, h: height, crop, ...(gravity ? { gravity } : {}) };
  const primary = productImageUrl(source, transform);
  const local = typeof source === 'string' ? source : source?.url;
  const candidates = uniqueSources([primary, local, FALLBACK_CAR_IMAGE]);
  const candidateKey = candidates.join('|');

  // The failure index is tied to the current source list, so it resets when the image changes.
  const [failure, setFailure] = useState<{ key: string; index: number }>({
    key: candidateKey,
    index: 0,
  });
  const index = failure.key === candidateKey ? failure.index : 0;
  const currentSrc = candidates[Math.min(index, candidates.length - 1)] ?? FALLBACK_CAR_IMAGE;

  const srcSetWidths = widths ?? [Math.round(width / 2), width, Math.round(width * 1.5), width * 2];
  const srcSet =
    index === 0 && image
      ? productImageSrcSet(image, srcSetWidths, {
          aspect: height / width,
          crop,
          ...(gravity ? { gravity } : {}),
        })
      : undefined;

  const handleError: ImgHTMLAttributes<HTMLImageElement>['onError'] = (event) => {
    onError?.(event);
    if (index < candidates.length - 1) setFailure({ key: candidateKey, index: index + 1 });
  };

  return (
    <span
      className={cn('relative block overflow-hidden', className)}
      style={aspectBox ? { aspectRatio: `${width} / ${height}`, ...style } : style}
    >
      {renderMedia ? (
        renderMedia(currentSrc)
      ) : (
        <img
          {...imgProps}
          {...(priority ? HIGH_PRIORITY_ATTRS : NO_ATTRS)}
          src={currentSrc}
          srcSet={srcSet}
          sizes={srcSet ? (sizes ?? `${width}px`) : undefined}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onError={handleError}
          className={cn(
            'block h-full w-full select-none',
            fit === 'contain' ? 'object-contain' : 'object-cover',
            imgClassName,
          )}
        />
      )}
    </span>
  );
}
