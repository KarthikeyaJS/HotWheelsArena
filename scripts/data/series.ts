/**
 * Six collectible series across 2024–2026. Document id === slug.
 * `carIds` lists product ids in `seriesNumber` order (position 1 first); `totalCars` is derived
 * from it at build time. The seed validator cross-checks every list against `product.series`.
 */
import type { SeedSeries } from './types.ts';

export const SERIES: readonly SeedSeries[] = [
  {
    id: 'hw-exotics-2026',
    slug: 'hw-exotics-2026',
    name: 'HW Exotics',
    year: 2026,
    description:
      'The 2026 exotics line-up: V12 hybrids, papaya-orange rockets and track-honed coupes, plus two numbered vault editions for serious collectors.',
    carIds: [
      'lamborghini-revuelto',
      'mclaren-750s',
      'porsche-911-gt3-rs',
      'mercedes-amg-gt-black-series',
      'sunstrike-concept',
      'lamborghini-countach-lpi-800-4',
      'mercedes-amg-one',
    ],
    isActive: true,
    createdAt: '2026-05-26T10:00:00+05:30',
  },
  {
    id: 'hw-legends-2026',
    slug: 'hw-legends-2026',
    name: 'HW Legends',
    year: 2026,
    description:
      'Icons that defined their decades, re-issued as premium castings — a ducktail 911, a midnight-purple GT-R and a Le Mans winner among them.',
    carIds: [
      'porsche-911-carrera-rs-2-7',
      'nissan-skyline-gt-r-r34',
      'ford-gt40-mk-ii',
      'porsche-911-turbo-3-3',
      'midnight-blower',
    ],
    isActive: true,
    createdAt: '2026-06-10T10:00:00+05:30',
  },
  {
    id: 'hw-turbo-2025',
    slug: 'hw-turbo-2025',
    name: 'HW Turbo',
    year: 2025,
    description:
      'Boost, big wings and bigger reputations. JDM heroes, Stuttgart turbos and American V8 muscle share one starting grid.',
    carIds: [
      'toyota-supra-a80',
      'nissan-gt-r-nismo',
      'porsche-911-turbo-s',
      'ford-mustang-dark-horse',
      'honda-civic-type-r-tcr',
      'volt-serpent',
      'mazda-rx-7-spirit-r',
    ],
    isActive: true,
    createdAt: '2026-01-28T10:00:00+05:30',
  },
  {
    id: 'hw-off-road-2024',
    slug: 'hw-off-road-2024',
    name: 'HW Off-Road',
    year: 2024,
    description:
      'Six trail-ready machines from the Thar to a Safari-spec 911 — lifted, knobbly and happiest far from tarmac.',
    carIds: [
      'land-rover-defender-110',
      'jeep-wrangler-rubicon',
      'mahindra-thar',
      'ford-bronco-raptor',
      'porsche-911-safari-rally',
      'monsoon-mauler',
    ],
    isActive: true,
    createdAt: '2025-11-25T10:00:00+05:30',
  },
  {
    id: 'hw-rescue-2025',
    slug: 'hw-rescue-2025',
    name: 'HW Rescue',
    year: 2025,
    description:
      'Five first responders, from an Indian fire tender to an airport crash tender. The most compact set in the garage — park all five to complete the series.',
    carIds: [
      'force-traveller-ambulance',
      'tata-signa-fire-tender',
      'mahindra-scorpio-n-highway-patrol',
      'dodge-charger-pursuit',
      'ashok-leyland-crash-tender',
    ],
    isActive: true,
    createdAt: '2026-02-12T10:00:00+05:30',
  },
  {
    id: 'hw-race-day-2024',
    slug: 'hw-race-day-2024',
    name: 'HW Race Day',
    year: 2024,
    description:
      'Endurance prototypes, GT racers, touring-car legends and a gravel-spitting rally Swift — all wearing full race livery.',
    carIds: [
      'porsche-963-lmdh',
      'toyota-gr010-hybrid',
      'chevrolet-corvette-c8r',
      'bmw-m3-e30-touring-car',
      'maruti-suzuki-swift-inrc-rally',
      'turbo-tusker',
    ],
    isActive: true,
    createdAt: '2025-11-05T10:00:00+05:30',
  },
];
