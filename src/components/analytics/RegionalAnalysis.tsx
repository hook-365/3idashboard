'use client';

import React, { useState, useMemo, useEffect } from 'react';
import ExtensionSafeWrapper from '@/components/ExtensionSafeWrapper';

interface AnalyticsObserver {
  id: string;
  name: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  observationCount: number;
  averageMagnitude?: number;
  magnitudePrecision?: number;
  latestObservation?: string;
  observationFrequency?: number;
  qualityScore?: number;
  firstObservation?: string;
  country?: string;
  totalDays?: number;
}

interface RegionalStats {
  country: string;
  observerCount: number;
  totalObservations: number;
  averageQuality: number;
  coverageScore: number;
}

interface RegionalAnalysisProps {
  observers: AnalyticsObserver[];
  regionalStats: RegionalStats[];
}

interface CountryData {
  country: string;
  observerCount: number;
  totalObservations: number;
  averageObservationsPerObserver: number;
  averageQuality: number;
  latitudeSpread: number;
  longitudeSpread: number;
  coverageScore: number;
  topObserver: AnalyticsObserver;
  activeObservers: number; // observers with recent activity
}

interface ContinentData {
  continent: string;
  countries: CountryData[];
  totalObservers: number;
  totalObservations: number;
  coverageScore: number;
}

// Country mapping for continents
const continentMapping: Record<string, string> = {
    'United States': 'North America',
    'Canada': 'North America',
    'Mexico': 'North America',
    'Germany': 'Europe',
    'United Kingdom': 'Europe',
    'France': 'Europe',
    'Italy': 'Europe',
    'Spain': 'Europe',
    'Netherlands': 'Europe',
    'Belgium': 'Europe',
    'Switzerland': 'Europe',
    'Austria': 'Europe',
    'Poland': 'Europe',
    'Czech Republic': 'Europe',
    'Hungary': 'Europe',
    'Sweden': 'Europe',
    'Norway': 'Europe',
    'Denmark': 'Europe',
    'Finland': 'Europe',
    'Russia': 'Europe',
    'Ukraine': 'Europe',
    'Greece': 'Europe',
    'Portugal': 'Europe',
    'Ireland': 'Europe',
    'Japan': 'Asia',
    'China': 'Asia',
    'India': 'Asia',
    'South Korea': 'Asia',
    'Australia': 'Oceania',
    'New Zealand': 'Oceania',
    'Brazil': 'South America',
    'Argentina': 'South America',
    'Chile': 'South America',
    'Peru': 'South America',
    'Colombia': 'South America',
    'Venezuela': 'South America',
    'Ecuador': 'South America',
    'Uruguay': 'South America',
    'South Africa': 'Africa',
    'Egypt': 'Africa',
    'Morocco': 'Africa',
    'Kenya': 'Africa',
    'Nigeria': 'Africa',
    'Ghana': 'Africa',
  };

const getContinent = (country?: string): string => {
  return continentMapping[country || ''] || 'Other';
};

