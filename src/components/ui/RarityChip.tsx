import { Gem, Sparkles, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { rarityLabel } from '@/lib/product';
import type { Rarity } from '@/types';
import { Chip, type ChipSize, type ChipTone, type ChipVariant } from './Chip';

export interface RarityChipProps {
  rarity: Rarity;
  size?: ChipSize;
  /** Show the rarity icon (default true). */
  showIcon?: boolean;
  className?: string;
}

interface RarityStyle {
  tone: ChipTone;
  variant: ChipVariant;
  icon: ReactNode;
}

/** Common stays neutral; rare → super rare → limited climb in yellow intensity. */
const RARITY_STYLES: Readonly<Record<Rarity, RarityStyle>> = {
  common: { tone: 'neutral', variant: 'soft', icon: null },
  rare: { tone: 'highlight', variant: 'outline', icon: <Star /> },
  'super-rare': { tone: 'highlight', variant: 'soft', icon: <Sparkles /> },
  limited: { tone: 'highlight', variant: 'solid', icon: <Gem /> },
};

/** Rarity tag for product cards / detail: `COMMON`, `RARE`, `SUPER RARE`, `LIMITED`. */
export function RarityChip({ rarity, size = 'sm', showIcon = true, className }: RarityChipProps) {
  const style = RARITY_STYLES[rarity] ?? RARITY_STYLES.common;
  return (
    <Chip
      tone={style.tone}
      variant={style.variant}
      size={size}
      icon={showIcon ? style.icon : null}
      className={className}
    >
      <span className="sr-only">Rarity: </span>
      {rarityLabel(rarity)}
    </Chip>
  );
}
