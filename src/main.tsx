import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let hasReloadedForSWUpdate = false;

    if (hadController) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hasReloadedForSWUpdate) {
          hasReloadedForSWUpdate = true;
          window.location.reload();
        }
      });
    }

    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        registration.update().catch(() => {});
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });
      },
      onRegisterError(err) {
        console.warn('Service worker registration note:', err);
      },
    });
  } catch {
    // Graceful fallback when running outside service-worker capable context
  }
}

createRoot(document.getElementById('root')!).render(<App />);
