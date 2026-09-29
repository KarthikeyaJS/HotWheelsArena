/**
 * HotWheelsArena — generates the site's SVG art (no dependencies beyond tsx):
 *
 *   public/placeholders/<variant>.svg        34 product car illustrations (800×450, < 8 KB each)
 *   public/placeholders/car-generic.svg      neutral fallback car (FALLBACK_CAR_IMAGE)
 *   public/placeholders/category-<slug>.svg  6 "parked car" silhouettes for Choose Your Ride
 *   public/placeholders/hero-car.svg         1600×800 hero car with animatable groups
 *   public/favicon.svg                       racing monogram
 *   public/og-image.svg                      1200×630 social card source (→ og-image.png)
 *
 * Brand text comes from src/config/brand.ts, so a rename is one edit + a re-run.
 * PNG versions (og-image.png, apple-touch-icon.png) are made by scripts/rasterize-images.ts.
 *
 *   npx tsx scripts/generate-images.ts           write every file
 *   npx tsx scripts/generate-images.ts --check   exit 1 if any file is missing or out of date
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { CATEGORY_SLUGS } from '../shared/types.ts';
import { BRAND_LOGO_TEXT, BRAND_SHORT_NAME, BRAND_TAGLINE, COUNTRY } from '../src/config/brand.ts';
import { CAR_VARIANT_IDS } from './data/placeholders.ts';
import {
  categorySvg,
  faviconSvg,
  genericCarSvg,
  heroCarSvg,
  ogImageSvg,
  placeholderSvg,
  type BrandText,
} from './images/scenes.ts';
import { renderTable } from './lib/table.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const PLACEHOLDER_DIR = join(PUBLIC_DIR, 'placeholders');

const KB = 1024;
const BUDGET = {
  placeholder: 8 * KB,
  hero: 24 * KB,
  favicon: 2 * KB,
  og: 48 * KB,
} as const;

interface Output {
  path: string;
  svg: string;
  budget: number;
  kind: string;
}

function collectOutputs(brand: BrandText): { outputs: Output[]; missingGlyphs: string[] } {
  const outputs: Output[] = [];
  const add = (path: string, svg: string, budget: number, kind: string): void => {
    outputs.push({ path, svg, budget, kind });
  };
  for (const id of CAR_VARIANT_IDS) {
    add(join(PLACEHOLDER_DIR, `${id}.svg`), placeholderSvg(id), BUDGET.placeholder, 'car');
  }
  add(join(PLACEHOLDER_DIR, 'car-generic.svg'), genericCarSvg(), BUDGET.placeholder, 'fallback');
  for (const slug of CATEGORY_SLUGS) {
    add(
      join(PLACEHOLDER_DIR, `category-${slug}.svg`),
      categorySvg(slug),
      BUDGET.placeholder,
      'category',
    );
  }
  add(join(PLACEHOLDER_DIR, 'hero-car.svg'), heroCarSvg(), BUDGET.hero, 'hero');
  const favicon = faviconSvg(brand);
  add(join(PUBLIC_DIR, 'favicon.svg'), favicon.svg, BUDGET.favicon, 'favicon');
  const og = ogImageSvg(brand);
  add(join(PUBLIC_DIR, 'og-image.svg'), og.svg, BUDGET.og, 'social');
  return { outputs, missingGlyphs: [...new Set([...favicon.missing, ...og.missing])] };
}

function main(): number {
  let check = false;
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        check: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      strict: true,
      allowPositionals: false,
    });
    if (values.help) {
      console.log('Usage: npx tsx scripts/generate-images.ts [--check]');
      return 0;
    }
    check = values.check;
  } catch (error) {
    console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }

  const brand: BrandText = {
    logo: BRAND_LOGO_TEXT,
    tagline: BRAND_TAGLINE,
    shortName: BRAND_SHORT_NAME,
    country: COUNTRY,
  };
  const { outputs, missingGlyphs } = collectOutputs(brand);
  if (missingGlyphs.length > 0) {
    console.warn(
      `  ! No glyph for ${missingGlyphs.map((c) => `"${c}"`).join(', ')} — rendered as a space.`,
    );
  }

  let overBudget = 0;
  let stale = 0;
  const rows = outputs.map((output) => {
    const bytes = Buffer.byteLength(output.svg, 'utf8');
    const within = bytes <= output.budget;
    if (!within) overBudget += 1;
    let status = within ? 'ok' : 'OVER BUDGET';
    if (check) {
      const current = existsSync(output.path) ? readFileSync(output.path, 'utf8') : null;
      if (current !== output.svg) {
        stale += 1;
        status = current === null ? 'missing' : 'stale';
      }
    } else {
      mkdirSync(dirname(output.path), { recursive: true });
      writeFileSync(output.path, output.svg, 'utf8');
    }
    return [
      relative(ROOT, output.path).replace(/\\/g, '/'),
      output.kind,
      `${(bytes / KB).toFixed(1)} KB`,
      `${(output.budget / KB).toFixed(0)} KB`,
      status,
    ];
  });

  console.log(
    renderTable(
      [
        { header: 'File' },
        { header: 'Kind' },
        { header: 'Size', align: 'right' },
        { header: 'Budget', align: 'right' },
        { header: 'Status' },
      ],
      rows,
    ),
  );
  if (overBudget > 0) {
    console.error(`✖ ${overBudget} file(s) exceed their size budget.`);
    return 1;
  }
  if (check && stale > 0) {
    console.error(
      `✖ ${stale} file(s) are missing or out of date — run: npx tsx scripts/generate-images.ts`,
    );
    return 1;
  }
  console.log(
    check ? `✔ All ${outputs.length} images are up to date.` : `✔ Wrote ${outputs.length} images.`,
  );
  return 0;
}

process.exit(main());
