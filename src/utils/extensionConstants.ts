/**
 * Constants and configuration for browser extension detection
 */

import { ExtensionConfig, ExtensionDetection } from '@/types/extensions';

export const EXTENSION_CONFIG: ExtensionConfig = {
  selectors: {
    darkReader: [
      '[data-darkreader-mode]',
      '[data-darkreader-scheme]',
      'meta[name="darkreader-lock"]',
      '.darkreader',
      'style[data-darkreader-id]',
    ],
    grammarly: [
      '[data-gramm]',
      '[data-gramm-editor]',
      '[data-gramm_editor]',
      'grammarly-extension',
      '.gr_-',
      '.gr-btn',
      'div[data-gr-ext]',
    ],
    passwordManager: [
      '[data-lastpass-icon-root]',
      '[data-1p-ignore]',
      '[data-bwignore]',
      '.onepassword-extension-icon',
      '.dashlane-extension',
      '[data-dashlane-rid]',
      '.bitwarden-auto-fill',
      '[data-bitwarden-watchtower]',
    ],
    adBlocker: [
      '.adsbygoogle[data-adsbygoogle-status]',
      '[data-adblock-key]',
      '.ublock',
      '.adblock',
      '[data-ublock-origin]',
      '.ghostery',
    ],
  },

  attributes: [
    // DarkReader
    'data-darkreader-mode',
    'data-darkreader-scheme',
    'data-darkreader-inline-bgcolor',
    'data-darkreader-inline-bgimage',
    'data-darkreader-inline-border',
    'data-darkreader-inline-bordercolor',
    'data-darkreader-inline-color',
    'data-darkreader-inline-fill',
    'data-darkreader-inline-stroke',
    'data-darkreader-inline-outline',
    'data-darkreader-inline-text-decoration',

    // Grammarly
    'data-gramm',
    'data-gramm-editor',
    'data-gramm_editor',
    'data-gr-ext-installed',
    'data-gr-id',
    'data-gr-c-s-loaded',

    // Password Managers - LastPass
    'data-lastpass-icon-root',
    'data-lastpass-root',
    'data-lpignore',

    // Password Managers - 1Password
    'data-1p-ignore',
    'data-1p-root',

    // Password Managers - Bitwarden
    'data-bwignore',
    'data-bitwarden-watchtower',

    // Password Managers - Dashlane
    'data-dashlane-ignore',
    'data-dashlane-rid',

    // Ad Blockers
    'data-adsbygoogle-status',
    'data-adblock-key',
    'data-ublock-origin',

    // Generic extension patterns
    'data-extension-id',
    'data-chrome-extension',
    'data-firefox-addon',
  ],

  settings: {
    enableSanitization: true,
    suppressWarnings: process.env.NODE_ENV === 'production',
    logDetection: process.env.NODE_ENV === 'development',
  }
};

// Extension user-agent patterns
export const EXTENSION_USER_AGENTS = [
  'DarkReader',
  'Grammarly',
  'LastPass',
  '1Password',
  'Bitwarden',
  'Dashlane',
  'uBlock',
  'AdBlock',
  'Ghostery',
];

// DOM mutation patterns to watch for
export const MUTATION_PATTERNS = [
  /data-darkreader/,
  /data-gramm/,
  /data-lastpass/,
  /data-1p-/,
  /data-bw/,
  /data-dashlane/,
  /data-adblock/,
  /data-ublock/,
];

// CSS classes commonly injected by extensions
export const EXTENSION_CSS_CLASSES = [
  'darkreader',
  'gr_-',
  'gr-btn',
  'onepassword-extension',
  'lastpass-icon',
  'bitwarden-auto-fill',
  'dashlane-extension',
  'ublock',
  'adblock',
  'ghostery',
];

// Export the attributes array directly for convenient access
export const EXTENSION_ATTRIBUTES = EXTENSION_CONFIG.attributes;

// Elements that should never be sanitized (critical for app functionality)
export const PROTECTED_ELEMENTS = [
  'html',
  'head',
  'body',
  'script',
  'style',
  'link',
  'meta',
];

// Safe attributes that can remain even if added by extensions
export const SAFE_EXTENSION_ATTRIBUTES = [
  'data-theme',
  'data-color-scheme',
  'class',
  'style',
];

/**
 * Check if an element should be protected from sanitization
 */
export function isProtectedElement(element: Element): boolean {
  return PROTECTED_ELEMENTS.includes(element.tagName.toLowerCase());
}

/**
 * Check if an attribute is safe to keep
 */
export function isSafeAttribute(attributeName: string): boolean {
  return SAFE_EXTENSION_ATTRIBUTES.includes(attributeName) ||
         !attributeName.startsWith('data-') ||
         SAFE_EXTENSION_ATTRIBUTES.some(safe => attributeName.startsWith(safe));
}

/**
 * Get extension impact level based on detection
 */
export function getExtensionImpactLevel(extensions: ExtensionDetection): 'none' | 'low' | 'medium' | 'high' {
  if (extensions.grammarly) return 'high';
  if (extensions.darkReader || extensions.passwordManager) return 'medium';
  if (extensions.adBlocker || extensions.other.length > 0) return 'low';
  return 'none';
}