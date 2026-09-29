import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { env } from './config/env';
import { initAnalytics } from './config/firebase';
import './styles/globals.css';

// Dev + Emulator Suite only: test hooks (emulator sign-in) for scripts/dev/snap.mjs and e2e.
// `import.meta.env.DEV` is statically false in production builds, so this is dead-code eliminated.
if (import.meta.env.DEV && env.useEmulators) {
  void import('./dev/testHooks').then(({ installTestHooks }) => installTestHooks());
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found in index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Optional analytics — loaded lazily once the browser is idle.
const startAnalytics = (): void => {
  void initAnalytics();
};
if ('requestIdleCallback' in window) {
  window.requestIdleCallback(startAnalytics, { timeout: 5000 });
} else {
  setTimeout(startAnalytics, 3000);
}
