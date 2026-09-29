/**
 * Vitest config for the Firestore security-rules suite (tests/rules/**).
 *
 * Run it through the emulator so the rules engine is available:
 *   npm run test:rules
 *   (= firebase emulators:exec --only firestore --project demo-hotwheelsarena
 *      "vitest run -c vitest.rules.config.ts")
 *
 * Every test file talks to the SAME emulator project and clears it between tests, so files
 * must run one at a time in a single worker.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'rules',
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    // One worker, one file at a time: the suites share one emulator database.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    fileParallelism: false,
    sequence: { concurrent: false },
    // The first request warms up the emulator's rules engine (JVM) — be generous.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    restoreMocks: true,
  },
});
