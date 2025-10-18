'use client';

import React, {
  useEffect,
  useRef,
  useState,
  ReactNode,
  HTMLAttributes,
  ErrorInfo
} from 'react';
import { useBrowserExtensions, sanitizeElementForHydration } from '@/hooks/useBrowserExtensions';
import { ExtensionDetection } from '@/types/extensions';

interface ExtensionSafeWrapperProps extends Omit<HTMLAttributes<HTMLDivElement>, 'suppressHydrationWarning'> {
  children: ReactNode;
  fallback?: ReactNode;
  enableSanitization?: boolean;
  suppressWarnings?: boolean;
  onExtensionDetected?: (extensions: ExtensionDetection) => void;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ExtensionErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    // Log hydration-related errors in development
    if (process.env.NODE_ENV === 'development') {
      const isHydrationError = error.message.includes('hydration') ||
                               error.message.includes('mismatch') ||
                               (errorInfo.componentStack && errorInfo.componentStack.includes('hydration'));

      if (isHydrationError) {
        console.warn('[ExtensionSafeWrapper] Caught potential extension-related hydration error:', error);
        console.warn('[ExtensionSafeWrapper] This is likely caused by browser extension DOM modifications.');
        console.warn('[ExtensionSafeWrapper] Component stack:', errorInfo.componentStack);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-yellow-800 text-sm">
            <strong>Extension Compatibility Issue</strong>
            <p className="mt-1">
              A browser extension may be interfering with this component.
              Try disabling extensions if the issue persists.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer">Technical Details</summary>
                <pre className="mt-1 p-2 bg-yellow-100 rounded overflow-auto">
                  {this.state.error?.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ExtensionSafeWrapper({
  children,
  fallback,
  enableSanitization = true,
  suppressWarnings = false,
  onExtensionDetected,
  className = '',
  ...props
}: ExtensionSafeWrapperProps) {
  const { isClient, extensions, hasExtensions, isHydrationSafe } = useBrowserExtensions();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [, setSanitized] = useState(false);

  // Notify parent about extension detection
  useEffect(() => {
    if (hasExtensions && onExtensionDetected) {
      onExtensionDetected(extensions);
    }
  }, [hasExtensions, extensions, onExtensionDetected]);

  // Handle client-side mounting and sanitization
  useEffect(() => {
    setIsMounted(true);

    if (!isClient || !enableSanitization || !hasExtensions) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Sanitize the container and its children
    try {
      sanitizeElementForHydration(container);
      setSanitized(true);

      if (process.env.NODE_ENV === 'development' && !suppressWarnings) {
        console.log('[ExtensionSafeWrapper] Sanitized container for extension compatibility');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ExtensionSafeWrapper] Failed to sanitize container:', error);
      }
    }
  }, [isClient, enableSanitization, hasExtensions, suppressWarnings]);

  // Set up continuous monitoring for dynamically injected content
  useEffect(() => {
    if (!isClient || !enableSanitization || !hasExtensions) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver((mutations) => {
      let needsSanitization = false;

      mutations.forEach((mutation) => {
        // Check for extension-related attribute changes
        if (mutation.type === 'attributes' &&
            mutation.attributeName?.startsWith('data-')) {
          const attrName = mutation.attributeName;
          if (attrName.includes('darkreader') ||
              attrName.includes('gramm') ||
              attrName.includes('lastpass') ||
              attrName.includes('1p-') ||
              attrName.includes('adblock')) {
            needsSanitization = true;
          }
        }

        // Check for added extension elements
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            const className = node.className || '';
            if (className.includes('gr_-') ||
                className.includes('darkreader') ||
                className.includes('lastpass') ||
                className.includes('onepassword')) {
              needsSanitization = true;
            }
          }
        });
      });

      if (needsSanitization) {
        try {
          sanitizeElementForHydration(container);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[ExtensionSafeWrapper] Runtime sanitization failed:', error);
          }
        }
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [isClient, enableSanitization, hasExtensions]);

  // During SSR or before hydration, show a loading state if extensions are detected
  if (!isMounted && hasExtensions && !isHydrationSafe) {
    return (
      <div
        className={`extension-safe-loading ${className}`}
        {...props}
        // Suppress hydration warnings for the loading state
        suppressHydrationWarning
      >
        {fallback || (
          <div className="animate-pulse">
            <div className="h-4 bg-[var(--color-bg-tertiary)] rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-[var(--color-bg-tertiary)] rounded w-1/2"></div>
          </div>
        )}
      </div>
    );
  }

  // Main render with error boundary protection
  return (
    <ExtensionErrorBoundary fallback={fallback}>
      <div
        ref={containerRef}
        className={`extension-safe-wrapper ${className}`}
        {...props}
        // Suppress hydration warnings when extensions are detected
        suppressHydrationWarning={hasExtensions && !suppressWarnings}
        data-extension-safe={hasExtensions ? 'true' : 'false'}
        data-extensions-detected={hasExtensions ? Object.entries(extensions)
          .filter(([, value]) => Array.isArray(value) ? value.length > 0 : value)
          .map(([key]) => key)
          .join(',') : undefined}
      >
        {children}
      </div>
    </ExtensionErrorBoundary>
  );
}

// Utility component for wrapping specific problematic elements
export function ExtensionSafeInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <ExtensionSafeWrapper>
      <input {...props} />
    </ExtensionSafeWrapper>
  );
}

export function ExtensionSafeForm({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <ExtensionSafeWrapper>
      <form {...props}>
        {children}
      </form>
    </ExtensionSafeWrapper>
  );
}

// Hook for components that need to conditionally render based on extension state
export function useExtensionSafeRendering() {
  const { isClient, hasExtensions, isHydrationSafe } = useBrowserExtensions();

  return {
    shouldSuppressHydrationWarning: hasExtensions,
    isReadyToRender: isClient || isHydrationSafe,
    renderWithWrapper: (children: ReactNode, wrapperProps?: Partial<ExtensionSafeWrapperProps>) => (
      <ExtensionSafeWrapper {...wrapperProps}>
        {children}
      </ExtensionSafeWrapper>
    ),
  };
}