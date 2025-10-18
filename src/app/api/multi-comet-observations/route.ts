import { NextRequest, NextResponse } from 'next/server';
import { COBSApiClient } from '@/services/cobs-api';

/**
 * Multi-Comet COBS Observations API
 *
 * Fetches observations from COBS for multiple comets
 * Query params:
 *   - comet: Comet designation (e.g., "3I", "C/2025 A6", "C/2025 R2")
 *   - refresh: Force cache refresh (optional)
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cometDesignation = searchParams.get('comet') || '3I';
  const forceRefresh = searchParams.get('refresh') === 'true';

  const startTime = Date.now();

  try {
    console.log(`[Multi-Comet Observations API] Fetching data for ${cometDesignation}...`);

    // Create COBS client for the specified comet
    const cobsClient = new COBSApiClient(cometDesignation);

    // Fetch observations
    const observations = await cobsClient.getObservations(forceRefresh);
    const statistics = await cobsClient.getStatistics(forceRefresh);
    const observers = await cobsClient.getObservers(forceRefresh);

    const processingTime = Date.now() - startTime;

    console.log(`[Multi-Comet Observations API] ${cometDesignation}: ${observations.length} observations from ${observers.length} observers (${processingTime}ms)`);

    return NextResponse.json(
      {
        success: true,
        data: {
          comet: cometDesignation,
          observations,
          statistics,
          observers,
        },
        metadata: {
          comet_designation: cometDesignation,
          observation_count: observations.length,
          observer_count: observers.length,
          processing_time_ms: processingTime,
          last_updated: new Date().toISOString(),
          cache_ttl_seconds: 900, // 15 minutes
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
          'X-Processing-Time': processingTime.toString(),
          'X-Comet': cometDesignation,
        },
      }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Multi-Comet Observations API] Error for ${cometDesignation}:`, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch comet observations',
        message: error instanceof Error ? error.message : 'Unknown error',
        comet: cometDesignation,
        processingTimeMs: processingTime,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache',
          'X-Processing-Time': processingTime.toString(),
        },
      }
    );
  }
}
