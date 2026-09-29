import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// The host machine exports NODE_ENV=production; React Testing Library needs React's
// development build (act() is unsupported in production builds).
process.env.NODE_ENV = 'test';

export default defineConfig((env) =>
  mergeConfig(
    viteConfig(env),
    defineConfig({
      test: {
        restoreMocks: true,
        css: false,
        projects: [
          {
            extends: true,
            test: {
              name: 'web',
              include: ['src/**/*.test.{ts,tsx}'],
              environment: 'jsdom',
              setupFiles: ['./src/test/setup.ts'],
            },
          },
          {
            extends: true,
            test: {
              name: 'shared',
              include: ['shared/**/*.test.ts'],
              environment: 'node',
            },
          },
        ],
      },
    }),
  ),
);
