'use client';

/**
 * Specialized components for handling specific extension compatibility issues
 * These components provide drop-in replacements for common HTML elements
 * that are frequently affected by browser extensions.
 */

import React from 'react';
import ExtensionSafeWrapper from './ExtensionSafeWrapper';
import { useExtensionSafeRendering } from './ExtensionSafeWrapper';
import { ExtensionDetection } from '@/types/extensions';

// Extension-safe input component
export function ExtensionSafeInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { shouldSuppressHydrationWarning } = useExtensionSafeRendering();

  return (
    <ExtensionSafeWrapper
      enableSanitization={true}
      suppressWarnings={shouldSuppressHydrationWarning}
    >
      <input
        {...props}
        suppressHydrationWarning={shouldSuppressHydrationWarning}
      />
    </ExtensionSafeWrapper>
  );
}

// Extension-safe form component
export function ExtensionSafeForm({
  children,
  onExtensionDetected,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement> & {
  onExtensionDetected?: (extensions: ExtensionDetection) => void;
}) {
  const { shouldSuppressHydrationWarning } = useExtensionSafeRendering();

  const handleExtensionDetection = (extensions: ExtensionDetection) => {
    if (onExtensionDetected) {
      onExtensionDetected(extensions);
    }

    // Warn if form-affecting extensions are detected
    if (extensions.grammarly || extensions.passwordManager) {
      console.warn('[ExtensionSafeForm] Form-affecting extensions detected:', {
        grammarly: extensions.grammarly,
        passwordManager: extensions.passwordManager
      });
    }
  };

  return (
    <ExtensionSafeWrapper
      enableSanitization={true}
      suppressWarnings={shouldSuppressHydrationWarning}
      onExtensionDetected={handleExtensionDetection}
    >
      <form
        {...props}
        suppressHydrationWarning={shouldSuppressHydrationWarning}
      >
        {children}
      </form>
    </ExtensionSafeWrapper>
  );
}

// Extension-safe textarea (heavily affected by Grammarly)
export function ExtensionSafeTextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { shouldSuppressHydrationWarning } = useExtensionSafeRendering();

  return (
    <ExtensionSafeWrapper
      enableSanitization={true}
      suppressWarnings={shouldSuppressHydrationWarning}
      onExtensionDetected={(extensions: ExtensionDetection) => {
        if (extensions.grammarly) {
          console.warn('[ExtensionSafeTextArea] Grammarly detected - text area may have additional functionality');
        }
      }}
    >
      <textarea
        {...props}
        suppressHydrationWarning={shouldSuppressHydrationWarning}
      />
    </ExtensionSafeWrapper>
  );
}

// Extension-safe button (may be affected by various extensions)
export function ExtensionSafeButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { shouldSuppressHydrationWarning } = useExtensionSafeRendering();

  return (
    <ExtensionSafeWrapper className={className}>
      <button
        {...props}
        suppressHydrationWarning={shouldSuppressHydrationWarning}
      >
        {children}
      </button>
    </ExtensionSafeWrapper>
  );
}

// Extension-safe select (password managers often inject into selects)
export function ExtensionSafeSelect({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { shouldSuppressHydrationWarning } = useExtensionSafeRendering();

  return (
    <ExtensionSafeWrapper
      enableSanitization={true}
      suppressWarnings={shouldSuppressHydrationWarning}
    >
      <select
        {...props}
        suppressHydrationWarning={shouldSuppressHydrationWarning}
      >
        {children}
      </select>
    </ExtensionSafeWrapper>
  );
}

// Chart container (DarkReader and other extensions may affect canvas/SVG rendering)
export function ExtensionSafeChartContainer({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { shouldSuppressHydrationWarning } = useExtensionSafeRendering();

  return (
    <ExtensionSafeWrapper
      className={`extension-safe-chart-container ${className}`}
      enableSanitization={true}
      suppressWarnings={shouldSuppressHydrationWarning}
      onExtensionDetected={(extensions: ExtensionDetection) => {
        if (extensions.darkReader) {
          console.info('[ExtensionSafeChartContainer] DarkReader detected - chart colors may be modified');
        }
      }}
      {...props}
    >
      {children}
    </ExtensionSafeWrapper>
  );
}

// Component for critical sections that should never be modified
export function ExtensionProtectedSection({
  children,
  className = '',
  protectionLevel = 'standard',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  protectionLevel?: 'minimal' | 'standard' | 'maximum';
}) {
  const { shouldSuppressHydrationWarning } = useExtensionSafeRendering();

  const fallback = (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-red-800 text-sm">
        <strong>Protected Content Unavailable</strong>
        <p className="mt-1">
          A browser extension is preventing this content from loading correctly.
          Please try disabling extensions or refreshing the page.
        </p>
      </div>
    </div>
  );

  return (
    <ExtensionSafeWrapper
      className={`extension-protected-section protection-${protectionLevel} ${className}`}
      enableSanitization={protectionLevel === 'maximum'}
      suppressWarnings={false} // Always show warnings for protected sections
      fallback={fallback}
      {...props}
    >
      <div
        suppressHydrationWarning={shouldSuppressHydrationWarning}
        data-extension-protected="true"
        data-protection-level={protectionLevel}
      >
        {children}
      </div>
    </ExtensionSafeWrapper>
  );
}

// Higher-order component for wrapping existing components
export function withExtensionSafety<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    enableSanitization?: boolean;
    suppressWarnings?: boolean;
    displayName?: string;
  } = {}
) {
  const {
    enableSanitization = true,
    suppressWarnings = process.env.NODE_ENV === 'production',
    displayName
  } = options;

  const ExtensionSafeComponent = (props: P) => {
    return (
      <ExtensionSafeWrapper
        enableSanitization={enableSanitization}
        suppressWarnings={suppressWarnings}
      >
        <WrappedComponent {...props} />
      </ExtensionSafeWrapper>
    );
  };

  ExtensionSafeComponent.displayName = displayName || `ExtensionSafe(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ExtensionSafeComponent;
}