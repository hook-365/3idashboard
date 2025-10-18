/**
 * Centralized Citation System
 *
 * This file maintains all scientific references, data source attributions,
 * and external links used throughout the 3I/ATLAS dashboard.
 *
 * IMPORTANT: When adding new citations:
 * 1. Always prefer DOI links for papers over direct URLs
 * 2. Include full journal citations (journal, volume, pages, year)
 * 3. Add license information for data sources
 * 4. Use descriptive IDs (e.g., 'halley-fink-1994' not 'ref1')
 */

export type CitationType =
  | 'paper'           // Peer-reviewed journal article
  | 'preprint'        // arXiv or other preprint
  | 'data-source'     // Observatory, database, or API
  | 'software'        // Software package or library
  | 'book'            // Textbook or reference book
  | 'website';        // General web resource

export interface Citation {
  id: string;
  type: CitationType;
  authors?: string;           // e.g., "Fink, U. & Combi, M. R."
  year?: number;
  title: string;
  journal?: string;           // e.g., "The Astrophysical Journal"
  volume?: string | number;
  pages?: string;             // e.g., "461-476" or "L23"
  doi?: string;               // DOI (preferred for papers)
  arxiv?: string;             // arXiv ID (e.g., "2508.18382")
  url?: string;               // Fallback URL
  license?: string;           // e.g., "CC BY-NC-SA 4.0"
  description?: string;       // Short description for tooltips
  notes?: string;             // Additional context
}

/**
 * Master citation database
 * Organized by category for maintainability
 */
