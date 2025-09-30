import { NextRequest, NextResponse } from 'next/server';
import { cobsApi } from '@/services/cobs-api';
import { binObservationsByTime, calculateRegionalStatistics } from '@/services/data-transforms';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  // Pagination parameters
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Filter parameters
  const observer = searchParams.get('observer');
  const minMagnitude = searchParams.get('minMag') ? parseFloat(searchParams.get('minMag')!) : undefined;
  const maxMagnitude = searchParams.get('maxMag') ? parseFloat(searchParams.get('maxMag')!) : undefined;
  const days = parseInt(searchParams.get('days') || '0'); // 0 means all data

  // Analysis parameters
  const includeStats = searchParams.get('stats') === 'true';
  const includeBinned = searchParams.get('binned') === 'true';
  const sortBy = searchParams.get('sort') || 'date'; // 'date', 'magnitude', 'observer'
  const sortOrder = searchParams.get('order') || 'desc'; // 'asc', 'desc'

  try {
    console.log('Fetching observations with filters:', { observer, minMagnitude, maxMagnitude, days, includeStats });

    // Fetch all observations and observers in parallel if stats requested
    const [observations, observers] = await Promise.all([
      cobsApi.getObservations(),
      includeStats ? cobsApi.getObservers() : Promise.resolve([])
    ]);

    // Apply filters
    let filteredObservations = observations;

    // Filter by time period
    if (days > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filteredObservations = filteredObservations.filter(obs =>
        new Date(obs.date) >= cutoffDate
      );
    }

    // Filter by observer
    if (observer) {
      filteredObservations = filteredObservations.filter(obs =>
        obs.observer.name.toLowerCase().includes(observer.toLowerCase()) ||
        obs.observer.id.toLowerCase().includes(observer.toLowerCase())
      );
    }

    // Filter by magnitude range
    if (minMagnitude !== undefined) {
      filteredObservations = filteredObservations.filter(obs => obs.magnitude >= minMagnitude);
    }
    if (maxMagnitude !== undefined) {
      filteredObservations = filteredObservations.filter(obs => obs.magnitude <= maxMagnitude);
    }

    // Sort observations
    filteredObservations.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'magnitude':
          comparison = a.magnitude - b.magnitude;
          break;
        case 'observer':
          comparison = a.observer.name.localeCompare(b.observer.name);
          break;
        case 'date':
        default:
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const paginatedObservations = filteredObservations.slice(offset, offset + limit);

    // Generate statistics if requested
    let statistics = null;
    if (includeStats && observers.length > 0) {
      statistics = {
        regional: calculateRegionalStatistics(observers),
        magnitudeRange: {
          min: Math.min(...filteredObservations.map(obs => obs.magnitude)),
          max: Math.max(...filteredObservations.map(obs => obs.magnitude)),
          average: filteredObservations.reduce((sum, obs) => sum + obs.magnitude, 0) / filteredObservations.length
        },
        timespan: filteredObservations.length > 0 ? {
          earliest: filteredObservations[filteredObservations.length - 1].date,
          latest: filteredObservations[0].date
        } : null
      };
    }

    // Generate binned data if requested
    let binnedData = null;
    if (includeBinned && filteredObservations.length > 0) {
      binnedData = binObservationsByTime(filteredObservations, 'daily');
    }

    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: paginatedObservations,
      statistics,
      binnedData,
      metadata: {
        totalObservations: observations.length,
        filteredObservations: filteredObservations.length,
        returnedObservations: paginatedObservations.length,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < filteredObservations.length,
          totalPages: Math.ceil(filteredObservations.length / limit),
          currentPage: Math.floor(offset / limit) + 1
        },
        filters: {
          observer,
          minMagnitude,
          maxMagnitude,
          days,
          sortBy,
          sortOrder
        },
        processingTimeMs: processingTime,
        apiVersion: '2.0'
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`Observations API completed in ${processingTime}ms - returned ${paginatedObservations.length} of ${filteredObservations.length} filtered observations`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Processing-Time': processingTime.toString(),
        'X-Total-Count': filteredObservations.length.toString(),
        'X-Returned-Count': paginatedObservations.length.toString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Error fetching observations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Observations API error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
      filters: { observer, minMagnitude, maxMagnitude, days, includeStats },
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch observations',
        message: errorMessage,
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}