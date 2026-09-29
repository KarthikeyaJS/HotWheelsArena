import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The host machine may export NODE_ENV=production; keep test runs deterministic.
process.env.NODE_ENV = 'test';

const zodDir = fileURLToPath(new URL('./node_modules/zod', import.meta.url));

export default defineConfig({
  resolve: {
    // shared/ sits outside this package: resolve its `zod` import from functions/node_modules,
    // never from the web app's root node_modules.
    alias: [{ find: /^zod$/, replacement: zodDir }],
    dedupe: ['zod'],
  },
  test: {
    name: 'functions',
    include: ['src/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
  },
});
