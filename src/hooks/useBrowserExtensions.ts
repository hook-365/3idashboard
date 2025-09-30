'use client';

import { useState, useEffect } from 'react';
import { ExtensionDetection, BrowserExtensionState } from '@/types/extensions';
import {
  EXTENSION_CONFIG,
  EXTENSION_ATTRIBUTES,
  MUTATION_PATTERNS,
  isProtectedElement,
  isSafeAttribute,
  getExtensionImpactLevel
} from '@/utils/extensionConstants';

function detectExtensions(): ExtensionDetection {
  const detection: ExtensionDetection = {
    darkReader: false,
    grammarly: false,
    passwordManager: false,
    adBlocker: false,
    other: [],
  };

  if (typeof window === 'undefined') {
    return detection;
  }

  const { selectors } = EXTENSION_CONFIG;

  // Check for DarkReader
  detection.darkReader = selectors.darkReader.some(selector => {
    try {
      return document.querySelector(selector) !== null;
    } catch {
      return false;
    }
  });

  // Check for Grammarly
  detection.grammarly = selectors.grammarly.some(selector => {
    try {
      return document.querySelector(selector) !== null;
    } catch {
      return false;
    }
  });

  // Check for Password Managers
  detection.passwordManager = selectors.passwordManager.some(selector => {
    try {
      return document.querySelector(selector) !== null;
    } catch {
      return false;
    }
  });

  // Check for Ad Blockers
  detection.adBlocker = selectors.adBlocker.some(selector => {
    try {
      return document.querySelector(selector) !== null;
    } catch {
      return false;
    }
  });

  // Check for other extension attributes
  const allElements = document.querySelectorAll('*');
  const foundAttributes = new Set<string>();

  allElements.forEach(element => {
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.includes('extension') ||
          attr.name.includes('addon') ||
          (attr.name.startsWith('data-') && !EXTENSION_CONFIG.attributes.includes(attr.name))) {
        // Check if it looks like an extension attribute
        if (attr.name.match(/^data-(.*)(extension|addon|plugin|ext)/i) ||
            attr.name.match(/^(chrome|firefox|safari|edge)-/i)) {
          foundAttributes.add(attr.name);
        }
      }
    });
  });

  detection.other = Array.from(foundAttributes);

  return detection;
}

function sanitizeElementForHydration(element: Element): void {
  // Don't sanitize protected elements
  if (isProtectedElement(element)) {
    return;
  }

  // Remove problematic extension attributes that cause hydration mismatches
  EXTENSION_CONFIG.attributes.forEach(attr => {
    if (element.hasAttribute(attr) && !isSafeAttribute(attr)) {
      try {
        element.removeAttribute(attr);
      } catch {
        // Silently ignore removal errors
      }
    }
  });

  // Remove extension-injected elements that aren't in the original markup
  const extensionSelectors = [
    ...EXTENSION_CONFIG.selectors.grammarly,
    ...EXTENSION_CONFIG.selectors.passwordManager,
    '.darkreader',
    '.ublock',
    '.adblock',
  ].filter(selector => !selector.startsWith('[') || !selector.includes('ignore'));

  extensionSelectors.forEach(selector => {
    try {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => {
        try {
          // Only remove if it's clearly an extension element
          if (el.tagName.toLowerCase().includes('extension') ||
              Array.from(el.classList).some(cls => cls.includes('extension') || cls.includes('gr_-'))) {
            el.remove();
          }
        } catch {
          // Ignore removal errors
        }
      });
    } catch {
      // Ignore selector errors
    }
  });
}

export function useBrowserExtensions(): BrowserExtensionState {
  const [isClient, setIsClient] = useState(false);
  const [extensions, setExtensions] = useState<ExtensionDetection>({
    darkReader: false,
    grammarly: false,
    passwordManager: false,
    adBlocker: false,
    other: [],
  });

  useEffect(() => {
    setIsClient(true);

    // Initial detection
    const detected = detectExtensions();
    setExtensions(detected);

    // Log detected extensions in development
    if (EXTENSION_CONFIG.settings.logDetection) {
      const extensionNames = [];
      if (detected.darkReader) extensionNames.push('DarkReader');
      if (detected.grammarly) extensionNames.push('Grammarly');
      if (detected.passwordManager) extensionNames.push('Password Manager');
      if (detected.adBlocker) extensionNames.push('Ad Blocker');
      if (detected.other.length > 0) extensionNames.push(`Other (${detected.other.length})`);

      if (extensionNames.length > 0) {
        const impactLevel = getExtensionImpactLevel(detected);
        console.warn(`[Extension Detection] Detected browser extensions (${impactLevel} impact):`, extensionNames);

        if (impactLevel === 'high') {
          console.warn('[Extension Detection] High impact extensions detected. Form inputs and interactive elements may be affected.');
        }

        console.warn('[Extension Detection] This may cause hydration warnings. Consider using ExtensionSafeWrapper for affected components.');

        if (detected.other.length > 0) {
          console.log('[Extension Detection] Unknown extension attributes:', detected.other);
        }
      }
    }

    // Set up a mutation observer to detect dynamically injected extension content
    const observer = new MutationObserver((mutations) => {
      let needsRecheck = false;

      mutations.forEach((mutation) => {
        // Check for added nodes with extension attributes
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            const hasExtensionAttributes = EXTENSION_ATTRIBUTES.some(attr =>
              node.hasAttribute?.(attr) || node.querySelector?.(`[${attr}]`)
            );

            if (hasExtensionAttributes) {
              needsRecheck = true;
            }
          }
        });

        // Check for attribute changes
        if (mutation.type === 'attributes') {
          const attrName = mutation.attributeName || '';
          if (EXTENSION_CONFIG.attributes.includes(attrName) ||
              MUTATION_PATTERNS.some(pattern => pattern.test(attrName))) {
            needsRecheck = true;
          }
        }
      });

      if (needsRecheck) {
        // Debounce the recheck
        setTimeout(() => {
          const newDetection = detectExtensions();
          setExtensions(prev => {
            const hasChanged = JSON.stringify(prev) !== JSON.stringify(newDetection);
            return hasChanged ? newDetection : prev;
          });
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: EXTENSION_CONFIG.attributes,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const hasExtensions = extensions.darkReader ||
                       extensions.grammarly ||
                       extensions.passwordManager ||
                       extensions.adBlocker ||
                       extensions.other.length > 0;

  const isHydrationSafe = !hasExtensions || isClient;

  return {
    isClient,
    extensions,
    hasExtensions,
    isHydrationSafe,
  };
}

export { sanitizeElementForHydration };