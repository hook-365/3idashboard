import { NextRequest, NextResponse } from 'next/server';
import { fetchCometOrbitalTrail } from '@/lib/data-sources/jpl-horizons';
import { additionalComets } from '@/lib/celestial-bodies';

/**
 * Additional Comets API
 * Fetches orbital trails for additional comets in the solar system
 * Used for optional visualization in ModernSolarSystem
 */

export interface CometTrailData {
  designation: string;
  name: string;
  color: string;
  trail: Array<{
    date: string;
    x: number;
    y: number;
    z: number;
    distance_from_sun: number;
  }>;
}

// In-memory cache for comet trails (24 hour TTL)
const cometCache = new Map<string, { data: CometTrailData; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const designations = searchParams.get('designations')?.split(',') || [];
    const trailDays = parseInt(searchParams.get('trail_days') || '90');

    if (designations.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No comet designations provided'
      });
    }

    const results: CometTrailData[] = [];
    const now = Date.now();

    for (const designation of designations) {
      try {
        // Check cache
        const cacheKey = `${designation}-${trailDays}`;
        const cached = cometCache.get(cacheKey);

        if (cached && (now - cached.timestamp) < CACHE_TTL) {
          console.log(`Cache hit for ${designation}`);
          results.push(cached.data);
          continue;
        }

        // Fetch from JPL Horizons
        // Use appropriate date range for each comet based on perihelion
        let startDate: string, endDate: string;

        const cometInfo = additionalComets.find(c => c.designation === designation);
        if (cometInfo) {
          // Use ±6 months from perihelion for best visibility
          const perihelion = new Date(cometInfo.perihelionDate);
          const sixMonthsBefore = new Date(perihelion);
          sixMonthsBefore.setMonth(perihelion.getMonth() - 6);
          const sixMonthsAfter = new Date(perihelion);
          sixMonthsAfter.setMonth(perihelion.getMonth() + 6);

          startDate = sixMonthsBefore.toISOString().split('T')[0];
          endDate = sixMonthsAfter.toISOString().split('T')[0];
        } else {
          // Fallback to current year range
          startDate = '2025-07-01';
          endDate = '2026-01-31';
        }

        console.log(`Fetching orbital data for ${designation} from ${startDate} to ${endDate} (perihelion: ${cometInfo?.perihelionDate || 'unknown'})...`);

        // Try JPL Horizons first
        let jplData = await fetchCometOrbitalTrail(
          designation,
          startDate,
          endDate,
          '1d'
        );

        // If JPL Horizons fails, try alternate designations
        if (!jplData || !jplData.orbital_vectors || jplData.orbital_vectors.length === 0) {
          console.log(`  JPL Horizons failed for ${designation}, trying alternate formats...`);

          // Try different designation formats that JPL might accept
          const alternateDesignations = [];

          // If it's a periodic comet (e.g., "1P/Halley"), try "DES=1P/Halley"
          if (designation.match(/^\d+P\//)) {
            alternateDesignations.push(`DES=${designation}`);
          }

          // If it's a comet with year (e.g., "C/2023 A3"), try without spaces
          if (designation.match(/^C\/\d{4}\s+/)) {
            const noSpace = designation.replace(/\s+/g, '');
            alternateDesignations.push(noSpace);
            alternateDesignations.push(`DES=${noSpace}`);
          }

          for (const altDes of alternateDesignations) {
            console.log(`  Trying alternate designation: ${altDes}`);
            jplData = await fetchCometOrbitalTrail(altDes, startDate, endDate, '1d');
            if (jplData && jplData.orbital_vectors && jplData.orbital_vectors.length > 0) {
              console.log(`  ✓ Success with ${altDes}`);
              break;
            }
          }
        }

        if (jplData && jplData.orbital_vectors && jplData.orbital_vectors.length > 0) {
          const trail = jplData.orbital_vectors.map(vec => ({
            date: vec.date,
            x: vec.position.x,
            y: vec.position.y,
            z: vec.position.z,
            distance_from_sun: Math.sqrt(
              vec.position.x * vec.position.x +
              vec.position.y * vec.position.y +
              vec.position.z * vec.position.z
            )
          }));

          const cometData: CometTrailData = {
            designation,
            name: designation.split(' ').pop() || designation,
            color: '#FFFFFF', // Default, will be overridden by frontend
            trail
          };

          // Cache the result
          cometCache.set(cacheKey, { data: cometData, timestamp: now });
          results.push(cometData);

          console.log(`✓ Successfully fetched ${trail.length} points for ${designation}`);
        } else {
          console.warn(`⚠ No orbital data available for ${designation} - JPL may not have this comet`);
        }
      } catch (error) {
        console.error(`✗ Error fetching ${designation}:`, error instanceof Error ? error.message : error);
        // Continue with other comets even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        requested: designations.length,
        returned: results.length,
        trail_days: trailDays,
        cached: results.filter(r => {
          const cached = cometCache.get(`${r.designation}-${trailDays}`);
          return cached && (now - cached.timestamp) < CACHE_TTL;
        }).length
      }
    });

  } catch (error) {
    console.error('Additional comets API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour