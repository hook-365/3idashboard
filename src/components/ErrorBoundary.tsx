'use client';

/**
 * Error Boundary Component
 * Catches React component errors and displays a fallback UI
 * Prevents entire page crash when a component throws an error
 */
import React, { Component, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to structured logger
    logger.error({
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      type: 'react_error_boundary',
    }, `React Error Boundary caught error: ${error.message}`);

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-red-900/20 border border-red-700/50 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-200 mb-2">
                  Something went wrong
                </h3>
                <p className="text-sm text-red-300/80 mb-4">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-4">
                    <summary className="text-xs text-red-400 cursor-pointer hover:text-red-300 mb-2">
                      Error details (development only)
                    </summary>
                    <pre className="text-xs text-red-300/70 bg-black/30 p-3 rounded overflow-auto max-h-48">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simple error fallback component for inline use
 */
export function ErrorFallback({ error, reset }: { error?: Error; reset?: () => void }) {
  return (
    <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-red-300">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm font-medium">
          {error?.message || 'Failed to load component'}
        </span>
      </div>
      {reset && (
        <button
          onClick={reset}
          className="mt-3 text-xs text-red-400 hover:text-red-300 underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export default ErrorBoundary;