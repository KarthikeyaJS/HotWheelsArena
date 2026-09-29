import { cn } from '@/lib/cn';

export interface StarShapeProps {
  className?: string;
}

/** Solid five-point star (decorative; colour via `text-*`). Internal to the ui-kit. */
export function StarShape({ className }: StarShapeProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn('block shrink-0', className)}
    >
      <path
        fill="currentColor"
        d="M12 2.25l2.95 5.98 6.6.96-4.78 4.65 1.13 6.57L12 17.3l-5.9 3.11 1.13-6.57L2.45 9.19l6.6-.96L12 2.25z"
      />
    </svg>
  );
}
