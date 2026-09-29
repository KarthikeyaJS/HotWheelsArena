import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { PersistSync } from './PersistSync';
import { queryClient } from './queryClient';
import { ThemeSync } from './ThemeSync';

/**
 * Root providers (outside the router):
 * QueryClientProvider → MotionConfig (reduced motion honoured globally) → AuthProvider,
 * plus ThemeSync and cross-tab PersistSync.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <ThemeSync />
          <PersistSync />
          {children}
        </AuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
