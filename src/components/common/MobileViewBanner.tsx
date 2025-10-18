'use client';

import { useState, useEffect } from 'react';
import { Monitor, X } from 'lucide-react';

const BANNER_STORAGE_KEY = 'mobile-view-banner-dismissed';

/**
 * MobileViewBanner - One-time banner suggesting desktop/tablet viewing
 *
 * Features:
 * - Only shows on mobile devices (< 768px width)
 * - Dismissible with localStorage persistence
 * - Shows only once per browser
 */
export default function MobileViewBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if banner was previously dismissed
    let wasDismissed = false;
    try {
      wasDismissed = localStorage.getItem(BANNER_STORAGE_KEY) === 'true';
    } catch (e) {
      // localStorage unavailable
    }

    // Check if mobile device
    const isMobile = window.innerWidth < 768;

    // Show banner if mobile and not previously dismissed
    if (isMobile && !wasDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);

    // Save dismissal to localStorage
    try {
      localStorage.setItem(BANNER_STORAGE_KEY, 'true');
    } catch (e) {
      // localStorage unavailable - banner will show again on reload
    }
  };

  // Don't render anything until mounted (prevents SSR mismatch)
  if (!mounted || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <Monitor size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-relaxed">
              <strong>Best viewed on desktop or tablet</strong>
              <span className="block text-xs opacity-90 mt-1">
                This dashboard includes interactive 3D visualizations and detailed charts optimized for larger screens.
              </span>
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Dismiss banner"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
