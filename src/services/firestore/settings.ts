/** `settings/site` — storefront commerce settings, with safe defaults. */
import { doc, getDoc } from 'firebase/firestore';
import { DEFAULT_SITE_SETTINGS } from '@shared/commerce';
import { COLLECTIONS, SETTINGS_SITE_DOC_ID } from '@shared/constants';
import type { SiteSettings } from '@shared/types';
import { db } from '@/config/firebase';
import { siteSettingsConverter } from './converters';

/** Site settings; falls back to `DEFAULT_SITE_SETTINGS` when missing or unreadable. */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const snapshot = await getDoc(
      doc(db, COLLECTIONS.settings, SETTINGS_SITE_DOC_ID).withConverter(siteSettingsConverter),
    );
    return snapshot.exists() ? snapshot.data() : { ...DEFAULT_SITE_SETTINGS };
  } catch (error) {
    console.warn('[settings] Using default site settings:', error);
    return { ...DEFAULT_SITE_SETTINGS };
  }
}
