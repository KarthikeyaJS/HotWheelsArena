/**
 * Deploy-config drift guards. These need no emulator; they live in the rules suite so CI runs
 * them next to the security-rules tests.
 *
 * The hosting config, the rules and the indexes repeat a few facts that also live in source
 * files. Each test below fails loudly when the two sides drift apart:
 *  - the CSP must carry the sha256 of every inline <script> in index.html;
 *  - emulator ports and the demo project id must match shared/constants.ts;
 *  - constants inside firestore.rules must mirror shared/gamification.ts and shared/types.ts;
 *  - the address regexes in the rules must accept and reject what shared/india.ts does;
 *  - the composite index that fetchOrders() needs and the rate-limit TTL policy must exist.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DEMO_PROJECT_ID, EMULATOR_PORTS } from '../../shared/constants.ts';
import { MAX_GARAGE_QUANTITY } from '../../shared/gamification.ts';
import { INDIAN_PHONE_REGEX, INDIAN_PINCODE_REGEX } from '../../shared/india.ts';
import { ORDER_STATUSES } from '../../shared/types.ts';

/* -------------------------------------------------------------------------------------------- */
/*                                    Parsed config files                                       */
/* -------------------------------------------------------------------------------------------- */

const readRepoFile = (path: string): string =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const HeaderSchema = z.object({ key: z.string(), value: z.string() });
const HeaderRuleSchema = z
  .object({
    source: z.string().optional(),
    regex: z.string().optional(),
    headers: z.array(HeaderSchema),
  })
  .refine((rule) => (rule.source === undefined) !== (rule.regex === undefined), {
    message: 'A header rule needs exactly one of `source` or `regex`',
  });
const EmulatorSchema = z.object({ host: z.string(), port: z.number().int() });

const FirebaseJsonSchema = z.object({
  hosting: z.object({
    public: z.string(),
    rewrites: z.array(z.object({ source: z.string(), destination: z.string() })),
    headers: z.array(HeaderRuleSchema),
  }),
  firestore: z.object({
    database: z.string(),
    location: z.string(),
    rules: z.string(),
    indexes: z.string(),
  }),
  functions: z.array(
    z.object({
      source: z.string(),
      codebase: z.string(),
      ignore: z.array(z.string()),
      predeploy: z.array(z.string()),
    }),
  ),
  emulators: z.object({
    auth: EmulatorSchema,
    firestore: EmulatorSchema,
    functions: EmulatorSchema,
    hosting: EmulatorSchema,
    ui: EmulatorSchema.extend({ enabled: z.boolean() }),
    singleProjectMode: z.boolean(),
  }),
});

const FirebaseRcSchema = z.object({ projects: z.object({ default: z.string() }) });

const IndexesSchema = z.object({
  indexes: z.array(
    z.object({
      collectionGroup: z.string(),
      queryScope: z.enum(['COLLECTION', 'COLLECTION_GROUP']),
      fields: z.array(
        z.object({
          fieldPath: z.string(),
          order: z.enum(['ASCENDING', 'DESCENDING']).optional(),
          arrayConfig: z.literal('CONTAINS').optional(),
        }),
      ),
    }),
  ),
  fieldOverrides: z.array(
    z.object({
      collectionGroup: z.string(),
      fieldPath: z.string(),
      ttl: z.boolean().optional(),
      indexes: z.array(
        z.object({
          order: z.enum(['ASCENDING', 'DESCENDING']).optional(),
          arrayConfig: z.literal('CONTAINS').optional(),
          queryScope: z.enum(['COLLECTION', 'COLLECTION_GROUP']).optional(),
        }),
      ),
    }),
  ),
});

const FunctionsPackageSchema = z.object({ main: z.string() });

const firebaseJson = FirebaseJsonSchema.parse(JSON.parse(readRepoFile('firebase.json')));
const firebaseRc = FirebaseRcSchema.parse(JSON.parse(readRepoFile('.firebaserc')));
const indexes = IndexesSchema.parse(JSON.parse(readRepoFile('firestore.indexes.json')));
const rules = readRepoFile('firestore.rules');
const indexHtml = readRepoFile('index.html');