export default function RegionalAnalysis({ observers }: RegionalAnalysisProps) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'coverage'>('bar');
  const [sortBy, setSortBy] = useState<'observers' | 'observations' | 'quality' | 'coverage'>('observers');
  const [showTop, setShowTop] = useState(15);

  // Create Chart.js chart when component mounts
  useEffect(() => {
    import('chart.js/auto').then(() => {
      // Chart.js is loaded and ready to use
    });
  }, []);

  // Calculate comprehensive country statistics
  const countryData = useMemo(() => {
    const countryMap = new Map<string, AnalyticsObserver[]>();

    // Group observers by country
    observers.forEach(observer => {
      const country = observer.country || 'Unknown';
      if (!countryMap.has(country)) {
        countryMap.set(country, []);
      }
      countryMap.get(country)!.push(observer);
    });

    // Calculate statistics for each country
    const result: CountryData[] = Array.from(countryMap.entries()).map(([country, countryObservers]) => {
      const totalObservations = countryObservers.reduce((sum, obs) => sum + obs.observationCount, 0);
      const avgObsPerObserver = totalObservations / countryObservers.length;

      // Calculate quality score
      const qualityScores = countryObservers.map(obs => obs.qualityScore || 50);
      const averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

      // Calculate geographic coverage (latitude/longitude spread)
      const latitudes = countryObservers.map(obs => obs.location.lat);
      const longitudes = countryObservers.map(obs => obs.location.lng);
      const latitudeSpread = Math.max(...latitudes) - Math.min(...latitudes);
      const longitudeSpread = Math.max(...longitudes) - Math.min(...longitudes);

      // Coverage score based on observer count, geographic spread, and observation density
      const coverageScore = Math.min(100,
        (countryObservers.length * 10) + // observer count contribution
        (latitudeSpread * 2) + // latitude coverage
        (longitudeSpread * 1.5) + // longitude coverage
        (avgObsPerObserver / 10) // observation density
      );

      // Find top observer in country
      const topObserver = countryObservers.reduce((top, current) =>
        current.observationCount > top.observationCount ? current : top
      );

      // Count active observers (with recent observations)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const activeObservers = countryObservers.filter(obs =>
        obs.latestObservation && new Date(obs.latestObservation) > thirtyDaysAgo
      ).length;

      return {
        country,
        observerCount: countryObservers.length,
        totalObservations,
        averageObservationsPerObserver: avgObsPerObserver,
        averageQuality,
        latitudeSpread,
        longitudeSpread,
        coverageScore,
        topObserver,
        activeObservers,
      };
    });

    return result.sort((a, b) => {
      switch (sortBy) {
        case 'observers':
          return b.observerCount - a.observerCount;
        case 'observations':
          return b.totalObservations - a.totalObservations;
        case 'quality':
          return b.averageQuality - a.averageQuality;
        case 'coverage':
          return b.coverageScore - a.coverageScore;
        default:
          return b.observerCount - a.observerCount;
      }
    });
  }, [observers, sortBy]);

  // Calculate continent statistics
  const continentData = useMemo((): ContinentData[] => {
    const continentMap = new Map<string, CountryData[]>();

    countryData.forEach(country => {
      const continent = getContinent(country.country);
      if (!continentMap.has(continent)) {
        continentMap.set(continent, []);
      }
      continentMap.get(continent)!.push(country);
    });

    return Array.from(continentMap.entries()).map(([continent, countries]) => {
      const totalObservers = countries.reduce((sum, country) => sum + country.observerCount, 0);
      const totalObservations = countries.reduce((sum, country) => sum + country.totalObservations, 0);
      const avgCoverageScore = countries.reduce((sum, country) => sum + country.coverageScore, 0) / countries.length;

      return {
        continent,
        countries: countries.sort((a, b) => b.observerCount - a.observerCount),
        totalObservers,
        totalObservations,
        coverageScore: avgCoverageScore,
      };
    }).sort((a, b) => b.totalObservers - a.totalObservers);
  }, [countryData]);

  const topCountries = countryData.slice(0, showTop);

  const getCoverageColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getCoverageDescription = (score: number): string => {
    if (score >= 80) return 'Excellent coverage with dense observer network';
    if (score >= 60) return 'Good coverage with active observer participation';
    if (score >= 40) return 'Moderate coverage with room for growth';
    return 'Limited coverage needing more observers';
  };

  return (
    <ExtensionSafeWrapper>
      <div className="space-y-6">
        {/* Control Panel */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Chart Type</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'bar' | 'pie' | 'coverage')}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="bar">Bar Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="coverage">Coverage Analysis</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'observers' | 'observations' | 'quality' | 'coverage')}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="observers">Observer Count</option>
                <option value="observations">Total Observations</option>
                <option value="quality">Average Quality</option>
                <option value="coverage">Coverage Score</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Show Top</label>
              <select
                value={showTop}
                onChange={(e) => setShowTop(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value={10}>Top 10</option>
                <option value={15}>Top 15</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setSelectedCountry(null)}
                className="w-full px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded transition-colors"
              >
                Reset View
              </button>
            </div>
          </div>
        </div>

        {/* Continental Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {continentData.map(continent => (
            <div key={continent.continent} className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">{continent.continent}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Countries:</span>
                  <span className="font-medium">{continent.countries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Observers:</span>
                  <span className="font-medium">{continent.totalObservers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Observations:</span>
                  <span className="font-medium">{continent.totalObservations.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coverage:</span>
                  <span className="font-medium">{continent.coverageScore.toFixed(1)}/100</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Country Analysis Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-700">
            <h2 className="text-xl font-semibold">Country-by-Country Analysis</h2>
            <p className="text-gray-400 mt-1">Click on a country to view detailed statistics</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Country</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Observers</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Observations</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Avg/Observer</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase">Active</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase">Coverage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Top Observer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {topCountries.map((country, index) => (
                  <tr
                    key={country.country}
                    className={`hover:bg-gray-700 cursor-pointer transition-colors ${
                      selectedCountry === country.country ? 'bg-blue-900' : ''
                    }`}
                    onClick={() => setSelectedCountry(
                      selectedCountry === country.country ? null : country.country
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-300">#{index + 1}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <span className="mr-2">🌍</span>
                        <div>
                          <div className="font-medium text-white">{country.country}</div>
                          <div className="text-xs text-gray-400">{getContinent(country.country)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-white">{country.observerCount}</div>
                      <div className="text-xs text-gray-400">active: {country.activeObservers}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-white">{country.totalObservations.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-white">{country.averageObservationsPerObserver.toFixed(1)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-sm">
                        {((country.activeObservers / country.observerCount) * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${getCoverageColor(country.coverageScore)}`}></div>
                        <span className="text-sm">{country.coverageScore.toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-blue-300">{country.topObserver.name}</div>
                      <div className="text-xs text-gray-400">{country.topObserver.observationCount} obs</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coverage Analysis Chart */}
        {chartType === 'coverage' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Global Coverage Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coverage Score Distribution */}
              <div>
                <h4 className="font-medium text-gray-300 mb-3">Coverage Score Distribution</h4>
                <div className="space-y-2">
                  {[
                    { range: '80-100', label: 'Excellent', color: 'bg-green-500', count: countryData.filter(c => c.coverageScore >= 80).length },
                    { range: '60-79', label: 'Good', color: 'bg-yellow-500', count: countryData.filter(c => c.coverageScore >= 60 && c.coverageScore < 80).length },
                    { range: '40-59', label: 'Moderate', color: 'bg-orange-500', count: countryData.filter(c => c.coverageScore >= 40 && c.coverageScore < 60).length },
                    { range: '0-39', label: 'Limited', color: 'bg-red-500', count: countryData.filter(c => c.coverageScore < 40).length },
                  ].map(item => (
                    <div key={item.range} className="flex items-center">
                      <div className={`w-4 h-4 rounded ${item.color} mr-3`}></div>
                      <div className="flex-1 flex justify-between">
                        <span>{item.label} ({item.range})</span>
                        <span className="font-medium">{item.count} countries</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographic Insights */}
              <div>
                <h4 className="font-medium text-gray-300 mb-3">Geographic Insights</h4>
                <div className="space-y-3 text-sm">
                  <div className="bg-gray-700 rounded p-3">
                    <div className="font-medium text-blue-300 mb-1">Northern Hemisphere Dominance</div>
                    <div className="text-gray-300">
                      {observers.filter(obs => obs.location.lat > 0).length} of {observers.length} observers
                      ({((observers.filter(obs => obs.location.lat > 0).length / observers.length) * 100).toFixed(1)}%)
                      are located in the northern hemisphere
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded p-3">
                    <div className="font-medium text-green-300 mb-1">Longitudinal Coverage</div>
                    <div className="text-gray-300">
                      Global coverage spans {Math.round(Math.max(...observers.map(obs => obs.location.lng)) -
                      Math.min(...observers.map(obs => obs.location.lng)))}° longitude,
                      providing continuous observation potential
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded p-3">
                    <div className="font-medium text-purple-300 mb-1">Coverage Gaps</div>
                    <div className="text-gray-300">
                      Southern Ocean, Antarctica, and equatorial regions have limited observer presence,
                      creating potential observation gaps
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Country Details */}
        {selectedCountry && (
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-semibold">{selectedCountry} - Detailed Analysis</h3>
              <button
                onClick={() => setSelectedCountry(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {(() => {
              const countryDetails = countryData.find(c => c.country === selectedCountry);
              const countryObservers = observers.filter(obs => obs.country === selectedCountry);

              if (!countryDetails) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Statistics */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-300 mb-3">Observer Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Observers:</span>
                        <span className="font-medium">{countryDetails.observerCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Observers:</span>
                        <span className="font-medium">{countryDetails.activeObservers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Activity Rate:</span>
                        <span className="font-medium">
                          {((countryDetails.activeObservers / countryDetails.observerCount) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quality Score:</span>
                        <span className="font-medium">{countryDetails.averageQuality.toFixed(1)}/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Coverage */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-green-300 mb-3">Geographic Coverage</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Coverage Score:</span>
                        <span className="font-medium">{countryDetails.coverageScore.toFixed(1)}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Latitude Spread:</span>
                        <span className="font-medium">{countryDetails.latitudeSpread.toFixed(1)}°</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Longitude Spread:</span>
                        <span className="font-medium">{countryDetails.longitudeSpread.toFixed(1)}°</span>
                      </div>
                      <div className="mt-3">
                        <div className={`w-full h-2 rounded ${getCoverageColor(countryDetails.coverageScore)}`}></div>
                        <div className="text-xs text-gray-400 mt-1">
                          {getCoverageDescription(countryDetails.coverageScore)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Performers */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-300 mb-3">Top Performers</h4>
                    <div className="space-y-3">
                      {countryObservers
                        .sort((a, b) => b.observationCount - a.observationCount)
                        .slice(0, 3)
                        .map((observer, index) => (
                          <div key={observer.id} className="flex items-start">
                            <span className="text-xs bg-gray-600 rounded-full w-5 h-5 flex items-center justify-center mr-2 mt-0.5">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{observer.name}</div>
                              <div className="text-xs text-gray-400">
                                {observer.observationCount} observations •
                                Quality: {observer.qualityScore?.toFixed(0) || 'N/A'}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Educational Content */}
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">🌍 Understanding Regional Observatory Networks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-blue-300 mb-3">Why Geographic Distribution Matters</h4>
              <ul className="space-y-2 text-gray-300">
                <li>• <strong>24/7 Coverage:</strong> Global distribution ensures continuous observation as Earth rotates</li>
                <li>• <strong>Weather Independence:</strong> Multiple locations reduce impact of local weather conditions</li>
                <li>• <strong>Validation:</strong> Multiple observers confirm unusual brightness changes or morphological features</li>
                <li>• <strong>Cultural Perspectives:</strong> Different observing traditions contribute unique insights</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-purple-300 mb-3">Regional Advantages</h4>
              <ul className="space-y-2 text-gray-300">
                <li>• <strong>Northern Latitudes:</strong> Longer winter nights provide extended observation windows</li>
                <li>• <strong>Desert Regions:</strong> Clear, dry skies offer excellent transparency for faint objects</li>
                <li>• <strong>Mountain Locations:</strong> Higher altitude reduces atmospheric interference</li>
                <li>• <strong>Island Stations:</strong> Minimal light pollution and stable atmospheric conditions</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-4 bg-black bg-opacity-30 rounded">
            <p className="text-gray-300 text-sm">
              <strong>Coverage Score Calculation:</strong> Based on observer density, geographic spread, observation frequency,
              and data quality. Higher scores indicate regions that contribute significantly to global comet monitoring efforts.
            </p>
          </div>
        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}