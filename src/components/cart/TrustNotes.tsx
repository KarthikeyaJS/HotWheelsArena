import { PackageCheck, ShieldCheck, Trophy, Warehouse } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TrustNote {
  icon: ReactNode;
  title: string;
  text: string;
}

const NOTES: readonly TrustNote[] = [
  {
    icon: <ShieldCheck />,
    title: 'Test-mode checkout',
    text: 'No real payment is taken — nothing is charged.',
  },
  {
    icon: <Warehouse />,
    title: 'Auto-parked',
    text: 'Purchased cars land in My Garage automatically.',
  },
  {
    icon: <Trophy />,
    title: 'Earn XP & badges',
    text: 'Every order levels up your collector rank.',
  },
  {
    icon: <PackageCheck />,
    title: 'Collector-safe packing',
    text: 'Blister cards travel boxed, corners protected.',
  },
];

export interface TrustNotesProps {
  className?: string;
  /** `grid` (2×2, cart) or `list` (compact, checkout sidebar). */
  layout?: 'grid' | 'list';
}

/** Small reassurance list under the order summary. */
export function TrustNotes({ className, layout = 'grid' }: TrustNotesProps) {
  return (
    <ul
      aria-label="Why collectors check out here"
      className={cn(
        'grid gap-3',
        layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2' : '',
        className,
      )}
    >
      {NOTES.map((note) => (
        <li key={note.title} className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line bg-surface text-accent-ink [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            {note.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-fg">{note.title}</span>
            <span className="block text-xs leading-snug text-muted">{note.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
