/**
 * Client-side catalogue search (pure, synchronous, framework-free).
 *
 * The catalogue is small (fetched once via `useProducts()`), so search runs entirely in memory:
 * - text is normalised (lower case, accents stripped, punctuation → spaces);
 * - every query token must match some weighted product field (AND semantics);
 * - a token matches by exact token, token prefix, joined-token prefix (`gtr` → "GT-R",
 *   `911gt3` → "911 GT3 RS") or substring (≥ 3 chars);
 * - typo safety net: only when that strict pass finds nothing, a second pass also accepts an
 *   edit distance of 1 (2 for tokens of 7+ chars; tokens of 4+ chars only, prefix typos 5+), so
 *   "porshe" still finds Porsche while "pors" never drags in "Horse" or "Pursuit";
 * - scores are summed per token (best field wins), plus phrase bonuses on the name.
 */
import type { Product } from '@/types';

/* ─────────────────────────────── Text helpers ─────────────────────────────── */

/** Lower case, strip diacritics, replace every non-alphanumeric run with one space. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Normalised tokens of `value` (empty array for blank input). */
export function tokenize(value: string): string[] {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(' ') : [];
}

/**
 * Optimal-string-alignment distance (Levenshtein + adjacent transpositions), with an early exit
 * once every cell of a row exceeds `max` (returns `max + 1`).
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a.length === 0 || b.length === 0) return Math.max(a.length, b.length);

  // Three rolling rows: i-2 (transpositions), i-1 and i.
  let prevPrev: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const current: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let value = Math.min(
        (prev[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
      if (
        i > 1 &&
        j > 1 &&
        a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        value = Math.min(value, (prevPrev[j - 2] ?? 0) + 1);
      }
      current[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = current;
  }
  return prev[b.length] ?? max + 1;
}

/* ─────────────────────────────── Field matching ───────────────────────────── */

interface SearchField {
  tokens: string[];
  /** `tokens.slice(i).join('')` for each start token (joined-token prefix matching). */
  joins: string[];
  weight: number;
}

const MAX_JOIN_DEPTH = 6;

function makeField(value: string, weight: number): SearchField | null {
  const tokens = tokenize(value);
  if (tokens.length === 0) return null;
  const joins = tokens
    .slice(0, MAX_JOIN_DEPTH)
    .map((_, index) => tokens.slice(index, index + MAX_JOIN_DEPTH).join(''));
  return { tokens, joins, weight };
}

/** Match quality of one query token against one field, 0 (none) … 1 (exact token). */
function tokenMatch(queryToken: string, field: SearchField, fuzzy: boolean): number {
  let best = 0;
  for (const token of field.tokens) {
    if (token === queryToken) return 1;
    if (token.startsWith(queryToken)) {
      // Longer typed prefixes are more specific.
      best = Math.max(best, 0.7 + 0.15 * (queryToken.length / token.length));
    } else if (queryToken.length >= 3 && token.includes(queryToken)) {
      best = Math.max(best, 0.45);
    }
  }
  if (best < 0.9 && queryToken.length >= 2) {
    for (const join of field.joins) {
      if (join === queryToken) {
        // Typed without separators: "offroad" → "off-road", "hwexotics" → "HW Exotics".
        best = Math.max(best, 0.9);
        break;
      }
      if (join.startsWith(queryToken)) best = Math.max(best, 0.75);
    }
  }
  if (fuzzy && best === 0 && queryToken.length >= 4) {
    const allowed = queryToken.length >= 7 ? 2 : 1;
    for (const token of field.tokens) {
      if (token.length < 3) continue;
      const distance = Math.min(
        editDistance(queryToken, token, allowed),
        queryToken.length >= 5 && token.length > queryToken.length
          ? editDistance(queryToken, token.slice(0, queryToken.length), allowed)
          : allowed + 1,
      );
      if (distance <= allowed) {
        best = Math.max(best, distance === 1 ? 0.35 : 0.25);
      }
    }
  }
  return best;
}

/** Best weighted score of `queryToken` across `fields`. */
function bestFieldScore(
  queryToken: string,
  fields: readonly SearchField[],
  fuzzy: boolean,
): number {
  let best = 0;
  for (const field of fields) {
    const quality = tokenMatch(queryToken, field, fuzzy);
    if (quality > 0) best = Math.max(best, quality * field.weight);
  }
  return best;
}

