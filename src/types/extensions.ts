/**
 * Types for browser extension detection and compatibility
 */

export interface ExtensionDetection {
  darkReader: boolean;
  grammarly: boolean;
  passwordManager: boolean;
  adBlocker: boolean;
  other: string[];
}

export interface BrowserExtensionState {
  isClient: boolean;
  extensions: ExtensionDetection;
  hasExtensions: boolean;
  isHydrationSafe: boolean;
}

export interface ExtensionConfig {
  // Selectors to detect extensions
  selectors: {
    darkReader: string[];
    grammarly: string[];
    passwordManager: string[];
    adBlocker: string[];
  };

  // Attributes that extensions commonly inject
  attributes: string[];

  // Settings for handling extensions
  settings: {
    enableSanitization: boolean;
    suppressWarnings: boolean;
    logDetection: boolean;
  };
}

export interface ExtensionSafeWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  enableSanitization?: boolean;
  suppressWarnings?: boolean;
  onExtensionDetected?: (extensions: ExtensionDetection) => void;
  className?: string;
}

export type ExtensionName = 'darkReader' | 'grammarly' | 'passwordManager' | 'adBlocker' | 'other';

export interface ExtensionImpact {
  extension: ExtensionName;
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

// Common extension impacts on web applications
export const EXTENSION_IMPACTS: ExtensionImpact[] = [
  {
    extension: 'darkReader',
    severity: 'medium',
    description: 'Injects data-darkreader-* attributes and may modify CSS styles',
    mitigation: 'Use ExtensionSafeWrapper around components with custom styling'
  },
  {
    extension: 'grammarly',
    severity: 'high',
    description: 'Modifies form inputs and text areas, injects DOM elements',
    mitigation: 'Wrap forms and input components with ExtensionSafeWrapper'
  },
  {
    extension: 'passwordManager',
    severity: 'medium',
    description: 'Adds icons and attributes to password/login forms',
    mitigation: 'Use ExtensionSafeForm for authentication forms'
  },
  {
    extension: 'adBlocker',
    severity: 'low',
    description: 'May hide elements or inject attributes for tracking prevention',
    mitigation: 'Ensure critical elements are not flagged as ads'
  }
];