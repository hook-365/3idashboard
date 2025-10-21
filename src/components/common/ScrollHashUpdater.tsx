'use client';

import { useEffect, useRef } from 'react';

interface ScrollHashUpdaterProps {
  /**
   * Optional array of section IDs to track. If not provided, auto-detects all elements with IDs.
   */
  sectionIds?: string[];

  /**
   * Visibility threshold (0-1). Default is 0.5 (50% visible).
   */
  threshold?: number;
}

/**
 * ScrollHashUpdater - Automatically updates URL hash based on scroll position
 *
 * Features:
 * - Uses IntersectionObserver for efficient scroll detection
 * - Updates hash when section becomes 50% visible (configurable)
 * - Doesn't cause page jumps when updating hash
 * - Respects existing hash navigation (direct links work correctly)
 * - Auto-detects sections with IDs if not specified
 */
export default function ScrollHashUpdater({
  sectionIds,
  threshold = 0.3  // Lowered from 0.5 to 0.3 (30% instead of 50%)
}: ScrollHashUpdaterProps = {}) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isUserScrolling = useRef(true);
  const hashUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const previousSectionRef = useRef<string | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    console.log('[ScrollHashUpdater] Initializing hash navigation...');

    // On initial load, if there's a hash in the URL, scroll to it
    // This handles direct hash links like /details#brightness-evolution
    const hadInitialHash = !!window.location.hash;
    if (window.location.hash) {
      const targetId = window.location.hash.slice(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        // Use a small delay to ensure the page is fully loaded
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }

    // Prevent automatic hash updates on initial page load
    // Only start updating hash after user actually scrolls
    let scrollListener: (() => void) | null = null;
    let initTimer: NodeJS.Timeout | null = null;

    if (!hadInitialHash) {
      isUserScrolling.current = false;

      // Re-enable hash updates after 2 seconds or when user scrolls
      const enableHashUpdates = () => {
        if (!hasInitialized.current) {
          hasInitialized.current = true;
          isUserScrolling.current = true;
          console.log('[ScrollHashUpdater] Hash updates enabled after user interaction');
        }
      };

      scrollListener = enableHashUpdates;
      window.addEventListener('scroll', scrollListener, { once: true });
      initTimer = setTimeout(enableHashUpdates, 2000);
    }

    // Detect if scroll was initiated by user or by hash navigation
    const handleHashChange = () => {
      isUserScrolling.current = false;

      // Re-enable user scrolling detection after animation completes
      setTimeout(() => {
        isUserScrolling.current = true;
      }, 1000);
    };

    window.addEventListener('hashchange', handleHashChange);

    // Delay observer setup to allow conditionally rendered sections to mount
    const initTimeout = setTimeout(() => {
    // Get all sections to observe
    let sectionsToObserve: Element[] = [];

    if (sectionIds && sectionIds.length > 0) {
      // Use provided section IDs
      const elements = sectionIds.map(id => document.getElementById(id));
      sectionsToObserve = elements.filter((el): el is HTMLElement => el !== null);
    } else {
      // Auto-detect all elements with IDs in the main content area
      // Look for sections, divs, articles with IDs
      const allElementsWithIds = document.querySelectorAll('[id]:not(script):not(style):not(link)');

      // Filter to only include meaningful content sections
      sectionsToObserve = Array.from(allElementsWithIds).filter(el => {
        const tagName = el.tagName.toLowerCase();
        const id = el.id;

        // Exclude navigation, header, footer elements and utility IDs
        if (
          tagName === 'nav' ||
          tagName === 'header' ||
          tagName === 'footer' ||
          id.startsWith('radix-') ||
          id.startsWith('headlessui-') ||
          el.closest('nav') ||
          el.closest('header')
        ) {
          return false;
        }

        // Include sections, articles, divs, and details elements with semantic IDs
        return tagName === 'section' ||
               tagName === 'article' ||
               tagName === 'div' ||
               tagName === 'details';
      });
    }

    console.log('[ScrollHashUpdater] Found sections to observe:', sectionsToObserve.map(el => el.id));

    if (sectionsToObserve.length === 0) {
      console.warn('[ScrollHashUpdater] No sections found to observe');
      return;
    }

    // Track which section is most visible
    const visibilityMap = new Map<Element, number>();

    // Create IntersectionObserver
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Update visibility map
        entries.forEach(entry => {
          visibilityMap.set(entry.target, entry.intersectionRatio);
        });

        // Only update hash if user is scrolling (not from programmatic navigation)
        if (!isUserScrolling.current) return;

        // Clear any pending hash updates
        if (hashUpdateTimer.current) {
          clearTimeout(hashUpdateTimer.current);
        }

        // Debounce hash updates to avoid rapid changes
        hashUpdateTimer.current = setTimeout(() => {
          // Find the most visible section that meets the threshold
          let mostVisibleSection: Element | null = null;
          let maxVisibility = threshold;

          visibilityMap.forEach((ratio, element) => {
            if (ratio > maxVisibility) {
              maxVisibility = ratio;
              mostVisibleSection = element;
            }
          });

          // Update hash if we found a visible section
          if (mostVisibleSection && (mostVisibleSection as HTMLElement).id) {
            const newHash = `#${(mostVisibleSection as HTMLElement).id}`;

            // Only update if hash actually changed
            if (window.location.hash !== newHash) {
              // Use replaceState to update hash without adding to history
              // This prevents back button issues and doesn't cause page jumps
              history.replaceState(null, '', newHash);

              // Dispatch custom event so SectionNavigator can react
              // (replaceState doesn't trigger hashchange event)
              const event = new CustomEvent('hashupdate', {
                detail: { hash: (mostVisibleSection as HTMLElement).id }
              });
              window.dispatchEvent(event);

              // Update previous section reference
              previousSectionRef.current = (mostVisibleSection as HTMLElement).id;
            }
          } else if (visibilityMap.size > 0) {
            // If no section meets threshold, clear the hash when at top
            const maxRatio = Math.max(...Array.from(visibilityMap.values()));
            if (maxRatio < threshold && window.scrollY < 100) {
              history.replaceState(null, '', window.location.pathname);
            }
          }
        }, 100); // 100ms debounce
      },
      {
        // Use multiple thresholds to get fine-grained updates
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        // Trigger when section is near the top of viewport (reduced margin)
        rootMargin: '-80px 0px -40% 0px'  // Top margin smaller, bottom margin larger
      }
    );

    // Observe all sections
    sectionsToObserve.forEach(section => {
      observerRef.current?.observe(section);
    });
    }, 1000); // Wait 1000ms for sections to render

    // Cleanup
    return () => {
      window.removeEventListener('hashchange', handleHashChange);

      if (scrollListener) {
        window.removeEventListener('scroll', scrollListener);
      }

      if (initTimer) {
        clearTimeout(initTimer);
      }

      clearTimeout(initTimeout);

      if (hashUpdateTimer.current) {
        clearTimeout(hashUpdateTimer.current);
      }

      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [sectionIds, threshold]);

  // This component doesn't render anything visible
  return null;
}
