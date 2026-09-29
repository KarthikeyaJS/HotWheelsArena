import { useEffect } from 'react';
import { CART_STORAGE_KEY, useCartStore } from '@/store/cartStore';
import { PREFS_STORAGE_KEY, useUiStore } from '@/store/uiStore';

/** Keeps the persisted cart and preferences in sync across open tabs. */
export function PersistSync() {
  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key === CART_STORAGE_KEY) void useCartStore.persist.rehydrate();
      if (event.key === PREFS_STORAGE_KEY) void useUiStore.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}
