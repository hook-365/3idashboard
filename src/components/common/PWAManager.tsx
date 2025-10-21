/**
 * PWA Manager Component
 * Handles service worker registration and PWA installation
 */

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAManager() {
  const [isOnline, setIsOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return;
    }

    // Register service worker
    registerServiceWorker();

    // Setup online/offline detection
    setupNetworkDetection();

    // Setup PWA install prompt
    setupInstallPrompt();

    // Setup periodic sync if supported
    setupPeriodicSync();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      setSwRegistration(registration);
      console.log('Service Worker registered:', registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              toast.info('New version available! Refresh to update.', {
                action: {
                  label: 'Refresh',
                  onClick: () => window.location.reload()
                },
                duration: 10000,
              });
            }
          });
        }
      });

      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const setupNetworkDetection = () => {
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  };

  const handleOnline = () => {
    setIsOnline(true);
    toast.success('Back online! Data will be refreshed.', {
      duration: 3000,
    });
  };

  const handleOffline = () => {
    setIsOnline(false);
    toast.warning('You are offline. Showing cached data.', {
      duration: 5000,
    });
  };

  const setupInstallPrompt = () => {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      console.log('PWA is installable');

      // Show install toast after a delay
      setTimeout(() => {
        toast.info('Install 3I/ATLAS Dashboard for offline access', {
          action: {
            label: 'Install',
            onClick: () => handleInstallClick()
          },
          duration: 10000,
        });
      }, 30000); // Show after 30 seconds
    });

    // Check if already installed
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        if (apps.length > 0) {
          console.log('PWA already installed');
        }
      });
    }

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed');
      setIsInstallable(false);
      setInstallPrompt(null);
      toast.success('App installed successfully!', {
        duration: 5000,
      });
    });
  };

  const handleInstallClick = async () => {
    if (!installPrompt) {
      console.log('No install prompt available');
      return;
    }

    try {
      // Show the install prompt
      await installPrompt.prompt();

      // Wait for the user choice
      const { outcome } = await installPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA installation accepted');
      } else {
        console.log('PWA installation dismissed');
      }

      // Clear the install prompt
      setInstallPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Installation failed:', error);
      toast.error('Installation failed. Please try again.');
    }
  };

  const setupPeriodicSync = async () => {
    if (!swRegistration) return;

    // Check if periodic sync is supported
    if ('periodicSync' in swRegistration) {
      try {
        // Request permission for periodic sync
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as any,
        });

        if (status.state === 'granted') {
          // Register periodic sync for comet data updates
          await (swRegistration as any).periodicSync.register('update-comet-data', {
            minInterval: 60 * 60 * 1000, // 1 hour
          });
          console.log('Periodic sync registered');
        }
      } catch (error) {
        console.log('Periodic sync not available:', error);
      }
    }
  };

  // Public install method that can be called from UI
  const installApp = () => {
    if (isInstallable) {
      handleInstallClick();
    }
  };

  // Don't render anything - this is a background manager
  return null;
}

// Export utility functions
export function isPWAInstalled(): boolean {
  // Check various conditions to determine if PWA is installed
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://') ||
    window.location.href.includes('mode=standalone')
  );
}

export function canInstallPWA(): boolean {
  // Check if the browser supports PWA installation
  return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
}