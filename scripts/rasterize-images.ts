/**
 * HotWheelsArena — rasterises the PNG assets from their SVG sources:
 *
 *   public/og-image.svg → public/og-image.png          1200×630 (og:image / twitter:image)
 *   public/favicon.svg  → public/apple-touch-icon.png  180×180, full-bleed ink background
 *
 * Uses @resvg/resvg-js, which is deliberately NOT a project dependency (native binary, only
 * needed when the art changes). Install it in a throwaway folder and point `--resvg` at it:
 *
 *   mkdir ../hwa-rasterize && cd ../hwa-rasterize
 *   npm init -y && npm install --include=dev @resvg/resvg-js@2
 *   cd - && npx tsx scripts/rasterize-images.ts --resvg ../hwa-rasterize
 *
 * The SVG text is drawn as vector paths, so no fonts are needed and output is deterministic.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { BRAND } from './images/palette.ts';
import { renderTable } from './lib/table.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');

interface ResvgRenderOptions {
  fitTo?: { mode: 'width'; value: number };
  background?: string;
  font?: { loadSystemFonts?: boolean };
}

interface ResvgRendered {
  asPng(): Buffer;
}

interface ResvgInstance {
  render(): ResvgRendered;
}

interface ResvgModule {
  Resvg: new (svg: string, options?: ResvgRenderOptions) => ResvgInstance;
}

function isResvgModule(value: unknown): value is ResvgModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'Resvg' in value &&
    typeof value.Resvg === 'function'
  );
}

function loadResvg(dir: string | undefined): ResvgModule {
  const base = dir ? resolve(dir) : ROOT;
  const loaded: unknown = createRequire(join(base, 'package.json'))('@resvg/resvg-js');
  if (!isResvgModule(loaded)) throw new Error('@resvg/resvg-js did not export a Resvg class');
  return loaded;
}

/** Width × height from a PNG's IHDR chunk. */
function pngSize(png: Buffer): { width: number; height: number } {
  if (png.length < 24 || png.toString('ascii', 12, 16) !== 'IHDR') throw new Error('not a PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

interface Job {
  source: string;
  target: string;
  width: number;
  height: number;
  background?: string;
}

const JOBS: readonly Job[] = [
  { source: 'og-image.svg', target: 'og-image.png', width: 1200, height: 630 },
  {
    source: 'favicon.svg',
    target: 'apple-touch-icon.png',
    width: 180,
    height: 180,
    background: BRAND.ink,
  },
];

function main(): number {
  let resvgDir: string | undefined;
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        resvg: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
      strict: true,
      allowPositionals: false,
    });
    if (values.help) {
      console.log(
        'Usage: npx tsx scripts/rasterize-images.ts [--resvg <folder with @resvg/resvg-js installed>]',
      );
      return 0;
    }
    resvgDir = values.resvg ?? process.env.RESVG_DIR;
  } catch (error) {
    console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }

  let resvg: ResvgModule;
  try {
    resvg = loadResvg(resvgDir);
  } catch (error) {
    console.error(
      `✖ Could not load @resvg/resvg-js${resvgDir ? ` from ${resvgDir}` : ''}: ${error instanceof Error ? error.message : String(error)}\n` +
        '  Install it in a throwaway folder (npm init -y && npm install --include=dev @resvg/resvg-js@2) and pass --resvg <folder>.',
    );
    return 1;
  }

  const rows: string[][] = [];
  let failures = 0;
  for (const job of JOBS) {
    const source = join(PUBLIC_DIR, job.source);
    const target = join(PUBLIC_DIR, job.target);
    if (!existsSync(source)) {
      console.error(
        `✖ Missing ${relative(ROOT, source)} — run: npx tsx scripts/generate-images.ts`,
      );
      failures += 1;
      continue;
    }
    const png = new resvg.Resvg(readFileSync(source, 'utf8'), {
      fitTo: { mode: 'width', value: job.width },
      background: job.background,
      font: { loadSystemFonts: false },
    })
      .render()
      .asPng();
    const size = pngSize(png);
    const ok = size.width === job.width && size.height === job.height;
    if (!ok) failures += 1;
    writeFileSync(target, png);
    rows.push([
      relative(ROOT, target).replace(/\\/g, '/'),
      `${size.width}×${size.height}`,
      `${(png.length / 1024).toFixed(1)} KB`,
      ok ? 'ok' : `expected ${job.width}×${job.height}`,
    ]);
  }
  if (rows.length > 0) {
    console.log(
      renderTable(
        [
          { header: 'File' },
          { header: 'Pixels' },
          { header: 'Size', align: 'right' },
          { header: 'Status' },
        ],
        rows,
      ),
    );
  }
  if (failures > 0) {
    console.error(`✖ ${failures} image(s) failed.`);
    return 1;
  }
  console.log(`✔ Rasterised ${rows.length} images.`);
  return 0;
}

process.exit(main());
