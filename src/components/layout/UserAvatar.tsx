import { useState } from 'react';
import { cn } from '@/lib/cn';

export interface UserAvatarProps {
  name: string | null | undefined;
  photoURL: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-8 w-8 text-2xs',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
} as const;

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`
      : (parts[0]?.slice(0, 2) ?? '');
  return letters.toUpperCase() || 'HW';
}

/**
 * Google profile photo (no-referrer, lazy) with an initials fallback on a metal disc.
 * Decorative — pair it with visible or accessible text naming the user.
 */
export function UserAvatar({ name, photoURL, size = 'md', className }: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(photoURL) && failedSrc !== photoURL;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-metal-gradient font-mono font-bold text-fg ring-1 ring-line',
        SIZES[size],
        className,
      )}
    >
      {showPhoto && photoURL ? (
        <img
          src={photoURL}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          width={48}
          height={48}
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(photoURL)}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
