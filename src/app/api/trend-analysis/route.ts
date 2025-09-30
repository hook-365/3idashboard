import { NextRequest, NextResponse } from 'next/server';
import { cobsApi } from '@/services/cobs-api';
import { analyzeTrend } from '@/services/data-transforms';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  const includePrediction = searchParams.get('prediction') === 'true';
  const days = parseInt(searchParams.get('days') || '30');

  try {
    console.log('Fetching trend analysis data...');

    // Get light curve data for trend analysis
    const lightCurve = await cobsApi.getLightCurve();

    if (!lightCurve || lightCurve.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No light curve data available for trend analysis',
        data: null
      });
    }

    // Analyze trend for the specified period
    const trendAnalysis = analyzeTrend(lightCurve, days);

    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        slope: trendAnalysis.rate,
        correlation: trendAnalysis.r2,
        trendDirection: trendAnalysis.trend,
        confidence: trendAnalysis.confidence > 0.7 ? 'high' :
                   trendAnalysis.confidence > 0.4 ? 'medium' : 'low',
        analysisWindow: days,
        dataPoints: lightCurve.length,
        ...(includePrediction && {
          prediction: {
            nextWeek: lightCurve[lightCurve.length - 1]?.magnitude + (trendAnalysis.rate * 7),
            nextMonth: lightCurve[lightCurve.length - 1]?.magnitude + (trendAnalysis.rate * 30),
            confidence: trendAnalysis.confidence
          }
        })
      },
      metadata: {
        processingTimeMs: processingTime,
        dataSource: 'COBS Light Curve Analysis',
        analysisMethod: 'Linear regression trend analysis',
        lastUpdated: new Date().toISOString()
      }
    };

    console.log(`Trend analysis completed in ${processingTime}ms`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Processing-Time': processingTime.toString(),
        'X-Data-Source': 'COBS-Trend-Analysis',
      },
    });

  } catch (error) {
    console.error('Error in trend-analysis API:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to analyze trend data',
      data: null,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString()
      }
    });
  }
}

// Cache for 5 minutes
export const dynamic = 'force-dynamic';
export const revalidate = 300;