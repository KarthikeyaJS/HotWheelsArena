#!/usr/bin/env node
/**
 * Dev visual-check helper: renders a route of the running dev server in headless Chromium,
 * writes a PNG screenshot and prints console errors/warnings + uncaught page errors.
 *
 * Requires: the dev server (npm run dev → http://localhost:5173) running against the
 * Firebase Emulator Suite (npm run emulators + npm run seed:emulator), and Playwright's
 * Chromium (npx playwright install chromium).
 *
 * Examples:
 *   node scripts/dev/snap.mjs --path /shop --out shots/shop.png
 *   node scripts/dev/snap.mjs --path /garage --signin --theme light --width 375 --full --out g.png
 *   node scripts/dev/snap.mjs --path /product/porsche-911-gt3 --click "[data-testid=buy-now]" --out p.png
 *   node scripts/dev/snap.mjs --path / --click "[aria-label^=Search]" --type "input[role=combobox]=porsche" --out s.png
 */
/* global window, document -- used inside page.evaluate / addInitScript callbacks (browser context) */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const HELP = `snap.mjs — screenshot a route + report console errors

  --path <route>        Route to open (default "/")
  --out <file.png>      Screenshot output path (default ./snap.png)
  --base <url>          Base URL (default http://localhost:5173)
  --width <px>          Viewport width (default 1440)
  --height <px>         Viewport height (default 900)
  --theme dark|light    Theme preference injected before load (default dark)
  --full                Full-page screenshot
  --wait <selector>     Wait for this CSS selector before acting (default: the route's "main h1")
  --delay <ms>          Extra settle delay before capture (default 600)
  --signin              Sign in with an emulator test account first (dev-only hook)
  --email <email>       Test account email for --signin (default collector@hwa.test)
  --name <name>         Display name for --signin (default "Test Collector")
  --click <selector>    Click an element after load (repeatable)
  --type <sel>=<text>   Fill text into an element after load (repeatable; split on the LAST "=")
                        --click and --type actions run in the order given on the command line.
  --scroll <px>         Scroll the window to this Y offset before capturing
  --reduced-motion      Emulate prefers-reduced-motion: reduce
  --timeout <ms>        Navigation/wait timeout (default 20000)
  --help                Show this help
`;

const { values, tokens } = parseArgs({
  tokens: true,
  options: {
    path: { type: 'string', default: '/' },
    out: { type: 'string', default: 'snap.png' },
    base: { type: 'string', default: 'http://localhost:5173' },
    width: { type: 'string', default: '1440' },
    height: { type: 'string', default: '900' },
    theme: { type: 'string', default: 'dark' },
    full: { type: 'boolean', default: false },
    wait: { type: 'string' },
    delay: { type: 'string', default: '600' },
    signin: { type: 'boolean', default: false },
    email: { type: 'string', default: 'collector@hwa.test' },
    name: { type: 'string', default: 'Test Collector' },
    click: { type: 'string', multiple: true, default: [] },
    type: { type: 'string', multiple: true, default: [] },
    scroll: { type: 'string' },
    'reduced-motion': { type: 'boolean', default: false },
    timeout: { type: 'string', default: '20000' },
    help: { type: 'boolean', default: false },
  },
  allowPositionals: false,
});

if (values.help) {
  process.stdout.write(HELP);
  process.exit(0);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    console.error(
      'Playwright is not installed. Run: npm install -D --include=dev @playwright/test && npx playwright install chromium',
    );
    process.exit(2);
  }
}

/**
 * Git Bash (MSYS) rewrites arguments that start with "/" into Windows paths, e.g. `--path /shop`
 * arrives as `C:/Program Files/Git/shop`. Undo that so routes work from any shell, and accept
 * routes given without a leading slash ("shop?view=new").
 */
function normalizeRoute(raw) {
  let route = String(raw ?? '/').replace(/\\/g, '/');
  const msys = route.match(
    /^[A-Za-z]:\/(?:Program Files(?: \(x86\))?\/Git|msys64|msys32|Git)(\/.*)?$/i,
  );
  if (msys) route = msys[1] ?? '/';
  if (!route.startsWith('/')) route = `/${route}`;
  return route;
}

const timeout = Number(values.timeout);
const width = Number(values.width);
const height = Number(values.height);
const theme = values.theme === 'light' ? 'light' : 'dark';
const outPath = resolve(values.out);
mkdirSync(dirname(outPath), { recursive: true });

