'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import ExtensionSafeWrapper from '@/components/ExtensionSafeWrapper';
import DataSourcesSection from '@/components/common/DataSourcesSection';
import PageNavigation from '@/components/common/PageNavigation';
import AppHeader from '@/components/common/AppHeader';

interface GalleryImage {
  id: string;
  title: string;
  description: string;
  date: string;
  source: 'NASA' | 'ESA/Hubble' | 'JWST' | 'Virtual Telescope' | 'Community';
  imageUrl: string;
  thumbnailUrl: string;
  attribution: string;
  metadata: {
    telescope?: string;
    instrument?: string;
    filters?: string;
    exposureTime?: string;
    resolution?: string;
  };
}

// Cache configuration
const CACHE_KEY = 'gallery_images_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedData {
  data: GalleryImage[];
  timestamp: number;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [filterSource, setFilterSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'source' | 'title'>('date');

  useEffect(() => {
    fetchGalleryImages();
  }, []);

  const fetchGalleryImages = async () => {
    try {
      // Try to get from localStorage cache first
      const cachedDataStr = localStorage.getItem(CACHE_KEY);
      if (cachedDataStr) {
        try {
          const cachedData: CachedData = JSON.parse(cachedDataStr);
          const now = Date.now();

          // Check if cache is still valid (within TTL)
          if (now - cachedData.timestamp < CACHE_TTL) {
            // Use cached data
            setImages(cachedData.data);
            setLoading(false);
            return;
          }
        } catch {
          // If parsing fails, clear the cache and fetch fresh data
          localStorage.removeItem(CACHE_KEY);
        }
      }

      // Cache miss or expired - fetch from API
      const response = await fetch('/api/gallery-images');
      const result = await response.json();

      if (result.success) {
        setImages(result.data);

        // Store in cache with timestamp
        const cacheData: CachedData = {
          data: result.data,
          timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error('Error fetching gallery images:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedImages = images
    .filter(image => filterSource === 'all' || image.source === filterSource)
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'source') {
        return a.source.localeCompare(b.source);
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  const openLightbox = (image: GalleryImage) => {
    setSelectedImage(image);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'NASA': return 'text-blue-400 bg-blue-900/20';
      case 'ESA/Hubble': return 'text-purple-400 bg-purple-900/20';
      case 'JWST': return 'text-red-400 bg-red-900/20';
      case 'Virtual Telescope': return 'text-green-400 bg-green-900/20';
      case 'Community': return 'text-orange-400 bg-orange-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-6">📸</div>
          <div className="text-2xl font-semibold mb-2">Loading Photo Gallery</div>
          <div className="text-gray-400">Fetching 3I/ATLAS images from multiple sources...</div>
          <div className="mt-4">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-blue-400 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="container mx-auto px-6 py-8">
          {/* Filters and Controls */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Source</label>
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Sources</option>
                    <option value="NASA">NASA</option>
                    <option value="ESA/Hubble">ESA/Hubble</option>
                    <option value="JWST">James Webb Space Telescope</option>
                    <option value="Virtual Telescope">Virtual Telescope Project</option>
                    <option value="Community">Community</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'source' | 'title')}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="date">Date (Newest First)</option>
                    <option value="source">Source</option>
                    <option value="title">Title</option>
                  </select>
                </div>
              </div>
              <div className="text-gray-300">
                Showing {filteredAndSortedImages.length} of {images.length} images
              </div>
            </div>
          </div>

          {/* Image Grid */}
          {filteredAndSortedImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedImages.map((image) => (
                <div key={image.id} className="bg-gray-800 rounded-lg overflow-hidden hover:transform hover:scale-105 transition-all duration-300 cursor-pointer" onClick={() => openLightbox(image)}>
                  <div className="relative aspect-square">
                    <Image
                      src={image.thumbnailUrl}
                      alt={image.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      unoptimized
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSourceColor(image.source)}`}>
                        {image.source}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2">{image.title}</h3>
                    <p className="text-gray-400 text-sm mb-2 line-clamp-3">{image.description}</p>
                    <div className="text-xs text-gray-500">
                      {new Date(image.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">🔭</div>
              <h3 className="text-2xl font-semibold text-gray-200 mb-4">
                {filterSource === 'all' ? 'No Images Available Yet' : `No ${filterSource} Images Found`}
              </h3>
              <div className="max-w-2xl mx-auto space-y-3 text-gray-300">
                {filterSource === 'all' ? (
                  <>
                    <p>
                      No images are currently available. This may be due to a temporary loading issue.
                    </p>
                    <p className="text-sm text-gray-400">
                      The gallery displays official 3I/ATLAS observations from the ATLAS Survey and Hubble Space Telescope.
                      Please refresh the page or check back shortly.
                    </p>
                    <div className="pt-4 flex gap-4 justify-center">
                      <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <span>Refresh Gallery</span>
                      </button>
                      <a
                        href="https://science.nasa.gov/solar-system/comets/3i-atlas/comet-3i-atlas-multimedia/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        <span>View NASA Source</span>
                        <span>→</span>
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <p>No images found from {filterSource}. Try selecting &quot;All Sources&quot; to see available content.</p>
                    <button
                      onClick={() => setFilterSource('all')}
                      className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      View All Sources
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Lightbox Modal */}
          {selectedImage && (
            <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={closeLightbox}>
              <div className="max-w-6xl max-h-full bg-gray-800 rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <button
                    onClick={closeLightbox}
                    className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75 transition-all"
                  >
                    ✕
                  </button>
                  <div className="relative aspect-video max-h-[70vh]">
                    <Image
                      src={selectedImage.imageUrl}
                      alt={selectedImage.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1536px) 100vw, 1536px"
                      unoptimized
                    />
                  </div>
                </div>
                <div className="p-6 max-h-60 overflow-y-auto">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">{selectedImage.title}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSourceColor(selectedImage.source)}`}>
                      {selectedImage.source}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-4">{selectedImage.description}</p>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-400">Date:</span>
                      <div className="text-white">{new Date(selectedImage.date).toLocaleDateString()}</div>
                    </div>
                    {selectedImage.metadata.telescope && (
                      <div>
                        <span className="text-gray-400">Telescope:</span>
                        <div className="text-white">{selectedImage.metadata.telescope}</div>
                      </div>
                    )}
                    {selectedImage.metadata.instrument && (
                      <div>
                        <span className="text-gray-400">Instrument:</span>
                        <div className="text-white">{selectedImage.metadata.instrument}</div>
                      </div>
                    )}
                    {selectedImage.metadata.filters && (
                      <div>
                        <span className="text-gray-400">Filters:</span>
                        <div className="text-white">{selectedImage.metadata.filters}</div>
                      </div>
                    )}
                  </div>

                  {/* Attribution */}
                  <div className="border-t border-gray-600 pt-4">
                    <span className="text-gray-400 text-sm">Attribution:</span>
                    <div className="text-gray-300 text-sm mt-1">{selectedImage.attribution}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Image Sources & Attribution */}
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Image Sources & Attribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-blue-400 mb-2">NASA Science</h4>
                <p className="text-gray-300 mb-2">Official 3I/ATLAS multimedia from NASA&apos;s science portal</p>
                <a href="https://science.nasa.gov/solar-system/comets/3i-atlas/" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
                  science.nasa.gov
                </a>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-purple-400 mb-2">Hubble Space Telescope</h4>
                <p className="text-gray-300 mb-2">High-resolution optical observations</p>
                <a href="https://esahubble.org" className="text-purple-400 hover:text-purple-300 underline" target="_blank" rel="noopener noreferrer">
                  esahubble.org
                </a>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-red-400 mb-2">James Webb Space Telescope</h4>
                <p className="text-gray-300 mb-2">Infrared spectroscopy and composition analysis</p>
                <a href="https://webbtelescope.org" className="text-red-400 hover:text-red-300 underline" target="_blank" rel="noopener noreferrer">
                  webbtelescope.org
                </a>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-orange-400 mb-2">ATLAS Survey</h4>
                <p className="text-gray-300 mb-2">Discovery images and initial detection</p>
                <a href="https://fallingstar.com/" className="text-orange-400 hover:text-orange-300 underline" target="_blank" rel="noopener noreferrer">
                  ATLAS Project
                </a>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-pink-400 mb-2">SPHEREx Mission</h4>
                <p className="text-gray-300 mb-2">Near-infrared spectroscopy observations</p>
                <a href="https://www.jpl.nasa.gov/missions/spherex" className="text-pink-400 hover:text-pink-300 underline" target="_blank" rel="noopener noreferrer">
                  jpl.nasa.gov/spherex
                </a>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-cyan-400 mb-2">NASA Eyes</h4>
                <p className="text-gray-300 mb-2">Solar system trajectory visualizations</p>
                <a href="https://eyes.nasa.gov/" className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer">
                  eyes.nasa.gov
                </a>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-green-400 mb-2">Virtual Telescope Project</h4>
                <p className="text-gray-300 mb-2">Ground-based observations by Dr. Gianluca Masi</p>
                <a href="https://www.virtualtelescope.eu" className="text-green-400 hover:text-green-300 underline" target="_blank" rel="noopener noreferrer">
                  virtualtelescope.eu
                </a>
              </div>
            </div>
          </div>

          {/* Data Sources & Attribution */}
          <DataSourcesSection />
        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}