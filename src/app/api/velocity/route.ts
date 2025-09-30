import { NextRequest, NextResponse } from 'next/server';
import { cobsApi } from '@/services/cobs-api';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type') || 'brightness';
  const smoothingWindow = parseInt(searchParams.get('smoothingWindow') || '7');
  const limit = parseInt(searchParams.get('limit') || '100');
  const days = parseInt(searchParams.get('days') || '180');

  try {
    let data = [];

    switch (type) {
      case 'brightness':
        data = await calculateBrightnessVelocity(smoothingWindow, limit, days);
        break;
      default:
        throw new Error(`Unknown velocity type: ${type}. Only 'brightness' is currently implemented.`);
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        velocityData: data,
        type,
        parameters: { smoothingWindow, limit, days }
      },
      metadata: {
        processingTimeMs: processingTime,
        dataPoints: data.length,
        velocityType: type
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Processing-Time': processingTime.toString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`Error calculating ${type} velocity:`, error);

    return NextResponse.json({
      success: false,
      error: `Failed to calculate ${type} velocity`,
      message: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: processingTime,
    }, { status: 500 });
  }
}

async function calculateBrightnessVelocity(smoothingWindow: number, limit: number, days: number) {
  const observations = await cobsApi.getObservations();
  const recentObservations = observations.filter(obs => {
    const obsDate = new Date(obs.date);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return obsDate >= cutoffDate;
  });

  if (recentObservations.length < 2) return [];

  const velocityData = [];

  for (let i = smoothingWindow; i < recentObservations.length; i++) {
    const current = recentObservations[i];
    const previous = recentObservations[i - smoothingWindow];

    const timeDiff = (new Date(current.date).getTime() - new Date(previous.date).getTime()) / (1000 * 60 * 60 * 24);
    const magnitudeDiff = current.magnitude - previous.magnitude;

    if (timeDiff > 0) {
      velocityData.push({
        date: current.date,
        value: magnitudeDiff / timeDiff,
        confidence: Math.min(1, smoothingWindow / 7),
        dataPoints: smoothingWindow
      });
    }
  }

  return velocityData;
}

// Stub functions removed - only brightness velocity is implemented