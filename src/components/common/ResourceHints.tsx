/**
 * Resource Hints Component
 * Provides resource hints to the browser for optimal loading performance
 */

import Head from 'next/head';
import { useEffect } from 'react';

interface ResourceHintsProps {
  page?: 'home' | 'details' | 'observations' | 'gallery' | 'observers' | 'about' | 'comets';
}

export default function ResourceHints({ page = 'home' }: ResourceHintsProps) {
  useEffect(() => {
    // Preload critical fonts
    const fontPreloads = [
      '/fonts/inter-var.woff2',
    ];

    fontPreloads.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.href = font;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Prefetch API endpoints based on page
    const prefetchEndpoints = getPagePrefetchEndpoints(page);
    prefetchEndpoints.forEach(endpoint => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = endpoint;
      document.head.appendChild(link);
    });

    // Preconnect to external domains
    const preconnectDomains = [
      'https://cobs.si',
      'https://ssd.jpl.nasa.gov',
      'https://theskylive.com',
    ];

    preconnectDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      document.head.appendChild(link);
    });

    // DNS prefetch for additional domains
    const dnsPrefetchDomains = [
      'https://minorplanetcenter.net',
      'https://images.nasa.gov',
      'https://esahubble.org',
    ];

    dnsPrefetchDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });

    // Preload critical CSS (if using external stylesheets)
    const criticalCSS = [
      '/styles/critical.css',
    ];

    criticalCSS.forEach(css => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = css;
      link.onload = function() {
        (this as any).rel = 'stylesheet';
      };
      if (document.querySelector(`link[href="${css}"]`) === null) {
        document.head.appendChild(link);
      }
    });

    // Modulepreload for critical JavaScript modules
    if (page === 'details') {
      // Preload Three.js for 3D visualization
      const modulePreloads = [
        '/_next/static/chunks/three.js',
        '/_next/static/chunks/astronomy-engine.js',
      ];

      modulePreloads.forEach(module => {
        const link = document.createElement('link');
        link.rel = 'modulepreload';
        link.href = module;
        document.head.appendChild(link);
      });
    }

    // Cleanup function
    return () => {
      // Resource hints don't need cleanup as they're one-time operations
    };
  }, [page]);

  // Page-specific prefetch endpoints
  function getPagePrefetchEndpoints(page: string): string[] {
    const baseEndpoints = [
      '/api/comet-data',
      '/api/observations',
    ];

    const pageSpecificEndpoints: Record<string, string[]> = {
      home: [
        ...baseEndpoints,
        '/api/simple-activity',
        '/api/velocity?type=brightness',
      ],
      details: [
        ...baseEndpoints,
        '/api/simple-activity',
        '/api/velocity?type=brightness',
        '/api/velocity?type=coma',
        '/api/orbital-velocity',
        '/api/solar-system-position',
      ],
      observations: [
        ...baseEndpoints,
        '/api/observers',
      ],
      gallery: [
        '/api/comet-data',
        '/api/gallery-images',
      ],
      observers: [
        '/api/observers',
        '/api/observer-stats',
      ],
      comets: [
        '/api/dual-trajectory',
        '/api/solar-system-position',
      ],
      about: [],
    };

    return pageSpecificEndpoints[page] || baseEndpoints;
  }

  return (
    <Head>
      {/* Critical resource hints */}
      <link rel="preconnect" href="https://cobs.si" />
      <link rel="preconnect" href="https://ssd.jpl.nasa.gov" />
      <link rel="dns-prefetch" href="https://theskylive.com" />
      <link rel="dns-prefetch" href="https://minorplanetcenter.net" />

      {/* Preload critical fonts */}
      <link
        rel="preload"
        href="/fonts/inter-var.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />

      {/* Page-specific module preloads */}
      {page === 'details' && (
        <>
          <link rel="modulepreload" href="/_next/static/chunks/three.module.js" />
          <link rel="modulepreload" href="/_next/static/chunks/chart.module.js" />
        </>
      )}

      {/* Prefetch next likely navigation */}
      {page === 'home' && (
        <>
          <link rel="prefetch" href="/details" />
          <link rel="prefetch" href="/observations" />
        </>
      )}
      {page === 'details' && (
        <>
          <link rel="prefetch" href="/observations" />
          <link rel="prefetch" href="/gallery" />
        </>
      )}

      {/* Resource timing API hint */}
      <meta name="resource-timing" content="allow" />
    </Head>
  );
}