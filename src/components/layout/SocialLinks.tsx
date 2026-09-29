import { Facebook, Instagram, Twitter, Youtube, type LucideIcon } from 'lucide-react';
import { BRAND_NAME, SOCIAL_LINKS, type SocialPlatform } from '@/config/brand';
import { IconButton, type IconButtonSize } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';

const ICONS: Readonly<Record<SocialPlatform, LucideIcon>> = {
  instagram: Instagram,
  youtube: Youtube,
  x: Twitter,
  facebook: Facebook,
};

export interface SocialLinksProps {
  size?: IconButtonSize;
  className?: string;
}

/** Brand social profiles (`SOCIAL_LINKS`) as outline icon links opening in a new tab. */
export function SocialLinks({ size = 'sm', className }: SocialLinksProps) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-2', className)}>
      {SOCIAL_LINKS.map((link) => {
        const Icon = ICONS[link.platform];
        return (
          <li key={link.platform}>
            <IconButton
              href={link.href}
              label={`${BRAND_NAME} on ${link.label} (opens in a new tab)`}
              title={`${link.label} · ${link.handle}`}
              icon={<Icon />}
              variant="outline"
              size={size}
            />
          </li>
        );
      })}
    </ul>
  );
}
