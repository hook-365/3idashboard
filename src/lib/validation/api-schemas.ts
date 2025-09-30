/**
 * Zod validation schemas for API routes
 * Ensures input validation and type safety
 */
import { z } from 'zod';

/**
 * Common query parameters
 */
export const LimitSchema = z.coerce.number().int().min(1).max(1000).default(100);
export const SmoothSchema = z.coerce.boolean().default(false);
export const PredictSchema = z.coerce.boolean().default(false);

/**
 * Comet Data API Query Schema
 * /api/comet-data
 */
export const CometDataQuerySchema = z.object({
  smooth: SmoothSchema.optional(),
  predict: PredictSchema.optional(),
  limit: LimitSchema.optional(),
  maxObservations: LimitSchema.optional(), // Alias for limit
  trendDays: z.coerce.number().int().min(1).max(365).default(30).optional(),
});

export type CometDataQuery = z.infer<typeof CometDataQuerySchema>;

/**
 * Observations API Query Schema
 * /api/observations
 */
export const ObservationsQuerySchema = z.object({
  limit: LimitSchema.optional(),
  observer: z.string().max(100).optional(),
  minDate: z.string().datetime().optional(),
  maxDate: z.string().datetime().optional(),
});

export type ObservationsQuery = z.infer<typeof ObservationsQuerySchema>;

/**
 * Observers API Query Schema
 * /api/observers
 */
export const ObserversQuerySchema = z.object({
  limit: LimitSchema.optional(),
  minObservations: z.coerce.number().int().min(1).default(1).optional(),
});

export type ObserversQuery = z.infer<typeof ObserversQuerySchema>;

/**
 * Velocity API Query Schema
 * /api/velocity
 */
export const VelocityQuerySchema = z.object({
  type: z.enum([
    'brightness',
    'coma',
    'distance',
    'activity',
    'observer',
    'all'
  ]).default('brightness').optional(),
  days: z.coerce.number().int().min(1).max(90).default(7).optional(),
});

export type VelocityQuery = z.infer<typeof VelocityQuerySchema>;

/**
 * Simple Activity API Query Schema
 * /api/simple-activity
 */
export const SimpleActivityQuerySchema = z.object({
  limit: LimitSchema.optional(),
  days: z.coerce.number().int().min(1).max(180).default(90).optional(),
});

export type SimpleActivityQuery = z.infer<typeof SimpleActivityQuerySchema>;

/**
 * Solar System Position API Query Schema
 * /api/solar-system-position
 */
export const SolarSystemPositionQuerySchema = z.object({
  date: z.string().datetime().optional(),
  includeTrail: z.coerce.boolean().default(true).optional(),
  trailDays: z.coerce.number().int().min(1).max(365).default(90).optional(),
});

export type SolarSystemPositionQuery = z.infer<typeof SolarSystemPositionQuerySchema>;

/**
 * Gallery Images API Query Schema
 * /api/gallery-images
 */
export const GalleryImagesQuerySchema = z.object({
  limit: LimitSchema.optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  quality: z.enum(['thumb', 'medium', 'large', 'original']).default('medium').optional(),
});

export type GalleryImagesQuery = z.infer<typeof GalleryImagesQuerySchema>;

/**
 * Helper function to validate and parse query parameters
 * Returns validated data or throws ZodError
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): T {
  const rawParams: Record<string, string> = {};

  // Convert URLSearchParams to object
  searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  return schema.parse(rawParams);
}

/**
 * Helper function to safely validate query parameters
 * Returns { success: true, data } or { success: false, error }
 */
export function safeValidateQuery<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const rawParams: Record<string, string> = {};

  // Convert URLSearchParams to object
  searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const result = schema.safeParse(rawParams);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}