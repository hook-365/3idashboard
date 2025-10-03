import { NextRequest, NextResponse } from 'next/server';
import { cobsApi, ObserverInfo } from '@/services/cobs-api';
import { calculateRegionalStatistics, transformObserversForMap } from '@/services/data-transforms';

interface ObserversResponseData {
  list?: ObserverInfo[];
  map?: ReturnType<typeof transformObserversForMap>;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  // Query parameters
  const includeStats = searchParams.get('stats') !== 'false'; // default true
  const format = searchParams.get('format') || 'list'; // 'list', 'map', 'both'
  const minObservations = parseInt(searchParams.get('minObs') || '1');
  const region = searchParams.get('region');
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    console.log('Fetching observers with params:', { includeStats, format, minObservations, region });

    // Optimization: Fetch observations once and reuse for observer statistics
    // This avoids duplicate fetches when getObservers() would internally call getObservations()
    const observations = await cobsApi.getObservations();
    const observers = await cobsApi.getObservers(false, observations);

    // Apply filters
    let filteredObservers = observers;

    // Filter by minimum observations
    if (minObservations > 1) {
      filteredObservers = filteredObservers.filter(obs => obs.observationCount >= minObservations);
    }

    // Filter by region
    if (region) {
      filteredObservers = filteredObservers.filter(obs =>
        obs.location.name.toLowerCase().includes(region.toLowerCase())
      );
    }

    // Apply limit
    const limitedObservers = filteredObservers.slice(0, limit);

    // Transform ObserverInfo to include required coordinates
    const transformedObservers = limitedObservers.map(obs => ({
      ...obs,
      location: {
        ...obs.location,
        lat: obs.location.lat || 0,
        lng: obs.location.lng || 0,
      }
    }));

    // Prepare response data based on format
    const responseData: ObserversResponseData = {
      list: transformedObservers,
    };

    if (format === 'map' || format === 'both') {
      responseData.map = transformObserversForMap(transformedObservers);
    }

    if (format === 'map') {
      delete responseData.list;
    }

    // Calculate statistics if requested
    let statistics = null;
    if (includeStats) {
      statistics = {
        regional: calculateRegionalStatistics(filteredObservers),
        summary: {
          totalObservers: filteredObservers.length,
          totalObservations: filteredObservers.reduce((sum, obs) => sum + obs.observationCount, 0),
          averageObservationsPerObserver: filteredObservers.length > 0 ?
            filteredObservers.reduce((sum, obs) => sum + obs.observationCount, 0) / filteredObservers.length : 0,
          observersWithCoordinates: transformedObservers.filter(obs => obs.location.lat && obs.location.lng).length,
        },
        topObservers: transformedObservers.slice(0, 10),
      };
    }

    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: responseData,
      statistics,
      metadata: {
        totalObservers: observers.length,
        filteredObservers: filteredObservers.length,
        returnedObservers: transformedObservers.length,
        filters: {
          minObservations,
          region,
          limit,
          format
        },
        processingTimeMs: processingTime,
        apiVersion: '2.0'
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`Observers API completed in ${processingTime}ms - returned ${transformedObservers.length} of ${filteredObservers.length} filtered observers`);

    return NextResponse.json(response, {
      headers: {
        // Tier 2: Derived analytics - 15 minutes (observer statistics and aggregations)
        // Observer list changes less frequently than individual observations
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        'X-Processing-Time': processingTime.toString(),
        'X-Total-Count': filteredObservers.length.toString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Error fetching observers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Observers API error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
      filters: { includeStats, format, minObservations, region },
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch observers',
        message: errorMessage,
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}