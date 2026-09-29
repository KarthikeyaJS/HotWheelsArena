/**
 * `settings/site` — the storefront commerce settings (DECISIONS §7): exactly
 * `DEFAULT_SITE_SETTINGS` from shared/commerce.ts, with real timestamps instead of nulls, so the
 * client, the `placeOrder` function and the seeded document can never disagree on totals.
 */
import { DEFAULT_SITE_SETTINGS } from '../../shared/commerce.ts';
import { SETTINGS_SITE_DOC_ID } from '../../shared/constants.ts';
import type { SeedSiteSettings } from './types.ts';

export const SITE_SETTINGS_DOC_ID = SETTINGS_SITE_DOC_ID;

export const SITE_SETTINGS: SeedSiteSettings = {
  shippingThreshold: DEFAULT_SITE_SETTINGS.shippingThreshold,
  shippingFee: DEFAULT_SITE_SETTINGS.shippingFee,
  taxRate: DEFAULT_SITE_SETTINGS.taxRate,
  taxInclusive: DEFAULT_SITE_SETTINGS.taxInclusive,
  showGstLine: DEFAULT_SITE_SETTINGS.showGstLine,
  codEnabled: DEFAULT_SITE_SETTINGS.codEnabled,
  maxQtyPerItem: DEFAULT_SITE_SETTINGS.maxQtyPerItem,
  createdAt: '2025-11-01T10:00:00+05:30',
};