const issues = { consoleErrors: [], consoleWarnings: [], pageErrors: [], failedRequests: [] };

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: values['reduced-motion'] ? 'reduce' : 'no-preference',
    colorScheme: theme,
  });
  // Persisted UI prefs (zustand persist key hwa-prefs-v1, version 2 — keep in sync with
  // src/store/uiStore.ts) so the no-flash script and the store both pick the theme.
  await context.addInitScript((t) => {
    try {
      const key = 'hwa-prefs-v1';
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : { state: {}, version: 2 };
      parsed.state = { ...(parsed.state || {}), theme: t };
      parsed.version = 2;
      window.localStorage.setItem(key, JSON.stringify(parsed));
    } catch {
      /* ignore */
    }
  }, theme);

  const page = await context.newPage();
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') issues.consoleErrors.push(text);
    else if (msg.type() === 'warning') issues.consoleWarnings.push(text);
  });
  page.on('pageerror', (err) => issues.pageErrors.push(String(err?.stack || err)));
  page.on('requestfailed', (req) => {
    const url = req.url();
    // Firestore long-poll/listen channels are routinely aborted on navigation — not an error.
    if (/google\.firestore|Listen\/channel|:8080\//.test(url)) return;
    issues.failedRequests.push(`${req.method()} ${url} — ${req.failure()?.errorText ?? 'failed'}`);
  });

  const url = new URL(normalizeRoute(values.path), values.base).toString();

  if (values.signin) {
    await page.goto(new URL('/', values.base).toString(), {
      waitUntil: 'domcontentloaded',
      timeout,
    });
    await page.waitForFunction(() => typeof window.__hwaTest?.signIn === 'function', null, {
      timeout,
    });
    const user = await page.evaluate(
      async ({ email, name }) => window.__hwaTest.signIn({ email, displayName: name }),
      { email: values.email, name: values.name },
    );
    console.log(`signed in as ${user?.email ?? values.email} (uid ${user?.uid ?? '?'})`);
    await page.waitForTimeout(800);
  }

  await page.goto(url, { waitUntil: 'networkidle', timeout }).catch(async () => {
    // networkidle can time out when Firestore keeps a channel open — fall back to load.
    await page.goto(url, { waitUntil: 'load', timeout });
  });

  if (values.wait) {
    await page.waitForSelector(values.wait, { timeout });
  } else {
    // Pages are lazy routes: wait until the route (not the Suspense fallback) has rendered its
    // h1, so --scroll/--click act on the real page. Best effort — some states have no h1.
    await page.waitForSelector('main h1', { timeout: Math.min(timeout, 10000) }).catch(() => {});
  }

  // --click / --type actions, in command-line order.
  const actions = tokens
    .filter((t) => t.kind === 'option' && (t.name === 'click' || t.name === 'type'))
    .map((t) => ({ name: t.name, value: String(t.value ?? '') }));
  for (const action of actions) {
    if (action.name === 'click') {
      await page.click(action.value, { timeout });
      await page.waitForTimeout(400);
      continue;
    }
    const idx = action.value.lastIndexOf('=');
    if (idx <= 0) {
      console.warn(`ignoring --type "${action.value}" (expected <selector>=<text>)`);
      continue;
    }
    await page.fill(action.value.slice(0, idx), action.value.slice(idx + 1), { timeout });
    await page.waitForTimeout(250);
  }
  if (values.scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), Number(values.scroll));
  }

  await page.waitForTimeout(Number(values.delay));
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  await page.screenshot({ path: outPath, fullPage: values.full });

  console.log(`screenshot: ${outPath}`);
  console.log(`url: ${page.url()}  viewport: ${width}x${height}  theme: ${theme}`);
  console.log(`title: ${await page.title()}`);
  if (overflow > 1)
    console.log(`HORIZONTAL OVERFLOW: page is ${overflow}px wider than the viewport`);
  const report = (label, arr) => {
    console.log(`${label} (${arr.length})`);
    for (const line of arr.slice(0, 25)) console.log(`  - ${line.slice(0, 500)}`);
  };
  report('console errors', issues.consoleErrors);
  report('page errors', issues.pageErrors);
  report('console warnings', issues.consoleWarnings);
  report('failed requests', issues.failedRequests);
  process.exitCode = issues.pageErrors.length ? 1 : 0;
} finally {
  await browser.close();
}
