'use client';

import React from 'react';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import DataSourcesSection from '../../components/common/DataSourcesSection';
import PageNavigation from '../../components/common/PageNavigation';
import AppHeader from '../../components/common/AppHeader';
import ObserverPerformanceDashboard from '../../components/analytics/ObserverPerformanceDashboard';
import { APIErrorBoundary } from '../../components/common/ErrorBoundary';

export default function ObserversPage() {
  // ObserverPerformanceDashboard handles its own data fetching

  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="container mx-auto px-6 py-8">
          {/* Observer Performance Analytics */}
          <APIErrorBoundary>
            <div className="mb-8">
              <ObserverPerformanceDashboard />
            </div>
          </APIErrorBoundary>

          {/* Data Sources & Attribution */}
          <DataSourcesSection />
        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}