/* -------------------------------------------------------------------------------------------- */
/*                                          Helpers                                             */
/* -------------------------------------------------------------------------------------------- */

const escapeRegExp = (text: string): string => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/** Firebase Hosting glob → RegExp for the subset used in firebase.json (`*`, `**`). */
function globToRegExp(glob: string): RegExp {
  if (/[!@+?]\(|[{}[\]]/.test(glob)) {
    throw new Error(`Extend globToRegExp() to support the pattern "${glob}"`);
  }
  const normalized = glob.startsWith('/') ? glob : `/${glob}`;
  const pattern = normalized
    .split(/(\*\*|\*)/)
    .map((token) => {
      if (token === '**') return '.*';
      if (token === '*') return '[^/]*';
      return escapeRegExp(token);
    })
    .join('');
  return new RegExp(`^${pattern}$`);
}

type HeaderRule = z.infer<typeof HeaderRuleSchema>;

function ruleMatches(rule: HeaderRule, path: string): boolean {
  if (rule.source !== undefined) return globToRegExp(rule.source).test(path);
  return new RegExp(rule.regex ?? '$^', 'u').test(path);
}

/** Header name → every value that the matching rules assign, in rule order. */
function headersFor(path: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const rule of firebaseJson.hosting.headers) {
    if (!ruleMatches(rule, path)) continue;
    for (const { key, value } of rule.headers) {
      result.set(key, [...(result.get(key) ?? []), value]);
    }
  }
  return result;
}

/** The single value of `key` for `path` (undefined when absent). */
function headerValue(path: string, key: string): string | undefined {
  const values = headersFor(path).get(key) ?? [];
  expect(values.length, `"${key}" is set by more than one rule for ${path}`).toBeLessThanOrEqual(1);
  return values[0];
}

function parseCsp(policy: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const directive of policy.split(';')) {
    const [name, ...sources] = directive.trim().split(/\s+/);
    if (name) directives.set(name, sources);
  }
  return directives;
}

function cspFor(path: string): Map<string, string[]> {
  const policy = headerValue(path, 'Content-Security-Policy');
  expect(policy, `no Content-Security-Policy for ${path}`).toBeDefined();
  return parseCsp(policy ?? '');
}

