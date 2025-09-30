'use client';

import React, { useState, useEffect } from 'react';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import DataSourcesSection from '../../components/common/DataSourcesSection';
import PageNavigation from '../../components/common/PageNavigation';
import AppHeader from '../../components/common/AppHeader';
import ObserverPerformanceDashboard from '../../components/analytics/ObserverPerformanceDashboard';

export default function ObserversPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/observers');
        if (!response.ok) throw new Error('Failed to fetch observer data');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData(); // Initial fetch

    const interval = setInterval(() => {
      // Only fetch when page is visible
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, 600000); // Changed from 60s to 10min (600000ms)

    return () => clearInterval(interval);
  }, []);


  if (loading) {
    return (
      <ExtensionSafeWrapper>
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-2xl">Loading observer network...</div>
        </div>
      </ExtensionSafeWrapper>
    );
  }

  if (error) {
    return (
      <ExtensionSafeWrapper>
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </ExtensionSafeWrapper>
    );
  }

  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="container mx-auto px-6 py-8">
          {/* Observer Performance Analytics */}
          <div className="mb-8">
            <ObserverPerformanceDashboard />
          </div>

          {/* Data Sources & Attribution */}
          <DataSourcesSection />
        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}