/**
 * API Route Handler Utilities
 * Provides wrappers for Next.js API routes with:
 * - Request validation
 * - Logging
 * - Error handling
 * - Performance tracking
 * - Request deduplication
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger, logAPI } from '@/lib/logger';
import { dedupe } from '@/lib/utils/request-deduplicator';
import { CACHE_TTL } from '@/constants/cache';

export interface APIHandlerOptions<T = unknown> {
  /**
   * Zod schema for query parameter validation
   */
  querySchema?: z.ZodSchema<T>;

  /**
   * Enable request deduplication
   */
  deduplicate?: boolean;

  /**
   * Custom cache key generator for deduplication
   */
  cacheKey?: (request: NextRequest) => string;

  /**
   * HTTP cache headers configuration
   */
  cache?: {
    maxAge?: number;
    swr?: number;
  };
}

/**
 * Wraps an API route handler with validation, logging, and error handling
 *
 * @example
 * export const GET = apiHandler({
 *   querySchema: MyQuerySchema,
 *   deduplicate: true,
 *   cache: { maxAge: 300, swr: 600 }
 * }, async (request, query) => {
 *   const data = await fetchData(query);
 *   return { success: true, data };
 * });
 */
export function apiHandler<TQuery = unknown, TResponse = unknown>(
  options: APIHandlerOptions<TQuery>,
  handler: (
    request: NextRequest,
    query: TQuery
  ) => Promise<TResponse | NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const route = new URL(request.url).pathname;

    try {
      // Parse and validate query parameters
      const { searchParams } = new URL(request.url);
      let query: TQuery;

      if (options.querySchema) {
        const rawParams: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          rawParams[key] = value;
        });

        const result = options.querySchema.safeParse(rawParams);
        if (!result.success) {
          logger.warn({
            route,
            errors: result.error.issues,
            type: 'validation_error'
          }, 'Query parameter validation failed');

          return NextResponse.json(
            {
              success: false,
              error: 'Invalid query parameters',
              details: result.error.issues.map(e => ({
                field: e.path.join('.'),
                message: e.message
              }))
            },
            { status: 400 }
          );
        }

        query = result.data;
        logAPI.request(route, query as Record<string, unknown>);
      } else {
        query = {} as TQuery;
        logAPI.request(route);
      }

      // Execute handler with optional deduplication
      let response: TResponse | NextResponse;

      if (options.deduplicate) {
        const cacheKey = options.cacheKey
          ? options.cacheKey(request)
          : `${route}:${searchParams.toString()}`;

        response = await dedupe(cacheKey, () => handler(request, query));
      } else {
        response = await handler(request, query);
      }

      // Convert plain object response to NextResponse
      let nextResponse: NextResponse;
      if (response instanceof NextResponse) {
        nextResponse = response;
      } else {
        nextResponse = NextResponse.json(response);
      }

      // Add cache headers if configured
      if (options.cache) {
        const { maxAge = CACHE_TTL.HTTP_CACHE_PUBLIC, swr = CACHE_TTL.HTTP_STALE_WHILE_REVALIDATE } = options.cache;
        nextResponse.headers.set(
          'Cache-Control',
          `public, s-maxage=${Math.floor(maxAge / 1000)}, stale-while-revalidate=${Math.floor(swr / 1000)}`
        );
      }

      const duration = Date.now() - startTime;
      logAPI.response(route, duration);

      return nextResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      logAPI.error(route, error, duration);

      // Don't expose internal error details in production
      const errorMessage = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error instanceof Error
        ? error.message
        : String(error);

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Simple API handler without validation
 */
export function simpleAPIHandler<TResponse = unknown>(
  handler: (request: NextRequest) => Promise<TResponse | NextResponse>,
  cacheOptions?: APIHandlerOptions['cache']
) {
  return apiHandler<unknown, TResponse>(
    { cache: cacheOptions },
    (request) => handler(request)
  );
}

export default apiHandler;