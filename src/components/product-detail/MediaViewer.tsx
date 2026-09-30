import { CarImage } from '@/components/product';
import { productImageUrl } from '@/lib/cloudinary';
import { cn } from '@/lib/cn';
import type { MediaItem } from './mediaItems';
import { ModelViewerSlot } from './ModelViewerSlot';

/** Requested render size of the main stage image (16:10, Cloudinary `fit`). */
export const STAGE_IMAGE_WIDTH = 1120;
export const STAGE_IMAGE_HEIGHT = 700;
const STAGE_SIZES = '(min-width: 1280px) 720px, (min-width: 1024px) 56vw, 100vw';

export interface MediaViewerProps {
  item: MediaItem;
  /** LCP image: eager + high fetch priority. */
  priority?: boolean;
  /** Greyed-out car (sold out). */
  dimmed?: boolean;
  className?: string;
}

/**
 * Renders one gallery item inside an absolutely positioned box (the parent sizes it):
 * - `image` → `CarImage` (Cloudinary / local placeholder, error fallback chain);
 * - `model` → the poster image plus `ModelViewerSlot`, which overlays an interactive 3D viewer
 *   once one is wired up (it renders nothing today, so the poster stays visible).
 */
export function MediaViewer({ item, priority = false, dimmed = false, className }: MediaViewerProps) {
  const image = item.kind === 'image' ? item.image : item.poster;
  const imgClassName = cn(
    'drop-shadow-[0_18px_22px_rgb(0_0_0/0.35)] transition-[filter,opacity] duration-500',
    dimmed && 'opacity-60 grayscale',
  );

  return (
    <span className={cn('absolute inset-0 block', className)} data-media-kind={item.kind}>
      <CarImage
        image={image}
        alt={image.alt}
        width={STAGE_IMAGE_WIDTH}
        height={STAGE_IMAGE_HEIGHT}
        sizes={STAGE_SIZES}
        priority={priority}
        aspectBox={false}
        className="absolute inset-0"
        imgClassName={imgClassName}
      />
      {item.kind === 'model' ? (
        <ModelViewerSlot
          src={item.src}
          poster={productImageUrl(item.poster, { w: STAGE_IMAGE_WIDTH, h: STAGE_IMAGE_HEIGHT })}
          alt={item.label}
          className="absolute inset-0"
        />
      ) : null}
    </span>
  );
}