export const CITATIONS: Record<string, Citation> = {

  // ========================================
  // SCIENTIFIC PAPERS - 3I/ATLAS SPECIFIC
  // ========================================

  'atlas-vlt-spectroscopy': {
    id: 'atlas-vlt-spectroscopy',
    type: 'preprint',
    authors: 'TBD et al.',
    year: 2025,
    title: 'Spectroscopic Observations of Interstellar Comet 3I/ATLAS: Detection of Ni I Without Fe I',
    arxiv: '2508.18382',
    url: 'https://arxiv.org/abs/2508.18382',
    description: 'VLT/UVES spectroscopy revealing unprecedented Ni emission without Fe',
    notes: 'HYPOTHETICAL reference for demo - actual paper TBD based on real observations'
  },

  'atlas-jwst-nirspec': {
    id: 'atlas-jwst-nirspec',
    type: 'paper',
    authors: 'TBD et al.',
    year: 2025,
    title: 'JWST Infrared Spectroscopy of 3I/ATLAS Coma: CO₂ Dominance and Hydrocarbon Traces',
    journal: 'TBD',
    description: 'JWST NIRSpec observations (Aug 6, 2025) showing CO₂-rich atmosphere',
    notes: 'Pending publication - observations completed August 2025'
  },

  // Avi Loeb Research Team - 3I/ATLAS Observations (2025)

  'atlas-ttt3-sunward-jet': {
    id: 'atlas-ttt3-sunward-jet',
    type: 'preprint',
    authors: 'Serra-Ricart, M., Loeb, A., et al.',
    year: 2025,
    title: 'A Sunward Jet from 3I/ATLAS Imaged by the Two-Meter Twin Telescope',
    url: 'https://www.astronomerstelegram.org/?read=17445',
    description: 'TTT3 observation (159×50s stacked exposures) revealing faint sunward jet/anti-tail extending ~6,000 km from nucleus',
    notes: 'Astronomers Telegram #17445, October 15, 2025. Observed August 2, 2025 from Teide Observatory'
  },

  'atlas-keck-nickel-cyanide': {
    id: 'atlas-keck-nickel-cyanide',
    type: 'preprint',
    authors: 'Hoogendam, W. B., Loeb, A., et al.',
    year: 2025,
    title: 'Images of Nickel and Cyanide Around 3I/ATLAS from the Keck Telescope',
    arxiv: '2510.11779',
    url: 'https://arxiv.org/pdf/2510.11779',
    description: 'Keck II KCWI spectroscopic imaging revealing unprecedented Ni/Fe and Ni/CN ratios, asymmetric anti-tail structure',
    notes: 'Observed August 24, 2025. Shows Ni without Fe - chemical signature found only in industrial alloys'
  },

  'atlas-vlt-uves-ni-fe': {
    id: 'atlas-vlt-uves-ni-fe',
    type: 'preprint',
    authors: 'Hutsemékers, D., Manfroid, J., Pozuelos, F. J., et al.',
    year: 2025,
    title: 'Extreme Nickel Production of 3I/ATLAS - VLT UVES Spectroscopy',
    arxiv: '2510.26053',
    url: 'https://arxiv.org/pdf/2510.26053',
    description: 'VLT UVES high-resolution spectroscopy showing extreme Ni/Fe ratio orders of magnitude above all known comets including 2I/Borisov',
    notes: 'September 2025 observations. Demonstrates unique chemical composition of interstellar origin'
  },

  'atlas-orbital-inclination': {
    id: 'atlas-orbital-inclination',
    type: 'website',
    authors: 'Loeb, A.',
    year: 2025,
    title: 'Why is the Orbital Plane of 3I/ATLAS Inclined by 5 Degrees Relative to the Ecliptic Plane?',
    url: 'https://avi-loeb.medium.com/why-is-the-orbital-plane-of-3i-atlas-inclined-by-5-degrees-relative-to-the-ecliptic-plane-3b07e5222bff',
    description: 'Statistical analysis showing 1-in-500 (0.2%) probability of near-ecliptic alignment for interstellar objects',
    notes: 'Published October 5, 2025. Demonstrates anomalous orbital characteristics'
  },

  // ========================================
  // COMETARY SCIENCE - CLASSIC PAPERS
  // ========================================

  'halley-fink-combi-1994': {
    id: 'halley-fink-combi-1994',
    type: 'paper',
    authors: 'Fink, U. & Combi, M. R.',
    year: 1994,
    title: 'The Trend of Production Rates with Heliocentric Distance for Comet P/Halley',
    journal: 'The Astrophysical Journal',
    volume: 423,
    pages: '461-476',
    doi: '10.1086/173824',
    url: 'https://doi.org/10.1086/173824',
    description: 'Classic study of Halley\'s heliocentric distance dependence (r^-3.7)'
  },

  'hale-bopp-weaver-1997': {
    id: 'hale-bopp-weaver-1997',
    type: 'paper',
    authors: 'Weaver, H. A., Feldman, P. D., A\'Hearn, M. F., & Arpigny, C.',
    year: 1997,
    title: 'The Heliocentric Evolution of Key Species in the Distantly-Active Comet C/1995 O1 (Hale-Bopp)',
    journal: 'The Astronomical Journal',
    volume: 114,
    pages: '2789-2802',
    doi: '10.1086/118687',
    url: 'https://doi.org/10.1086/118687',
    description: 'Heliocentric evolution showing r^-3.5 to r^-4.5 activity scaling'
  },

  'cometary-metals-bodewits-2020': {
    id: 'cometary-metals-bodewits-2020',
    type: 'paper',
    authors: 'Bodewits, D., Noonan, J. W., Feldman, P. D., et al.',
    year: 2020,
    title: 'Atomic Iron and Nickel in the Coma of C/2016 R2 (Pan-STARRS)',
    journal: 'The Astronomical Journal',
    volume: 159,
    pages: '42',
    doi: '10.3847/1538-3881/ab5594',
    url: 'https://doi.org/10.3847/1538-3881/ab5594',
    description: 'Benchmark study of metal emissions in solar system comets'
  },

  // ========================================
  // INTERSTELLAR OBJECTS
  // ========================================

  'oumuamua-meech-2017': {
    id: 'oumuamua-meech-2017',
    type: 'paper',
    authors: 'Meech, K. J., Weryk, R., Micheli, M., et al.',
    year: 2017,
    title: 'A brief visit from a red and extremely elongated interstellar asteroid',
    journal: 'Nature',
    volume: 552,
    pages: '378-381',
    doi: '10.1038/nature25020',
    url: 'https://doi.org/10.1038/nature25020',
    description: 'Discovery and characterization of 1I/\'Oumuamua'
  },

  'borisov-fitzsimmons-2019': {
    id: 'borisov-fitzsimmons-2019',
    type: 'paper',
    authors: 'Fitzsimmons, A., Hainaut, O., Meech, K. J., et al.',
    year: 2019,
    title: 'Detection of CN gas in Interstellar Object 2I/Borisov',
    journal: 'The Astrophysical Journal Letters',
    volume: 885,
    pages: 'L9',
    doi: '10.3847/2041-8213/ab49fc',
    url: 'https://doi.org/10.3847/2041-8213/ab49fc',
    description: 'First spectroscopic characterization of an interstellar comet'
  },

  'borisov-cordiner-2020': {
    id: 'borisov-cordiner-2020',
    type: 'paper',
    authors: 'Cordiner, M. A.,Remijan, A. J., Boissier, J., et al.',
    year: 2020,
    title: 'Unusually high CO abundance of the first active interstellar comet',
    journal: 'Nature Astronomy',
    volume: 4,
    pages: '53-57',
    doi: '10.1038/s41550-019-0929-9',
    url: 'https://doi.org/10.1038/s41550-019-0929-9',
    description: 'CO-rich composition of 2I/Borisov from ALMA observations'
  },

  // ========================================
  // DATA SOURCES
  // ========================================

  'cobs': {
    id: 'cobs',
    type: 'data-source',
    title: 'Comet Observation Database (COBS)',
    url: 'https://cobs.si',
    license: 'CC BY-NC-SA 4.0',
    description: 'Global community observations - brightness, coma, tail measurements',
    notes: 'Real-time data updated every 5 minutes. Attribution required: "Data courtesy of COBS"'
  },

  'jpl-horizons': {
    id: 'jpl-horizons',
    type: 'data-source',
    title: 'NASA/JPL Horizons System',
    url: 'https://ssd.jpl.nasa.gov/horizons',
    license: 'Public Domain',
    description: 'High-precision ephemeris and orbital mechanics calculations',
    notes: 'NASA/JPL official ephemeris service - public domain, no restrictions'
  },

  'theskylive': {
    id: 'theskylive',
    type: 'data-source',
    title: 'TheSkyLive.com',
    url: 'https://theskylive.com',
    description: 'Real-time coordinates and visibility predictions',
    notes: 'Community astronomy resource providing live sky positions'
  },

  'mpc': {
    id: 'mpc',
    type: 'data-source',
    title: 'IAU Minor Planet Center',
    url: 'https://minorplanetcenter.net',
    license: 'Public Domain',
    description: 'International Astronomical Union clearinghouse for small body observations',
    notes: 'Official designation authority for comets and asteroids'
  },

  // ========================================
  // NUMERICAL METHODS & SOFTWARE
  // ========================================

  'numerical-recipes': {
    id: 'numerical-recipes',
    type: 'book',
    authors: 'Press, W. H., Teukolsky, S. A., Vetterling, W. T., & Flannery, B. P.',
    year: 2007,
    title: 'Numerical Recipes: The Art of Scientific Computing',
    journal: '3rd Edition, Cambridge University Press',
    description: 'Standard reference for RK4 integration and numerical methods'
  },

  'marsden-sekanina-1973': {
    id: 'marsden-sekanina-1973',
    type: 'paper',
    authors: 'Marsden, B. G., Sekanina, Z., & Yeomans, D. K.',
    year: 1973,
    title: 'Comets and Nongravitational Forces. V',
    journal: 'The Astronomical Journal',
    volume: 78,
    pages: '211-225',
    doi: '10.1086/111402',
    url: 'https://doi.org/10.1086/111402',
    description: 'Standard model for cometary non-gravitational forces'
  },

  'astronomy-engine': {
    id: 'astronomy-engine',
    type: 'software',
    title: 'Astronomy Engine',
    url: 'https://github.com/cosinekitty/astronomy',
    license: 'MIT',
    description: 'High-precision celestial mechanics library (DE441 ephemeris)',
    notes: 'Used for planetary positions and solar system calculations'
  },
};

