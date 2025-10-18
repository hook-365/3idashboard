'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import ExtensionSafeWrapper from '@/components/ExtensionSafeWrapper';
import PageNavigation from '@/components/common/PageNavigation';
import AppHeader from '@/components/common/AppHeader';
import DataAttribution from '@/components/common/DataAttribution';
import ScrollHashUpdater from '@/components/common/ScrollHashUpdater';

interface GalleryImage {
  id: string;
  title: string;
  description: string;
  date: string;
  source: 'NASA' | 'ESA/Hubble' | 'JWST' | 'Virtual Telescope' | 'Community' | 'NOIRLab/Gemini' | 'ESO';
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
      case 'NASA': return 'text-[var(--color-chart-primary)] bg-[var(--color-chart-primary)]/20';
      case 'ESA/Hubble': return 'text-[var(--color-chart-quaternary)] bg-[var(--color-chart-quaternary)]/20';
      case 'ESA/ExoMars': return 'text-purple-400 bg-purple-400/20';
      case 'JWST': return 'text-[var(--color-chart-tertiary)] bg-[var(--color-chart-tertiary)]/20';
      case 'NOIRLab/Gemini': return 'text-[var(--color-chart-senary)] bg-[var(--color-chart-senary)]/20';
      case 'ESO': return 'text-[var(--color-chart-quinary)] bg-[var(--color-chart-quinary)]/20';
      case 'Virtual Telescope': return 'text-[var(--color-status-success)] bg-[var(--color-status-success)]/20';
      case 'Research': return 'text-orange-400 bg-orange-400/20';
      case 'Community': return 'text-[var(--color-status-warning)] bg-[var(--color-status-warning)]/20';
      default: return 'text-[var(--color-text-tertiary)] bg-[var(--color-bg-primary)]/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-6">📸</div>
          <div className="text-2xl font-semibold mb-2">Loading Photo Gallery</div>
          <div className="text-[var(--color-text-tertiary)]">Fetching 3I/ATLAS images from multiple sources...</div>
          <div className="mt-4">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-[var(--color-chart-primary)] rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        {/* Automatic hash navigation */}
        <ScrollHashUpdater />

        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--color-chart-primary)] via-[var(--color-chart-secondary)] to-[var(--color-chart-tertiary)] bg-clip-text text-transparent mb-3">
              Photo Gallery
            </h1>
            <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto">
              Professional and amateur images of 3I/ATLAS from telescopes worldwide. Hubble, JWST, and ground-based observations.
            </p>
          </div>

          {/* Filters and Controls */}
          <section id="gallery-filters" className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8 border border-[var(--color-border-primary)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Filter by Source</label>
                    <select
                      value={filterSource}
                      onChange={(e) => setFilterSource(e.target.value)}
                      className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-lg px-3 py-2 text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-chart-primary)]"
                    >
                      <option value="all">All Sources</option>
                      <option value="NASA">NASA</option>
                      <option value="ESA/Hubble">ESA/Hubble</option>
                      <option value="ESA/ExoMars">ESA/ExoMars</option>
                      <option value="JWST">James Webb Space Telescope</option>
                      <option value="NOIRLab/Gemini">NOIRLab/Gemini Observatory</option>
                      <option value="ESO">European Southern Observatory</option>
                      <option value="Virtual Telescope">Virtual Telescope Project</option>
                      <option value="Research">Research Publications (ArXiv)</option>
                      <option value="Community">Community</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sort by</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'source' | 'title')}
                      className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-lg px-3 py-2 text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-chart-primary)]"
                    >
                      <option value="date">Date (Newest First)</option>
                      <option value="source">Source</option>
                      <option value="title">Title</option>
                    </select>
                  </div>
                </div>
                <div className="text-[var(--color-text-secondary)] text-sm">
                  Showing {filteredAndSortedImages.length} of {images.length} images
                </div>
              </div>
            </div>
          </section>

          {/* Image Grid */}
          {filteredAndSortedImages.length > 0 ? (
            <section id="image-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
              {filteredAndSortedImages.map((image) => (
                <div
                  key={image.id}
                  className="bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden border border-[var(--color-border-primary)] hover:border-[var(--color-chart-primary)] hover:transform hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
                  onClick={() => openLightbox(image)}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={image.thumbnailUrl}
                      alt={image.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 20vw"
                      unoptimized
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSourceColor(image.source)} shadow-lg`}>
                        {image.source}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-2 line-clamp-2 min-h-[3rem]">{image.title}</h3>
                    <p className="text-[var(--color-text-tertiary)] text-sm mb-2 line-clamp-3">{image.description}</p>
                    <div className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                      <span>📅</span>
                      {new Date(image.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <section id="image-grid" className="bg-[var(--color-bg-secondary)] rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">🔭</div>
              <h3 className="text-2xl font-semibold text-[var(--color-text-secondary)] mb-4">
                {filterSource === 'all' ? 'No Images Available Yet' : `No ${filterSource} Images Found`}
              </h3>
              <div className="max-w-2xl mx-auto space-y-3 text-[var(--color-text-secondary)]">
                {filterSource === 'all' ? (
                  <>
                    <p>
                      No images are currently available. This may be due to a temporary loading issue.
                    </p>
                    <p className="text-sm text-[var(--color-text-tertiary)]">
                      The gallery displays official 3I/ATLAS observations from the ATLAS Survey and Hubble Space Telescope.
                      Please refresh the page or check back shortly.
                    </p>
                    <div className="pt-4 flex gap-4 justify-center">
                      <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-chart-primary)] hover:bg-[var(--color-chart-primary)]/80 text-[var(--color-text-primary)] rounded-lg transition-colors"
                      >
                        <span>Refresh Gallery</span>
                      </button>
                      <a
                        href="https://science.nasa.gov/solar-system/comets/3i-atlas/comet-3i-atlas-multimedia/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg transition-colors"
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
                      className="mt-4 px-6 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg transition-colors"
                    >
                      View All Sources
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Lightbox Modal */}
          {selectedImage && (
            <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={closeLightbox}>
              <div className="max-w-6xl max-h-full bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <button
                    onClick={closeLightbox}
                    className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-[var(--color-text-primary)] rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75 transition-all"
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
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{selectedImage.title}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSourceColor(selectedImage.source)}`}>
                      {selectedImage.source}
                    </span>
                  </div>
                  <p className="text-[var(--color-text-secondary)] mb-4">{selectedImage.description}</p>

                  {/* Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-[var(--color-text-tertiary)]">Date:</span>
                      <div className="text-[var(--color-text-primary)]">{new Date(selectedImage.date).toLocaleDateString()}</div>
                    </div>
                    {selectedImage.metadata.telescope && (
                      <div>
                        <span className="text-[var(--color-text-tertiary)]">Telescope:</span>
                        <div className="text-[var(--color-text-primary)]">{selectedImage.metadata.telescope}</div>
                      </div>
                    )}
                    {selectedImage.metadata.instrument && (
                      <div>
                        <span className="text-[var(--color-text-tertiary)]">Instrument:</span>
                        <div className="text-[var(--color-text-primary)]">{selectedImage.metadata.instrument}</div>
                      </div>
                    )}
                    {selectedImage.metadata.filters && (
                      <div>
                        <span className="text-[var(--color-text-tertiary)]">Filters:</span>
                        <div className="text-[var(--color-text-primary)]">{selectedImage.metadata.filters}</div>
                      </div>
                    )}
                  </div>

                  {/* Attribution */}
                  <div className="border-t border-[var(--color-border-secondary)] pt-4">
                    <span className="text-[var(--color-text-tertiary)] text-sm">Attribution:</span>
                    <div className="text-[var(--color-text-secondary)] text-sm mt-1">{selectedImage.attribution}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Data Attribution Footer */}
        <DataAttribution full={true} />
      </div>
    </ExtensionSafeWrapper>
  );
}