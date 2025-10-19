import { NextRequest, NextResponse } from 'next/server';
import { cobsApi } from '@/services/cobs-api';
import { analyzeTrend } from '@/services/data-transforms';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  const includePrediction = searchParams.get('prediction') === 'true';
  const days = parseInt(searchParams.get('days') || '30');

  try {
    logger.info({ days, includePrediction }, 'Fetching trend analysis data');

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

    logger.info({
      processingTimeMs: processingTime,
      dataPoints: lightCurve.length,
      trend: trendAnalysis.trend
    }, 'Trend analysis completed');

    return NextResponse.json(response, {
      headers: {
        // Tier 2: Derived analytics - 15 minutes (statistical trend analysis from light curve)
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        'X-Processing-Time': processingTime.toString(),
        'X-Data-Source': 'COBS-Trend-Analysis',
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: Date.now() - startTime
    }, 'Error in trend-analysis API');

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