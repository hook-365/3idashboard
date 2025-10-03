'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Props for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Custom error message displayed to the user
   */
  errorTitle?: string;
  /**
   * Whether to show the retry button
   */
  showRetry?: boolean;
  /**
   * Whether to show error details (stack trace) - useful for development
   */
  showDetails?: boolean;
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Base ErrorBoundary component
 *
 * Catches React errors in component tree and displays fallback UI.
 * Provides retry functionality and error logging.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <ComponentThatMightError />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render shows the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error stack:', error.stack);
      console.error('Component stack:', errorInfo.componentStack);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const errorTitle = this.props.errorTitle || 'Something went wrong';
      const showRetry = this.props.showRetry !== false; // default true
      const showDetails = this.props.showDetails || process.env.NODE_ENV === 'development';

      return (
        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-200 mb-2">
                {errorTitle}
              </h3>
              <p className="text-red-300 mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>

              {showDetails && this.state.error && (
                <details className="mb-4 text-xs">
                  <summary className="cursor-pointer text-red-400 hover:text-red-300 mb-2">
                    Error Details
                  </summary>
                  <pre className="bg-gray-900/50 p-3 rounded overflow-x-auto text-red-200">
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="bg-gray-900/50 p-3 rounded overflow-x-auto text-red-200 mt-2">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </details>
              )}

              {showRetry && (
                <button
                  onClick={this.handleRetry}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white font-medium transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * APIErrorBoundary - Specialized boundary for API/data fetching errors
 */
export class APIErrorBoundary extends ErrorBoundary {
  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.message.includes('fetch') ||
                            this.state.error?.message.includes('network') ||
                            this.state.error?.message.includes('Failed to fetch');

      return (
        <div className="bg-orange-900/20 border border-orange-600/50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-orange-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-200 mb-2">
                Data Loading Error
              </h3>
              <p className="text-orange-300 mb-2">
                {isNetworkError
                  ? 'Unable to fetch data from the server. Please check your connection.'
                  : 'Failed to load data from the API.'}
              </p>
              <p className="text-sm text-orange-400 mb-4">
                {this.state.error?.message}
              </p>
              <button
                onClick={this.handleRetry}
                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded text-white font-medium transition-colors"
              >
                Retry Loading Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * ChartErrorBoundary - Specialized boundary for chart rendering errors
 */
export class ChartErrorBoundary extends ErrorBoundary {
  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-yellow-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-200 mb-2">
                Chart Display Error
              </h3>
              <p className="text-yellow-300 mb-2">
                Unable to render chart visualization.
              </p>
              <p className="text-sm text-yellow-400 mb-4">
                This could be due to invalid data or a rendering issue.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4 text-xs">
                  <summary className="cursor-pointer text-yellow-400 hover:text-yellow-300 mb-2">
                    Error Details
                  </summary>
                  <pre className="bg-gray-900/50 p-3 rounded overflow-x-auto text-yellow-200">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <button
                onClick={this.handleRetry}
                className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-white font-medium transition-colors"
              >
                Retry Chart Rendering
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * VisualizationErrorBoundary - Specialized boundary for 3D visualization errors
 */
export class VisualizationErrorBoundary extends ErrorBoundary {
  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isWebGLError = this.state.error?.message.includes('WebGL') ||
                          this.state.error?.message.includes('THREE') ||
                          this.state.error?.message.includes('canvas');

      return (
        <div className="bg-purple-900/20 border border-purple-600/50 rounded-lg p-6 min-h-[400px] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="flex justify-center mb-4">
              <svg
                className="w-12 h-12 text-purple-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-purple-200 mb-2">
              3D Visualization Error
            </h3>
            <p className="text-purple-300 mb-2">
              {isWebGLError
                ? 'Unable to initialize 3D rendering. Your browser may not support WebGL.'
                : 'Failed to load 3D visualization.'}
            </p>
            {isWebGLError && (
              <p className="text-sm text-purple-400 mb-4">
                Try updating your browser or enabling hardware acceleration in settings.
              </p>
            )}
            {!isWebGLError && (
              <p className="text-sm text-purple-400 mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            )}
            <button
              onClick={this.handleRetry}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-white font-medium transition-colors"
            >
              Retry Visualization
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
