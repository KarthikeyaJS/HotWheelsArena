/**
 * Recent searches — sessionStorage-backed (localStorage is reserved for the cart and display prefs).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const RECENT_SEARCHES_STORAGE_KEY = 'hwa-recent-searches-v1';
export const MAX_RECENT_SEARCHES = 8;

export interface RecentSearchState {
  /** Most recent first, case-insensitively unique. */
  recent: string[];
  addRecent: (query: string) => void;
  removeRecent: (query: string) => void;
  clearRecent: () => void;
}

const normalize = (query: string): string => query.replace(/\s+/g, ' ').trim();

export const useRecentSearchStore = create<RecentSearchState>()(
  persist(
    (set) => ({
      recent: [],
      addRecent: (query) => {
        const value = normalize(query);
        if (value.length < 2) return;
        set((state) => ({
          recent: [
            value,
            ...state.recent.filter((item) => item.toLowerCase() !== value.toLowerCase()),
          ].slice(0, MAX_RECENT_SEARCHES),
        }));
      },
      removeRecent: (query) =>
        set((state) => ({
          recent: state.recent.filter(
            (item) => item.toLowerCase() !== normalize(query).toLowerCase(),
          ),
        })),
      clearRecent: () => set({ recent: [] }),
    }),
    {
      name: RECENT_SEARCHES_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ recent: state.recent }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as { recent?: unknown };
        const recent = Array.isArray(stored.recent)
          ? stored.recent
              .filter((item): item is string => typeof item === 'string')
              .slice(0, MAX_RECENT_SEARCHES)
          : [];
        return { ...current, recent };
      },
    },
  ),
);

export const useRecentSearches = (): string[] => useRecentSearchStore((state) => state.recent);