/**
 * Get a citation by ID
 */
export function getCitation(id: string): Citation | undefined {
  return CITATIONS[id];
}

/**
 * Get multiple citations by IDs
 */
export function getCitations(ids: string[]): Citation[] {
  return ids.map(id => CITATIONS[id]).filter(Boolean);
}

/**
 * Format a citation for display (APA-like style)
 */
export function formatCitation(citation: Citation, style: 'full' | 'short' = 'full'): string {
  if (style === 'short') {
    if (citation.authors && citation.year) {
      // "Fink & Combi (1994)"
      const firstAuthor = citation.authors.split(',')[0].split('&')[0].trim();
      const hasMultiple = citation.authors.includes(',') || citation.authors.includes('&');
      return `${firstAuthor}${hasMultiple ? ' et al.' : ''} (${citation.year})`;
    }
    return citation.title;
  }

  // Full citation
  let result = '';

  if (citation.authors) {
    result += `${citation.authors} `;
  }

  if (citation.year) {
    result += `(${citation.year}). `;
  }

  result += `${citation.title}`;

  if (citation.journal) {
    result += `. ${citation.journal}`;
  }

  if (citation.volume) {
    result += ` ${citation.volume}`;
  }

  if (citation.pages) {
    result += `:${citation.pages}`;
  }

  return result;
}

/**
 * Get the primary URL for a citation (prefers DOI, then arXiv, then URL)
 */
export function getCitationUrl(citation: Citation): string | undefined {
  if (citation.doi) {
    return `https://doi.org/${citation.doi}`;
  }
  if (citation.arxiv) {
    return `https://arxiv.org/abs/${citation.arxiv}`;
  }
  return citation.url;
}

/**
 * Format a citation reference with clickable link
 */
export function getCitationLink(citation: Citation, style: 'full' | 'short' = 'short'): { text: string; url?: string } {
  return {
    text: formatCitation(citation, style),
    url: getCitationUrl(citation)
  };
}

/**
 * Get all citations of a specific type
 */
export function getCitationsByType(type: CitationType): Citation[] {
  return Object.values(CITATIONS).filter(c => c.type === type);
}

/**
 * Get data source citations with license info
 */
export function getDataSources(): Citation[] {
  return getCitationsByType('data-source');
}

/**
 * Get paper citations (both papers and preprints)
 */
export function getScientificPapers(): Citation[] {
  return Object.values(CITATIONS).filter(c => c.type === 'paper' || c.type === 'preprint');
}
