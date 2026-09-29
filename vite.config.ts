import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_TAGLINE,
  DEFAULT_TITLE,
  LOCALE,
  THEME_COLORS,
} from './src/config/brand';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Keeps the brand in ONE file (src/config/brand.ts):
 * - replaces %BRAND_*% / %THEME_COLOR% tokens in index.html
 * - serves (dev) and emits (build) /site.webmanifest generated from the brand config
 */
function brandPlugin(): Plugin {
  const tokens: Record<string, string> = {
    '%BRAND_NAME%': BRAND_NAME,
    '%BRAND_TITLE%': DEFAULT_TITLE,
    '%BRAND_DESCRIPTION%': BRAND_DESCRIPTION,
    '%BRAND_TAGLINE%': BRAND_TAGLINE,
    '%THEME_COLOR%': THEME_COLORS.dark,
  };
  const manifest = JSON.stringify(
    {
      name: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
      short_name: BRAND_NAME,
      description: BRAND_DESCRIPTION,
      lang: LOCALE,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: THEME_COLORS.dark,
      theme_color: THEME_COLORS.dark,
      icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    },
    null,
    2,
  );

  return {
    name: 'hwa-brand',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        Object.entries(tokens).reduce(
          (out, [token, value]) => out.split(token).join(escapeHtml(value)),
          html,
        ),
    },
    configureServer(server) {
      server.middlewares.use('/site.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.end(manifest);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'site.webmanifest', source: manifest });
    },
  };
}

const VENDOR_CHUNKS: ReadonlyArray<[name: string, pattern: RegExp]> = [
  [
    'vendor-react',
    /\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run\/router)\//,
  ],
  ['vendor-firebase', /\/node_modules\/(firebase|@firebase|idb)\//],
  ['vendor-motion', /\/node_modules\/(framer-motion|motion-dom|motion-utils)\//],
  ['vendor-query', /\/node_modules\/@tanstack\//],
];

/**
 * Stable vendor chunks for long-term caching. gsap and howler are intentionally NOT listed:
 * feature code imports them dynamically so they land in lazy chunks. Firebase Analytics
 * (and its installations dependency) also stays lazy.
 */
function manualChunks(id: string): string | undefined {
  const normalized = id.replace(/\\/g, '/');
  if (!normalized.includes('/node_modules/')) return undefined;
  if (
    /\/node_modules\/(firebase\/analytics|@firebase\/(analytics|installations))/.test(normalized)
  ) {
    return undefined;
  }
  for (const [name, pattern] of VENDOR_CHUNKS) {
    if (pattern.test(normalized)) return name;
  }
  return undefined;
}

export default defineConfig(({ command, mode }) => {
  // This machine exports NODE_ENV=production globally; a dev server must never run with it
  // (it disables React Fast Refresh and development warnings).
  if (command === 'serve' && mode !== 'production' && process.env.NODE_ENV === 'production') {
    process.env.NODE_ENV = 'development';
  }

  return {
    plugins: [react(), brandPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: false,
    },
    preview: {
      port: 4173,
    },
    esbuild: {
      legalComments: 'none',
      drop: command === 'build' ? ['debugger'] : [],
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  };
});