/** SHA-256 CSP source expression for each inline (src-less) <script> element. */
function inlineScriptHashes(html: string): string[] {
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  return scripts.map(
    ([, body = '']) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`,
  );
}

/** The literal returned by a zero-argument helper function in firestore.rules. */
function rulesFunctionReturn(name: string): string {
  const match = new RegExp(`function ${name}\\(\\)\\s*\\{\\s*return\\s*([\\s\\S]*?);`).exec(rules);
  expect(match, `function ${name}() not found in firestore.rules`).not.toBeNull();
  return (match?.[1] ?? '').trim();
}

const quotedStrings = (text: string): string[] =>
  [...text.matchAll(/'([^']*)'/g)].map(([, value = '']) => value);

function rulesRegex(field: string): RegExp {
  const match = new RegExp(`data\\.${field}\\.matches\\('([^']+)'\\)`).exec(rules);
  expect(match, `data.${field}.matches(...) not found in firestore.rules`).not.toBeNull();
  return new RegExp(match?.[1] ?? '$^');
}

/* -------------------------------------------------------------------------------------------- */
/*                                           Tests                                              */
/* -------------------------------------------------------------------------------------------- */

const SPA_PATHS = ['/', '/shop', '/product/porsche-911-gt3', '/garage', '/checkout/success/abc'];
const FIREBASE_RESERVED_PATHS = ['/__/auth/handler', '/__/auth/iframe'];

describe('index.html ↔ Content-Security-Policy', () => {
  it('script-src allows every inline script in index.html by its sha256 hash', () => {
    const hashes = inlineScriptHashes(indexHtml);
    expect(hashes.length, 'expected the inline no-flash theme script').toBeGreaterThan(0);
    const scriptSrc = cspFor('/').get('script-src') ?? [];
    for (const hash of hashes) {
      expect(
        scriptSrc,
        `index.html changed: put ${hash} into script-src in firebase.json`,
      ).toContain(hash);
    }
  });

  it('never allows inline or eval-based scripts wholesale', () => {
    const scriptSrc = cspFor('/').get('script-src') ?? [];
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain('*');
  });

  it('allows the Firebase, Cloudinary, Google Fonts and avatar endpoints the app uses', () => {
    const csp = cspFor('/');
    const expectations: Array<[string, string]> = [
      ['script-src', 'https://apis.google.com'],
      ['connect-src', 'https://*.googleapis.com'],
      ['connect-src', 'https://*.cloudfunctions.net'],
      ['frame-src', 'https://*.firebaseapp.com'],
      ['frame-src', 'https://accounts.google.com'],
      ['img-src', 'https://res.cloudinary.com'],
      ['img-src', 'https://lh3.googleusercontent.com'],
      ['style-src', 'https://fonts.googleapis.com'],
      ['font-src', 'https://fonts.gstatic.com'],
    ];
    for (const [directive, source] of expectations) {
      expect(csp.get(directive) ?? [], `${directive} should allow ${source}`).toContain(source);
    }
  });

  it('locks down plugins, base URIs, form targets and framing', () => {
    const csp = cspFor('/');
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'self'"]);
    expect(csp.get('form-action')).toEqual(["'self'"]);
    expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
  });

  it('has no media-src: the app plays no audio or video (falls back to default-src)', () => {
    expect(cspFor('/').has('media-src')).toBe(false);
  });
});

describe('hosting headers and caching', () => {
  it('serves dist/ as a single-page app', () => {
    expect(firebaseJson.hosting.public).toBe('dist');
    expect(firebaseJson.hosting.rewrites).toContainEqual({
      source: '**',
      destination: '/index.html',
    });
  });

  it.each([...SPA_PATHS, '/index.html'])(
    '%s (the app shell) is no-cache, framed by nobody and under the CSP',
    (path) => {
      expect(headerValue(path, 'Cache-Control')).toBe('no-cache');
      expect(headerValue(path, 'X-Frame-Options')).toBe('DENY');
      expect(headerValue(path, 'Content-Security-Policy')).toBeDefined();
    },
  );

  it('hashed build assets are cached immutably for a year', () => {
    expect(headerValue('/assets/index-Bkcgtoak.js', 'Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(headerValue('/assets/index-BKnLe06x.css', 'Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    );
  });

  it('the generated web manifest is revalidated on every load', () => {
    expect(headerValue('/site.webmanifest', 'Cache-Control')).toBe('no-cache');
  });

  it('placeholders are cached for a day', () => {
    expect(headerValue('/placeholders/car-generic.svg', 'Cache-Control')).toBe(
      'public, max-age=86400',
    );
  });

  it.each([...SPA_PATHS, '/assets/index-Bkcgtoak.js', ...FIREBASE_RESERVED_PATHS])(
    '%s gets the site-wide security headers',
    (path) => {
      expect(headerValue(path, 'X-Content-Type-Options')).toBe('nosniff');
      expect(headerValue(path, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(headerValue(path, 'Strict-Transport-Security')).toMatch(/^max-age=\d{8,}/);
      expect(headerValue(path, 'Permissions-Policy')).toContain('camera=()');
    },
  );

  it.each(FIREBASE_RESERVED_PATHS)(
    '%s (Firebase Auth helper) is left alone so the sign-in iframe can load',
    (path) => {
      expect(headerValue(path, 'X-Frame-Options')).toBeUndefined();
      expect(headerValue(path, 'Content-Security-Policy')).toBeUndefined();
      expect(headerValue(path, 'Cache-Control')).toBeUndefined();
    },
  );
});

describe('firebase.json / .firebaserc ↔ shared/constants.ts', () => {
  it('emulator ports match EMULATOR_PORTS', () => {
    const { emulators } = firebaseJson;
    expect({
      auth: emulators.auth.port,
      firestore: emulators.firestore.port,
      functions: emulators.functions.port,
      hosting: emulators.hosting.port,
      ui: emulators.ui.port,
    }).toEqual(EMULATOR_PORTS);
    expect(emulators.ui.enabled).toBe(true);
    expect(emulators.singleProjectMode).toBe(true);
  });

  it('the default project is the emulator-only demo project', () => {
    expect(firebaseRc.projects.default).toBe(DEMO_PROJECT_ID);
  });

  it('Firestore is pinned to asia-south1 (deploy creates a missing database there)', () => {
    expect(firebaseJson.firestore).toMatchObject({
      database: '(default)',
      location: 'asia-south1',
      rules: 'firestore.rules',
      indexes: 'firestore.indexes.json',
    });
  });

  it('functions deploy the compiled lib/ output, never stripping it', () => {
    const [codebase] = firebaseJson.functions;
    expect(codebase).toMatchObject({ source: 'functions', codebase: 'default' });
    expect(codebase?.predeploy.join(' ')).toContain('run build');
    // Ignore globs match base names anywhere: "src" or "lib" would drop lib/functions/src.
    expect(codebase?.ignore).not.toContain('src');
    expect(codebase?.ignore).not.toContain('lib');
    const functionsPackage = FunctionsPackageSchema.parse(
      JSON.parse(readRepoFile('functions/package.json')),
    );
    expect(functionsPackage.main.startsWith('lib/')).toBe(true);
  });
});

describe('firestore.rules ↔ shared', () => {
  it('garageMaxQuantity() equals MAX_GARAGE_QUANTITY', () => {
    expect(Number(rulesFunctionReturn('garageMaxQuantity'))).toBe(MAX_GARAGE_QUANTITY);
  });

  it('orderStatuses() equals ORDER_STATUSES', () => {
    expect(quotedStrings(rulesFunctionReturn('orderStatuses'))).toEqual([...ORDER_STATUSES]);
  });

  it.each([
    '9876543210',
    '6000000000',
    '7012345678',
    '5876543210',
    '0987654321',
    '987654321',
    '98765432101',
    '+919876543210',
    '98765 43210',
    '98765-43210',
  ])('the phone rule treats %s like INDIAN_PHONE_REGEX', (phone) => {
    expect(rulesRegex('phone').test(phone)).toBe(INDIAN_PHONE_REGEX.test(phone));
  });

  it.each(['560001', '110001', '403001', '060001', '56001', '5600011', '56OO01', ' 560001'])(
    'the PIN code rule treats "%s" like INDIAN_PINCODE_REGEX',
    (pincode) => {
      expect(rulesRegex('pincode').test(pincode)).toBe(INDIAN_PINCODE_REGEX.test(pincode));
    },
  );
});

describe('firestore.indexes.json', () => {
  it('has the orders (uid ASC, createdAt DESC) index used by fetchOrders()', () => {
    expect(indexes.indexes).toContainEqual({
      collectionGroup: 'orders',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'uid', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    });
  });

  it('expires rate-limit counters with a TTL policy on rateLimits.expiresAt', () => {
    expect(indexes.fieldOverrides).toContainEqual({
      collectionGroup: 'rateLimits',
      fieldPath: 'expiresAt',
      ttl: true,
      indexes: [],
    });
    // The collection the TTL policy targets is the functions-only one locked in the rules.
    expect(rules).toMatch(/match \/rateLimits\/\{docId\}\s*\{\s*allow read, write: if false;/);
  });

  it('declares only real composite indexes (two or more fields)', () => {
    for (const index of indexes.indexes) {
      expect(index.fields.length, `${index.collectionGroup} index`).toBeGreaterThanOrEqual(2);
    }
  });
});
