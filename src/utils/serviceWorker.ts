import { registerSW as registerVitePWA } from 'virtual:pwa-register';

export function registerSW() {
  if ('serviceWorker' in navigator) {
    // Register the service worker
    const updateServiceWorker = registerVitePWA({
      onNeedRefresh() {
        if (confirm('New content available. Reload?')) {
          updateServiceWorker(true);
        }
      },
      onOfflineReady() {
        console.log('App ready to work offline');
      },
    });
  }
}