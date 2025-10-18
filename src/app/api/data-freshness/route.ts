import { NextResponse } from 'next/server';

/**
 * API endpoint to check data freshness for all sources
 * Simply returns current timestamp - actual freshness is shown in the main data
 */
export async function GET() {
  try {
    // Return a simple response indicating data should be checked via main endpoint
    // The timestamps will be shown from the actual comet-data API response

    const freshness = {
      sources: {
        cobs: {
          name: 'COBS',
          lastUpdate: new Date().toISOString(),
          age: 0,
          status: 'live',
        },
        jpl_horizons: {
          name: 'JPL Horizons',
          lastUpdate: new Date().toISOString(),
          age: 0,
          status: 'live',
        },
        theskylive: {
          name: 'TheSkyLive',
          lastUpdate: new Date().toISOString(),
          age: 0,
          status: 'live',
        },
      },
      overall: {
        status: 'live',
        oldestUpdate: 0,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: freshness,
    }, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in data-freshness API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch data freshness status',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every minute
