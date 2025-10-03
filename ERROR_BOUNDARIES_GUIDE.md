# Error Boundaries Implementation Guide

## Overview

This project now includes comprehensive error boundary support to prevent component errors from crashing the entire page. Error boundaries catch React errors, display user-friendly fallback UI, and provide retry functionality.

## Component Location

All error boundary components are located in:
```
/Users/anthony/dev/3idashboard/src/components/common/ErrorBoundary.tsx
```

## Available Error Boundaries

### 1. **ErrorBoundary** (Base Component)
Generic error boundary for catching any React errors.

```tsx
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

**Props:**
- `children`: React components to wrap
- `fallback?: ReactNode`: Custom fallback UI (optional)
- `onError?: (error: Error, errorInfo: ErrorInfo) => void`: Error callback (optional)
- `errorTitle?: string`: Custom error title
- `showRetry?: boolean`: Show retry button (default: true)
- `showDetails?: boolean`: Show error stack trace (default: development only)

### 2. **APIErrorBoundary**
Specialized boundary for API/data fetching errors. Detects network errors and displays appropriate messages.

```tsx
import { APIErrorBoundary } from '@/components/common/ErrorBoundary';

<APIErrorBoundary>
  <DataFetchingComponent />
</APIErrorBoundary>
```

### 3. **ChartErrorBoundary**
Specialized boundary for chart rendering errors (Chart.js components).

```tsx
import { ChartErrorBoundary } from '@/components/common/ErrorBoundary';

<ChartErrorBoundary>
  <LightCurve data={data} />
</ChartErrorBoundary>
```

### 4. **VisualizationErrorBoundary**
Specialized boundary for 3D visualization errors (Three.js, WebGL). Detects WebGL compatibility issues.

```tsx
import { VisualizationErrorBoundary } from '@/components/common/ErrorBoundary';

<VisualizationErrorBoundary>
  <ModernSolarSystem />
</VisualizationErrorBoundary>
```

## Current Implementation

Error boundaries are applied to all critical sections:

### Main Page (`/`)
- **APIErrorBoundary**: Mission status widget
- **ChartErrorBoundary**: Light curve chart
- **ChartErrorBoundary**: Brightness stats

### Details Page (`/details`)
- **VisualizationErrorBoundary**: 3D solar system visualization
- **ChartErrorBoundary**: All velocity charts
- **ChartErrorBoundary**: Brightness charts
- **ChartErrorBoundary**: Activity level chart

### Observers Page (`/observers`)
- **APIErrorBoundary**: Observer performance dashboard

### Observations Page (`/observations`)
- **APIErrorBoundary**: Observation table and stats

## Error UI Features

Each error boundary provides:

1. **User-Friendly Error Message**: Clear explanation of what went wrong
2. **Retry Button**: Allows users to retry rendering without page reload
3. **Error Details** (Development Only): Stack trace and component stack for debugging
4. **Type-Specific Messaging**: Different messages for API errors, chart errors, and visualization errors
5. **Graceful Degradation**: Other page sections continue working if one component fails

## Customizing Error UI

You can provide custom fallback UI:

```tsx
<ErrorBoundary
  fallback={
    <div className="text-center p-8">
      <h3>Oops! Something went wrong</h3>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  }
>
  <YourComponent />
</ErrorBoundary>
```

## Error Logging

All errors are automatically logged to console in development mode with:
- Error message and stack trace
- Component stack trace
- Timestamp of error

To add custom error handling (e.g., send to analytics):

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Send to your error tracking service
    console.error('Error caught:', error);
    // analytics.track('component_error', { error: error.message });
  }}
>
  <YourComponent />
</ErrorBoundary>
```

## Best Practices

1. **Wrap at Appropriate Granularity**:
   - Wrap individual features (charts, widgets) for granular error handling
   - Don't wrap entire pages (allows other sections to continue working)

2. **Use Specialized Boundaries**:
   - Use `APIErrorBoundary` for data fetching
   - Use `ChartErrorBoundary` for charts
   - Use `VisualizationErrorBoundary` for 3D graphics

3. **Test Error States**:
   - Intentionally throw errors in development to test boundaries
   - Verify retry functionality works correctly

4. **Monitor Production Errors**:
   - Use `onError` callback to send errors to monitoring service
   - Track which components fail most often

## Example: Testing Error Boundaries

To test error boundaries in development:

```tsx
// Create a component that throws an error
function BrokenComponent() {
  throw new Error('Test error for boundary');
  return <div>This won't render</div>;
}

// Wrap with error boundary
<ChartErrorBoundary>
  <BrokenComponent />
</ChartErrorBoundary>
```

You should see the error UI with retry button instead of a crashed page.

## Limitations

Error boundaries do NOT catch errors in:
- Event handlers (use try-catch instead)
- Asynchronous code (use try-catch with async/await)
- Server-side rendering
- Errors thrown in the error boundary itself

For async errors in event handlers:

```tsx
async function handleClick() {
  try {
    await fetchData();
  } catch (error) {
    setError(error);
  }
}
```

## TypeScript Support

All error boundaries are fully typed with TypeScript. Import types:

```tsx
import { ErrorInfo } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
```

## Impact

With error boundaries implemented:
- ✅ Component errors no longer crash entire page
- ✅ Better UX with user-friendly error messages
- ✅ Graceful degradation when data sources fail
- ✅ Easy retry functionality without page reload
- ✅ Development-friendly with detailed error info
- ✅ Production-ready with clean error messages