/**
 * Match score of free `text` against `query` (0 = no match; all query tokens must match).
 * Handy for filtering small static lists (categories, quick links) with the same rules.
 */
export function matchText(text: string, query: string): number {
  const queryTokens = tokenize(query);
  const field = makeField(text, 1);
  if (queryTokens.length === 0 || !field) return 0;
  return scoreField(queryTokens, field, false) || scoreField(queryTokens, field, true);
}

/** Sum of token qualities for one field (0 unless every token matches). */
function scoreField(
  queryTokens: readonly string[],
  field: SearchField | null,
  fuzzy: boolean,
): number {
  if (!field) return 0;
  let total = 0;
  for (const queryToken of queryTokens) {
    const quality = tokenMatch(queryToken, field, fuzzy);
    if (quality === 0) return 0;
    total += quality;
  }
  return total;
}

/* ─────────────────────────────── Product index ────────────────────────────── */

/** Field weights: name/make/model dominate, descriptive attributes break ties. */
export const SEARCH_FIELD_WEIGHTS = {
  name: 10,
  make: 9,
  model: 9,
  series: 5,
  category: 4,
  vehicleType: 4,
  color: 4,
  rarity: 3,
  tags: 3,
  year: 2,
  collection: 2,
} as const;

interface SearchEntry {
  product: Product;
  fields: SearchField[];
  normalizedName: string;
  normalizedMake: string;
}

export interface SearchIndex {
  readonly entries: readonly SearchEntry[];
  readonly size: number;
}

function productFields(product: Product): SearchField[] {
  const w = SEARCH_FIELD_WEIGHTS;
  const candidates: Array<SearchField | null> = [
    makeField(product.name, w.name),
    makeField(product.make, w.make),
    makeField(product.model, w.model),
    makeField(`${product.make} ${product.model}`, w.model),
    makeField(product.seriesName, w.series),
    makeField(product.category, w.category),
    makeField(product.vehicleType, w.vehicleType),
    makeField(product.color, w.color),
    makeField(
      product.limitedEdition ? `${product.rarity} limited edition` : product.rarity,
      w.rarity,
    ),
    makeField(product.tags.join(' '), w.tags),
    makeField(String(product.year), w.year),
    makeField(String(product.collectionNumber), w.collection),
  ];
  return candidates.filter((field): field is SearchField => field !== null);
}

/** Pre-tokenises the catalogue once (memoise it on the product list). */
export function buildSearchIndex(products: readonly Product[]): SearchIndex {
  const entries = products.map((product) => ({
    product,
    fields: productFields(product),
    normalizedName: normalizeSearchText(product.name),
    normalizedMake: normalizeSearchText(product.make),
  }));
  return { entries, size: entries.length };
}

export interface ScoredProduct {
  product: Product;
  score: number;
}

/** Scores every product for `query` (unsorted; products with score 0 are omitted). */
function scoreAll(
  index: SearchIndex,
  queryTokens: readonly string[],
  fuzzy: boolean,
): ScoredProduct[] {
  if (queryTokens.length === 0) return [];
  const phrase = queryTokens.join(' ');
  const results: ScoredProduct[] = [];

  for (const entry of index.entries) {
    let score = 0;
    let matchedAll = true;
    for (const queryToken of queryTokens) {
      const tokenScore = bestFieldScore(queryToken, entry.fields, fuzzy);
      if (tokenScore === 0) {
        matchedAll = false;
        break;
      }
      score += tokenScore;
    }
    if (!matchedAll) continue;
    if (entry.normalizedName === phrase) score += 12;
    else if (entry.normalizedName.startsWith(phrase)) score += 6;
    else if (entry.normalizedName.includes(phrase)) score += 3;
    if (entry.normalizedMake === phrase) score += 4;
    results.push({ product: entry.product, score });
  }
  return results;
}

function compareScored(a: ScoredProduct, b: ScoredProduct): number {
  return (
    b.score - a.score ||
    Number(b.product.isFeatured) - Number(a.product.isFeatured) ||
    b.product.ratingAvg - a.product.ratingAvg ||
    a.product.name.localeCompare(b.product.name, 'en', { numeric: true })
  );
}

