import { NextResponse } from 'next/server';

interface NASAImageItem {
  data: Array<{
    title: string;
    description: string;
    date_created: string;
    nasa_id: string;
    media_type: string;
    keywords?: string[];
    photographer?: string;
    center?: string;
  }>;
  links?: Array<{
    href: string;
    rel: string;
    render?: string;
  }>;
}

interface NASASearchResponse {
  collection: {
    items: NASAImageItem[];
    metadata: {
      total_hits: number;
    };
  };
}

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

/**
 * Official 3I/ATLAS images from NASA Science
 * Source: https://science.nasa.gov/solar-system/comets/3i-atlas/comet-3i-atlas-multimedia/
 */
const official3IAtlasImages: GalleryImage[] = [
  {
    id: 'atlas-discovery-static',
    title: '3I/ATLAS Discovery Image - ATLAS Survey Telescope',
    description: 'First image shows the observation of comet 3I/ATLAS when it was discovered on July 1, 2025. This historic image captured the third confirmed interstellar object visiting our solar system.',
    date: '2025-07-01T00:00:00Z',
    source: 'NASA',
    imageUrl: 'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar-system/comets/images/Comet3I-ATLAS.jpg',
    thumbnailUrl: 'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar-system/comets/images/Comet3I-ATLAS.jpg',
    attribution: 'NASA/ATLAS Survey',
    metadata: {
      telescope: 'ATLAS Survey Telescope',
      instrument: 'CCD Camera',
      filters: 'Optical'
    }
  },
  {
    id: 'atlas-discovery-animation',
    title: '3I/ATLAS Discovery Animation - ATLAS Survey',
    description: 'Animation shows observations of comet 3I/ATLAS when it was discovered by the ATLAS survey on July 1, 2025. Multiple frames reveal the comet\'s motion against the background stars.',
    date: '2025-07-01T00:00:00Z',
    source: 'NASA',
    imageUrl: 'https://assets.science.nasa.gov/content/dam/science/psd/solar-system/comets/multimedia/Comet%203I-ATLAS.gif',
    thumbnailUrl: 'https://assets.science.nasa.gov/content/dam/science/psd/solar-system/comets/multimedia/Comet%203I-ATLAS.gif',
    attribution: 'NASA/ATLAS Survey',
    metadata: {
      telescope: 'ATLAS Survey Telescope',
      instrument: 'CCD Camera',
      filters: 'Optical'
    }
  },
  {
    id: 'hubble-3i-atlas-july',
    title: '3I/ATLAS - Hubble Space Telescope Observation',
    description: 'Hubble Space Telescope captured this detailed image of comet 3I/ATLAS on July 21, 2025, when the comet was 277 million miles from Earth. The image reveals the comet\'s developing coma and tail structure as it approaches the inner solar system.',
    date: '2025-07-21T00:00:00Z',
    source: 'ESA/Hubble',
    imageUrl: 'https://assets.science.nasa.gov/dynamicimage/assets/science/missions/hubble/releases/2025/08/STScI-01K1X6XDR76ZD4FYJ9VTWN1ERB.tif',
    thumbnailUrl: 'https://assets.science.nasa.gov/dynamicimage/assets/science/missions/hubble/releases/2025/08/STScI-01K1X6XDR76ZD4FYJ9VTWN1ERB.tif',
    attribution: 'NASA/ESA/STScI',
    metadata: {
      telescope: 'Hubble Space Telescope',
      instrument: 'Wide Field Camera 3',
      filters: 'Optical/UV',
      resolution: 'High resolution'
    }
  },
  {
    id: 'jwst-3i-atlas-nirspec',
    title: '3I/ATLAS - James Webb Space Telescope Infrared Observation',
    description: 'NASA\'s James Webb Space Telescope observed interstellar comet 3I/ATLAS on August 6, 2025 using its Near-Infrared Spectrograph instrument. This infrared observation reveals the comet\'s composition and thermal characteristics as it becomes more active approaching perihelion.',
    date: '2025-08-06T00:00:00Z',
    source: 'JWST',
    imageUrl: 'https://assets.science.nasa.gov/dynamicimage/assets/science/missions/webb/science/Webb%20Image%201_IFU%20IR.jpg',
    thumbnailUrl: 'https://assets.science.nasa.gov/dynamicimage/assets/science/missions/webb/science/Webb%20Image%201_IFU%20IR.jpg',
    attribution: 'NASA/James Webb Space Telescope',
    metadata: {
      telescope: 'James Webb Space Telescope',
      instrument: 'Near-Infrared Spectrograph (NIRSpec)',
      filters: 'Infrared',
      resolution: '1367x1408 pixels'
    }
  },
  {
    id: 'spherex-3i-atlas-animation',
    title: '3I/ATLAS - SPHEREx Animation',
    description: 'NASA\'s SPHEREx mission observed interstellar comet 3I/ATLAS from August 7 to August 15, 2025. This animation shows the comet\'s activity and motion during this observation period as it continues toward perihelion.',
    date: '2025-08-15T00:00:00Z',
    source: 'NASA',
    imageUrl: 'https://assets.science.nasa.gov/content/dam/science/missions/spherex/SPHEREx%20Image%201.gif',
    thumbnailUrl: 'https://assets.science.nasa.gov/content/dam/science/missions/spherex/SPHEREx%20Image%201.gif',
    attribution: 'NASA/SPHEREx',
    metadata: {
      telescope: 'SPHEREx Space Telescope',
      instrument: 'Spectrophotometer',
      filters: 'Near-Infrared',
      exposureTime: 'Aug 7-15, 2025'
    }
  },
  {
    id: 'spherex-3i-atlas-co2',
    title: '3I/ATLAS - SPHEREx CO2 Detection',
    description: 'NASA\'s SPHEREx observed interstellar comet 3I/ATLAS from August 7 to August 15, 2025. This image shows spectroscopic detection revealing the comet\'s chemical composition including carbon dioxide signatures.',
    date: '2025-08-15T00:00:00Z',
    source: 'NASA',
    imageUrl: 'https://assets.science.nasa.gov/dynamicimage/assets/science/missions/spherex/SPHEREx%20Image%202%20CO2.png',
    thumbnailUrl: 'https://assets.science.nasa.gov/dynamicimage/assets/science/missions/spherex/SPHEREx%20Image%202%20CO2.png',
    attribution: 'NASA/SPHEREx',
    metadata: {
      telescope: 'SPHEREx Space Telescope',
      instrument: 'Spectrophotometer',
      filters: 'Near-Infrared Spectroscopy',
      exposureTime: 'Aug 7-15, 2025'
    }
  },
  {
    id: 'trajectory-animation',
    title: '3I/ATLAS Trajectory Animation',
    description: 'Animation by NASA Eyes on the Solar System showing comet 3I/ATLAS moving through the solar system. This visualization illustrates the comet\'s hyperbolic interstellar trajectory as it passes through our planetary system.',
    date: '2025-07-01T00:00:00Z',
    source: 'NASA',
    imageUrl: 'https://assets.science.nasa.gov/content/dam/science/psd/solar-system/comets/images/3I-ATLAS%20in%20NASA%20Eyes-demo.gif',
    thumbnailUrl: 'https://assets.science.nasa.gov/content/dam/science/psd/solar-system/comets/images/3I-ATLAS%20in%20NASA%20Eyes-demo.gif',
    attribution: 'NASA/JPL-Caltech/NASA Eyes',
    metadata: {
      instrument: 'NASA Eyes on the Solar System',
      filters: 'Visualization'
    }
  },
  {
    id: 'trajectory-diagram',
    title: '3I/ATLAS Trajectory Diagram',
    description: 'This diagram shows the trajectory of interstellar comet 3I/ATLAS as it passes through the solar system. The visualization illustrates the comet\'s path relative to the Sun and planets, highlighting its hyperbolic orbit indicating interstellar origin.',
    date: '2025-07-01T00:00:00Z',
    source: 'NASA',
    imageUrl: 'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/planetary-defense/3I_interstellar%20comet%20orbit_NEW.png',
    thumbnailUrl: 'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/planetary-defense/3I_interstellar%20comet%20orbit_NEW.png',
    attribution: 'NASA/Planetary Defense Coordination Office',
    metadata: {
      instrument: 'Orbital Visualization',
      filters: 'Diagram'
    }
  },
  {
    id: 'vtp-first-observation',
    title: '3I/ATLAS - Virtual Telescope Project First Observation',
    description: 'Virtual Telescope Project captured this image of interstellar object 3I/ATLAS on July 2, 2025, using a 360mm telescope in Manciano, Italy. At the time, the comet was 520 million km from Earth and 670 million km from the Sun, showing early signs of cometary activity at magnitude ~18.5.',
    date: '2025-07-02T00:00:00Z',
    source: 'Virtual Telescope',
    imageUrl: 'https://www.virtualtelescope.eu/wordpress/wp-content/uploads/2025/07/3I_Atlas_C2025N1_2july2025_masi.jpg',
    thumbnailUrl: 'https://www.virtualtelescope.eu/wordpress/wp-content/uploads/2025/07/3I_Atlas_C2025N1_2july2025_masi.jpg',
    attribution: 'Virtual Telescope Project/Dr. Gianluca Masi',
    metadata: {
      telescope: '360mm telescope',
      instrument: 'CCD Camera',
      filters: 'Optical',
      exposureTime: 'Multiple exposures'
    }
  },
  {
    id: 'vtp-coma-detection',
    title: '3I/ATLAS - Virtual Telescope Coma Detection',
    description: 'Virtual Telescope Project observation from July 31, 2025, clearly showing the developing coma of 3I/ATLAS. This image was created by combining 13 exposures of 120 seconds each using the Celestron C14 robotic telescope in Manciano, Italy. The inverted image highlights the faint coma structure.',
    date: '2025-07-31T00:00:00Z',
    source: 'Virtual Telescope',
    imageUrl: 'https://www.virtualtelescope.eu/wordpress/wp-content/uploads/2025/08/3I_Atlas_C2025N1_31july2025_masi.jpg',
    thumbnailUrl: 'https://www.virtualtelescope.eu/wordpress/wp-content/uploads/2025/08/3I_Atlas_C2025N1_31july2025_masi.jpg',
    attribution: 'Virtual Telescope Project/Dr. Gianluca Masi',
    metadata: {
      telescope: 'Celestron C14',
      instrument: 'SBIG ST10-XME',
      filters: 'Optical',
      exposureTime: '13 x 120s'
    }
  }
];

