/**
 * The six storefront categories. Document id === slug (one of `CATEGORY_SLUGS`).
 * Names, lucide icon names and order match `CATEGORY_DISPLAY` in `src/config/site.ts`.
 */
import type { SeedCategory } from './types.ts';

const CREATED_AT = '2025-11-01T10:00:00+05:30';

export const CATEGORIES: readonly SeedCategory[] = [
  {
    id: 'sports',
    slug: 'sports',
    name: 'Sports',
    icon: 'Gauge',
    order: 1,
    description:
      'Supercars, sports coupes and muscle — road machines built for the fast lane, from Stuttgart to Tokyo.',
    isActive: true,
    createdAt: CREATED_AT,
  },
  {
    id: 'off-road',
    slug: 'off-road',
    name: 'Off Road',
    icon: 'Mountain',
    order: 2,
    description:
      'Mud, dirt and zero limits. Lifted 4x4s, trail icons and rally legends that never ask where the road ends.',
    isActive: true,
    createdAt: CREATED_AT,
  },
  {
    id: 'racing',
    slug: 'racing',
    name: 'Racing',
    icon: 'Flag',
    order: 3,
    description:
      'Born on the circuit. Le Mans prototypes, GT racers, touring cars and rally hatches in full race livery.',
    isActive: true,
    createdAt: CREATED_AT,
  },
  {
    id: 'special',
    slug: 'special',
    name: 'Special',
    icon: 'Sparkles',
    order: 4,
    description:
      'Character cars and oddball legends — original fantasy designs with blowers, flames and attitude to spare.',
    isActive: true,
    createdAt: CREATED_AT,
  },
  {
    id: 'rescue',
    slug: 'rescue',
    name: 'Rescue',
    icon: 'Siren',
    order: 5,
    description:
      'First responders, full throttle. Fire tenders, ambulances and patrol cars ready for the next call-out.',
    isActive: true,
    createdAt: CREATED_AT,
  },
  {
    id: 'limited',
    slug: 'limited',
    name: 'Limited',
    icon: 'Gem',
    order: 6,
    description:
      'Numbered drops from the vault. Premium editions with metal bases and rubber tyres — once they are gone, they are gone.',
    isActive: true,
    createdAt: CREATED_AT,
  },
];
