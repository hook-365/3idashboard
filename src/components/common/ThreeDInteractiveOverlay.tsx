'use client';

import { useEffect, useState, useRef } from 'react';

interface ThreeDInteractiveOverlayProps {
  /**
   * Unique ID for this overlay instance (for localStorage persistence)
   */
  overlayId: string;

  /**
   * Optional custom messages
   */
  desktopMessage?: string;
  mobileMessage?: string;

  /**
   * Whether to persist the "dismissed" state across sessions
   * Default: true
   */
  persistDismissal?: boolean;

  /**
   * Callback when overlay is dismissed
   */
  onDismiss?: () => void;
}

/**
 * Interactive overlay/hint system for 3D visualizations
 *
 * Features:
 * - Device-specific messaging (desktop: mouse, mobile: touch)
 * - Disappears on first interaction
 * - Smooth fade-out animation
 * - Optional localStorage persistence
 * - Semi-transparent, non-intrusive design
 * - Theme-aware styling
 */
export default function ThreeDInteractiveOverlay({
  overlayId,
  desktopMessage = 'Click around and play!',
  mobileMessage = 'Touch around and play!',
  persistDismissal = true,
  onDismiss
}: ThreeDInteractiveOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hasInteractedRef = useRef(false);

  // Storage key for persistence
  const storageKey = `3d-overlay-dismissed-${overlayId}`;

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      // Check for touch capability and screen size
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(hasTouchScreen || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if overlay should be shown
  useEffect(() => {
    if (persistDismissal) {
      try {
        const dismissed = localStorage.getItem(storageKey);
        if (dismissed === 'true') {
          setIsVisible(false);
          return;
        }
      } catch (e) {
        // localStorage is disabled or blocked - continue without persistence
        console.log('[ThreeDInteractiveOverlay] localStorage unavailable, overlay will show');
      }
    }

    // Show overlay after a brief delay to ensure parent is rendered
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [storageKey, persistDismissal]);

  // Handle dismissal
  const dismissOverlay = () => {
    if (hasInteractedRef.current) return; // Prevent multiple dismissals

    hasInteractedRef.current = true;
    setIsFadingOut(true);

    // Persist dismissal state
    if (persistDismissal) {
      try {
        localStorage.setItem(storageKey, 'true');
      } catch (e) {
        // localStorage is disabled or blocked - overlay will show again on next visit
        console.log('[ThreeDInteractiveOverlay] localStorage unavailable, dismissal not persisted');
      }
    }

    // Remove overlay after fade animation
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 500); // Match CSS transition duration
  };

  // Set up interaction listeners
  useEffect(() => {
    if (!isVisible || isFadingOut) return;

    const handleInteraction = () => {
      dismissOverlay();
    };

    // Desktop: mouse events
    const mouseEvents = ['mouseover', 'mousedown', 'click'];
    // Mobile: touch events
    const touchEvents = ['touchstart', 'touchmove'];

    // Add all relevant listeners
    const events = isMobile ? touchEvents : mouseEvents;
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true, passive: true });
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [isVisible, isFadingOut, isMobile]);

  if (!isVisible) return null;

  const message = isMobile ? mobileMessage : desktopMessage;

  return (
    <div
      className={`
        absolute inset-0 z-30
        flex items-center justify-center
        pointer-events-none
        transition-opacity duration-500 ease-out
        ${isFadingOut ? 'opacity-0' : 'opacity-100'}
      `}
      style={{
        background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.1) 100%)'
      }}
    >
      <div
        className="
          px-8 py-4 rounded-lg
          text-center
          transform transition-all duration-500
          backdrop-blur-sm
        "
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <p className="text-white text-xl font-semibold tracking-wide">
          {message}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
