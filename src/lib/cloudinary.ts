/**
 * Cloudinary delivery URL builder. Images are only served from Cloudinary when
 * `VITE_CLOUDINARY_CLOUD_NAME` is set; otherwise the product's local placeholder `url` is used.
 * (Uploads are out of scope for the storefront — the future admin site will use signed uploads
 * issued by a Cloud Function.)
 */
import { env } from '@/config/env';
import { FALLBACK_CAR_IMAGE } from '@/config/site';
import type { ProductImage } from '@/types';

export type CloudinaryCrop = 'fill' | 'fit' | 'limit' | 'pad' | 'scale' | 'thumb' | 'crop';
export type CloudinaryFormat = 'auto' | 'webp' | 'avif' | 'png' | 'jpg';
export type CloudinaryGravity = 'auto' | 'center' | 'north' | 'south' | 'east' | 'west';

export interface CloudinaryOptions {
  w?: number;
  h?: number;
  /** Default `fill` when a size is given. */
  crop?: CloudinaryCrop;
  /** Default `auto`. */
  q?: 'auto' | 'auto:best' | 'auto:eco' | 'auto:low' | number;
  /** Default `auto`. */
  f?: CloudinaryFormat;
  dpr?: number | 'auto';
  gravity?: CloudinaryGravity;
}

const CLOUDINARY_HOST = 'https://res.cloudinary.com';

export function isCloudinaryEnabled(): boolean {
  return env.cloudinaryCloudName !== null;
}

/**
 * Builds `https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_fill,w_…,h_…/<publicId>`.
 * Returns '' when Cloudinary is disabled or `publicId` is empty — check `isCloudinaryEnabled()`.
 */
export function cl(publicId: string, options: CloudinaryOptions = {}): string {
  const cloud = env.cloudinaryCloudName;
  const id = publicId.trim().replace(/^\/+/, '');
  if (!cloud || !id) return '';
  const { w, h, crop = 'fill', q = 'auto', f = 'auto', dpr, gravity } = options;
  const parts = [`f_${f}`, `q_${q}`];
  if (w || h) parts.push(`c_${crop}`);
  if (w) parts.push(`w_${Math.round(w)}`);
  if (h) parts.push(`h_${Math.round(h)}`);
  if (gravity && (w || h)) parts.push(`g_${gravity}`);
  if (dpr) parts.push(`dpr_${dpr === 'auto' ? 'auto' : dpr.toFixed(1)}`);
  const encodedId = id.split('/').map(encodeURIComponent).join('/');
  return `${CLOUDINARY_HOST}/${cloud}/image/upload/${parts.join(',')}/${encodedId}`;
}

/**
 * Best URL for a product image: Cloudinary transformation when enabled and the image has a
 * `publicId`, else its local `url`, else the generic car placeholder. Plain string URLs are
 * returned unchanged.
 */
export function productImageUrl(
  image: ProductImage | string | null | undefined,
  options: CloudinaryOptions = {},
): string {
  if (!image) return FALLBACK_CAR_IMAGE;
  if (typeof image === 'string') return image || FALLBACK_CAR_IMAGE;
  if (isCloudinaryEnabled() && image.publicId) {
    const url = cl(image.publicId, options);
    if (url) return url;
  }
  return image.url || FALLBACK_CAR_IMAGE;
}

/**
 * `srcset` for responsive Cloudinary images (undefined when Cloudinary is disabled or the image
 * has no publicId — local SVG placeholders don't need one). Height scales with `aspect` (h / w).
 */
export function productImageSrcSet(
  image: ProductImage | null | undefined,
  widths: readonly number[],
  options: Omit<CloudinaryOptions, 'w' | 'h'> & { aspect?: number } = {},
): string | undefined {
  if (!image?.publicId || !isCloudinaryEnabled() || widths.length === 0) return undefined;
  const { aspect, ...rest } = options;
  return widths
    .map((width) => {
      const url = cl(image.publicId, {
        ...rest,
        w: width,
        ...(aspect ? { h: Math.round(width * aspect) } : {}),
      });
      return `${url} ${width}w`;
    })
    .join(', ');
}