/**
 * Fetch images from NASA Images API
 * Searches for 3I/ATLAS only - no fallbacks
 */
async function fetchNASAImages(): Promise<GalleryImage[]> {
  const images: GalleryImage[] = [];

  // Search terms - 3I/ATLAS only
  const searchTerms = [
    '3I/ATLAS comet',
    'ATLAS comet interstellar',
    'C/2025 N1'
  ];

  try {
    for (const searchTerm of searchTerms) {
      try {
        const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(searchTerm)}&media_type=image&page_size=10`;
        console.log(`Searching NASA API for: ${searchTerm}`);

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn(`NASA API returned ${response.status} for "${searchTerm}"`);
          continue;
        }

        const data: NASASearchResponse = await response.json();

        if (data.collection?.items && data.collection.items.length > 0) {
          console.log(`Found ${data.collection.items.length} images for "${searchTerm}"`);

          for (const item of data.collection.items) {
            if (!item.data?.[0] || !item.links?.[0]) continue;

            const itemData = item.data[0];
            const imageLink = item.links[0].href;

            // Skip videos or invalid media
            if (itemData.media_type !== 'image' || !imageLink) continue;

            // Determine source based on keywords
            let source: GalleryImage['source'] = 'NASA';
            if (itemData.keywords) {
              const keywords = itemData.keywords.map(k => k.toLowerCase());
              if (keywords.some(k => k.includes('hubble'))) source = 'ESA/Hubble';
              else if (keywords.some(k => k.includes('webb') || k.includes('jwst'))) source = 'JWST';
            }

            images.push({
              id: itemData.nasa_id,
              title: itemData.title || 'Untitled',
              description: itemData.description || 'No description available',
              date: itemData.date_created,
              source,
              imageUrl: imageLink,
              thumbnailUrl: imageLink, // NASA provides thumbnails at same URL
              attribution: `NASA${itemData.center ? `/${itemData.center}` : ''}${itemData.photographer ? ` - ${itemData.photographer}` : ''}`,
              metadata: {
                telescope: itemData.keywords?.find(k => k.toLowerCase().includes('telescope')) || undefined,
              }
            });
          }

          // If we found images, stop searching
          if (images.length > 0) break;
        }
      } catch (searchError) {
        console.warn(`Error searching for "${searchTerm}":`, searchError);
        continue;
      }
    }

    console.log(`NASA API returned ${images.length} total images`);
    return images;

  } catch (error) {
    console.error('Error in fetchNASAImages:', error);
    return [];
  }
}

export async function GET() {
  try {
    console.log('Fetching gallery images...');

    // Fetch dynamically from NASA Images API
    const nasaImages = await fetchNASAImages();
    console.log(`Fetched ${nasaImages.length} images from NASA API`);

    // Combine official images with NASA API results
    const allImages = [...official3IAtlasImages];

    // Add NASA images that aren't already in our official list (deduplicate by ID)
    const existingIds = new Set(official3IAtlasImages.map(img => img.id));
    for (const nasaImg of nasaImages) {
      if (!existingIds.has(nasaImg.id)) {
        allImages.push(nasaImg);
      }
    }

    // Sort by date (newest first)
    const sortedImages = allImages.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    console.log(`Returning ${sortedImages.length} total gallery images (${official3IAtlasImages.length} official + ${sortedImages.length - official3IAtlasImages.length} from NASA API)`);

    return NextResponse.json({
      success: true,
      data: sortedImages,
      metadata: {
        totalImages: sortedImages.length,
        sources: {
          official_3i_atlas: official3IAtlasImages.length,
          nasa_api_additional: sortedImages.length - official3IAtlasImages.length,
          nasa_total: sortedImages.filter(img => img.source === 'NASA').length,
          hubble: sortedImages.filter(img => img.source === 'ESA/Hubble').length,
          jwst: sortedImages.filter(img => img.source === 'JWST').length,
          virtual_telescope: sortedImages.filter(img => img.source === 'Virtual Telescope').length
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in gallery API:', error);

    // Return official images even on error
    return NextResponse.json({
      success: true,
      data: official3IAtlasImages,
      metadata: {
        totalImages: official3IAtlasImages.length,
        sources: {
          official_3i_atlas: official3IAtlasImages.length,
          nasa_api_additional: 0,
          nasa_total: official3IAtlasImages.filter(img => img.source === 'NASA').length,
          hubble: official3IAtlasImages.filter(img => img.source === 'ESA/Hubble').length,
          jwst: official3IAtlasImages.filter(img => img.source === 'JWST').length,
          virtual_telescope: official3IAtlasImages.filter(img => img.source === 'Virtual Telescope').length
        },
        lastUpdated: new Date().toISOString(),
        error: 'Failed to fetch additional images from NASA API'
      }
    });
  }
}

// Add cache headers for better performance
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 minutes