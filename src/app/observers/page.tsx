'use client';

import React from 'react';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import DataSourcesSection from '../../components/common/DataSourcesSection';
import PageNavigation from '../../components/common/PageNavigation';
import AppHeader from '../../components/common/AppHeader';
import DataAttribution from '../../components/common/DataAttribution';
import ObserverPerformanceDashboard from '../../components/analytics/ObserverPerformanceDashboard';
import { APIErrorBoundary } from '../../components/common/ErrorBoundary';
import ScrollHashUpdater from '../../components/common/ScrollHashUpdater';

export default function ObserversPage() {
  // ObserverPerformanceDashboard handles its own data fetching

  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        {/* Automatic hash navigation */}
        <ScrollHashUpdater />

        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--color-chart-primary)] via-[var(--color-chart-secondary)] to-[var(--color-chart-tertiary)] bg-clip-text text-transparent mb-3">
              Observer Network
            </h1>
            <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto">
              Global community of amateur and professional astronomers contributing observations. Performance stats and regional analysis.
            </p>
          </div>

          {/* Observer Performance Analytics */}
          <APIErrorBoundary>
            <section id="observer-analytics" className="mb-8">
              <ObserverPerformanceDashboard />
            </section>
          </APIErrorBoundary>

          {/* Data Sources & Attribution */}
          <section id="data-sources">
            <DataSourcesSection />
          </section>
        </div>

        {/* Data Attribution Footer */}
        <DataAttribution full={true} />
      </div>
    </ExtensionSafeWrapper>
  );
}