/** Ranked matches with scores (best first). */
export function searchProductsScored(
  index: SearchIndex,
  query: string,
  limit: number = Number.POSITIVE_INFINITY,
): ScoredProduct[] {
  const queryTokens = tokenize(query);
  const strict = scoreAll(index, queryTokens, false);
  const ranked = (strict.length > 0 ? strict : scoreAll(index, queryTokens, true)).sort(
    compareScored,
  );
  return Number.isFinite(limit) ? ranked.slice(0, Math.max(0, limit)) : ranked;
}

/**
 * Ranked products matching `query` (best first). Blank query → `[]` (callers decide whether to
 * show the full catalogue). `limit` defaults to all matches.
 */
export function searchProducts(
  index: SearchIndex,
  query: string,
  limit: number = Number.POSITIVE_INFINITY,
): Product[] {
  return searchProductsScored(index, query, limit).map((result) => result.product);
}

/* ─────────────────────────────── Grouped autocomplete ─────────────────────── */

export interface ModelSuggestion {
  model: string;
  /** Active products with this make + model. */
  count: number;
  slugs: string[];
}

export interface MakeSuggestion {
  make: string;
  models: ModelSuggestion[];
}

export interface GroupSuggestionOptions {
  /** Max makes returned (default 4). */
  maxMakes?: number;
  /** Max models per make (default 6). */
  maxModels?: number;
}

interface MakeBucket {
  make: string;
  field: SearchField | null;
  models: Map<string, { model: string; field: SearchField | null; count: number; slugs: string[] }>;
}

/**
 * Make → Models autocomplete (e.g. "pors" or "911" → Porsche: 911 Carrera RS 2.7, 911 GT3 RS,
 * 911 Safari Rally, 911 Turbo S…). A query matching the make lists all of its models; otherwise
 * only models whose "make model" text matches every query token are listed. Makes are ranked by
 * match strength, models sorted naturally.
 */
export function groupSuggestions(
  products: readonly Product[],
  query: string,
  { maxMakes = 4, maxModels = 6 }: GroupSuggestionOptions = {},
): MakeSuggestion[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const buckets = new Map<string, MakeBucket>();
  for (const product of products) {
    const make = product.make.trim();
    const model = product.model.trim();
    if (!make || !model) continue;
    const makeKey = make.toLowerCase();
    let bucket = buckets.get(makeKey);
    if (!bucket) {
      bucket = { make, field: makeField(make, 1), models: new Map() };
      buckets.set(makeKey, bucket);
    }
    const modelKey = model.toLowerCase();
    const existing = bucket.models.get(modelKey);
    if (existing) {
      existing.count += 1;
      existing.slugs.push(product.slug);
    } else {
      bucket.models.set(modelKey, {
        model,
        field: makeField(`${make} ${model}`, 1),
        count: 1,
        slugs: [product.slug],
      });
    }
  }

  const rank = (fuzzy: boolean): Array<{ suggestion: MakeSuggestion; score: number }> => {
    const scoreTokens = (field: SearchField | null): number =>
      scoreField(queryTokens, field, fuzzy);
    const ranked: Array<{ suggestion: MakeSuggestion; score: number }> = [];
    for (const bucket of buckets.values()) {
      const makeScore = scoreTokens(bucket.field);
      const models = [...bucket.models.values()];
      const matching =
        makeScore > 0
          ? models.map((entry) => ({ entry, score: makeScore }))
          : models
              .map((entry) => ({ entry, score: scoreTokens(entry.field) }))
              .filter((candidate) => candidate.score > 0);
      if (matching.length === 0) continue;

      const bestScore = Math.max(makeScore, ...matching.map((candidate) => candidate.score));
      ranked.push({
        score: bestScore + (makeScore > 0 ? 0.5 : 0),
        suggestion: {
          make: bucket.make,
          models: matching
            .map(({ entry }) => ({ model: entry.model, count: entry.count, slugs: entry.slugs }))
            .sort((a, b) => a.model.localeCompare(b.model, 'en', { numeric: true }))
            .slice(0, Math.max(0, maxModels)),
        },
      });
    }
    return ranked;
  };

  const strict = rank(false);
  return (strict.length > 0 ? strict : rank(true))
    .sort((a, b) => b.score - a.score || a.suggestion.make.localeCompare(b.suggestion.make, 'en'))
    .slice(0, Math.max(0, maxMakes))
    .map((entry) => entry.suggestion);
}
