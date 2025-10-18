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
  source: 'NASA' | 'ESA/Hubble' | 'ESA/ExoMars' | 'JWST' | 'Virtual Telescope' | 'Community' | 'NOIRLab/Gemini' | 'ESO';
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
    id: 'eso-vlt-sequence',
    title: 'Sequence of VLT Images of 3I/ATLAS',
    description: 'A sequence of images from ESO\'s Very Large Telescope showing interstellar comet 3I/ATLAS moving across the starry background. This multi-frame observation captures the comet\'s motion and demonstrates its hyperbolic orbit indicating origin outside our solar system.',
    date: '2025-07-08T00:00:00Z',
    source: 'ESO',
    imageUrl: 'https://cdn.eso.org/images/screen/potw2527b.jpg',
    thumbnailUrl: 'https://cdn.eso.org/images/screen/potw2527b.jpg',
    attribution: 'ESO/O. Hainaut',
    metadata: {
      telescope: 'Very Large Telescope (VLT)',
      instrument: 'FORS2',
      filters: 'Optical'
    }
  },
  {
    id: 'gemini-north-observation',
    title: 'Gemini North Observes Comet 3I/ATLAS',
    description: 'Gemini North telescope in Hawaiʻi captured this detailed observation of interstellar comet 3I/ATLAS on July 15, 2025. The International Gemini Observatory provided critical early characterization of this interstellar wanderer, revealing insights into objects from beyond our solar system.',
    date: '2025-07-15T00:00:00Z',
    source: 'NOIRLab/Gemini',
    imageUrl: 'https://storage.noirlab.edu/media/archives/images/newsfeature/noirlab2522a.jpg',
    thumbnailUrl: 'https://storage.noirlab.edu/media/archives/images/newsfeature/noirlab2522a.jpg',
    attribution: 'International Gemini Observatory/NOIRLab/NSF/AURA',
    metadata: {
      telescope: 'Gemini North',
      instrument: 'GMOS-N (Gemini Multi-Object Spectrograph)',
      filters: 'Optical'
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
  },
  {
    id: 'gemini-south-tail',
    title: 'Growing Tail of Interstellar Comet 3I/ATLAS',
    description: 'Comet 3I/ATLAS streaks across a dense star field in this stunning image captured by the Gemini Multi-Object Spectrograph (GMOS) on Gemini South telescope in Chile on September 4, 2025. The image clearly shows the comet\'s developing tail as it approaches perihelion.',
    date: '2025-09-04T00:00:00Z',
    source: 'NOIRLab/Gemini',
    imageUrl: 'https://storage.noirlab.edu/media/archives/images/screen/noirlab2525a.jpg',
    thumbnailUrl: 'https://storage.noirlab.edu/media/archives/images/screen/noirlab2525a.jpg',
    attribution: 'International Gemini Observatory/NOIRLab/NSF/AURA/Shadow the Scientist. Image Processing: J. Miller & M. Rodriguez (International Gemini Observatory/NSF NOIRLab), T.A. Rector (University of Alaska Anchorage/NSF NOIRLab), M. Zamani (NSF NOIRLab)',
    metadata: {
      telescope: 'Gemini South',
      instrument: 'GMOS (Gemini Multi-Object Spectrograph)',
      filters: 'Optical'
    }
  },
  {
    id: 'perseverance-mars-view',
    title: '3I/ATLAS from Mars (Annotated) - Perseverance Mastcam-Z | Sol 1643',
    description: 'On October 4th (Sol 1643), NASA\'s Perseverance raised her head up at the night sky to capture interstellar comet 3I/ATLAS during its close encounter with Mars. The interstellar visitor was just 0.2 AU or 30 million km distant from Mars, far closer than the comet got to Earth. The comet is visible as a faint smudge next to a field of stars as dim as magnitude 8 which have all been blurred by the exposure time of 30s. This image has been stacked from 20 individual exposures resulting in a total integration time of 10 minutes. The image was further denoised with Adobe Lightroom and annotated in Pixinsight.',
    date: '2025-10-04T06:26:44.922Z',
    source: 'Community',
    imageUrl: 'https://live.staticflickr.com/65535/54831807799_97ec572ba6_b.jpg',
    thumbnailUrl: 'https://live.staticflickr.com/65535/54831807799_97ec572ba6_m.jpg',
    attribution: 'NASA/JPL-Caltech/ASU/Simeon Schmauß',
    metadata: {
      telescope: 'Mars Perseverance Rover',
      instrument: 'Mastcam-Z',
      filters: 'Optical',
      exposureTime: '20 x 30s (10 min total)'
    }
  },
  {
    id: 'exomars-tgo-animation',
    title: 'ExoMars Trace Gas Orbiter Observes Comet 3I/ATLAS (Animation)',
    description: 'ESA\'s ExoMars Trace Gas Orbiter captured this animated sequence of interstellar comet 3I/ATLAS moving through the star field. The comet appears as a slightly fuzzy bright white dot moving downward through the frames, showcasing its motion relative to background stars.',
    date: '2025-10-07T00:00:00Z',
    source: 'ESA/ExoMars',
    imageUrl: 'https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2025/10/exomars_trace_gas_orbiter_observes_comet_3i_atlas_gif/26909471-1-eng-GB/ExoMars_Trace_Gas_Orbiter_observes_comet_3I_ATLAS_GIF_pillars.gif',
    thumbnailUrl: 'https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2025/10/exomars_trace_gas_orbiter_observes_comet_3i_atlas_gif/26909471-1-eng-GB/ExoMars_Trace_Gas_Orbiter_observes_comet_3I_ATLAS_GIF_pillars.gif',
    attribution: 'ESA/TGO/CaSSIS (CC BY-SA 3.0 IGO)',
    metadata: {
      telescope: 'ExoMars Trace Gas Orbiter',
      instrument: 'CaSSIS (Colour and Stereo Surface Imaging System)',
      filters: 'Optical'
    }
  },
  {
    id: 'exomars-tgo-static',
    title: 'ExoMars Trace Gas Orbiter Image of Comet 3I/ATLAS',
    description: 'ESA\'s ExoMars Trace Gas Orbiter captured this static observation of interstellar comet 3I/ATLAS. The image provides a clear view of the comet against the stellar background, demonstrating the spacecraft\'s imaging capabilities from Mars orbit.',
    date: '2025-10-07T00:00:00Z',
    source: 'ESA/ExoMars',
    imageUrl: 'https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2025/10/exomars_trace_gas_orbiter_observes_comet_3i_atlas_static/26909518-1-eng-GB/ExoMars_Trace_Gas_Orbiter_observes_comet_3I_ATLAS_static_article.png',
    thumbnailUrl: 'https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2025/10/exomars_trace_gas_orbiter_observes_comet_3i_atlas_static/26909518-1-eng-GB/ExoMars_Trace_Gas_Orbiter_observes_comet_3I_ATLAS_static_article.png',
    attribution: 'ESA/TGO/CaSSIS (CC BY-SA 3.0 IGO)',
    metadata: {
      telescope: 'ExoMars Trace Gas Orbiter',
      instrument: 'CaSSIS (Colour and Stereo Surface Imaging System)',
      filters: 'Optical'
    }
  },
  {
    id: 'esa-mars-jupiter-missions',
    title: 'ESA\'s Mars and Jupiter Missions Observe Comet 3I/ATLAS',
    description: 'This diagram illustrates how ESA\'s spacecraft at Mars (ExoMars Trace Gas Orbiter and Mars Express) and Jupiter (JUICE - Jupiter Icy Moons Explorer) were positioned to observe interstellar comet 3I/ATLAS during its passage through the solar system in October 2025.',
    date: '2025-10-07T00:00:00Z',
    source: 'ESA/ExoMars',
    imageUrl: 'https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2025/09/esa_s_mars_and_jupiter_missions_observe_comet_3i_atlas/26888185-1-eng-GB/ESA_s_Mars_and_Jupiter_missions_observe_comet_3I_ATLAS_article.png',
    thumbnailUrl: 'https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2025/09/esa_s_mars_and_jupiter_missions_observe_comet_3i_atlas/26888185-1-eng-GB/ESA_s_Mars_and_Jupiter_missions_observe_comet_3I_ATLAS_article.png',
    attribution: 'ESA (CC BY-SA 3.0 IGO)',
    metadata: {
      instrument: 'Mission Diagram',
      filters: 'Visualization'
    }
  },
  // Avi Loeb Research Images - ArXiv Papers
  // Paper 1: https://arxiv.org/abs/2510.11779 (Keck/KCWI Integral Field Spectroscopy)
  {
    id: 'keck-kcwi-whitelight-2510.11779',
    title: 'Keck/KCWI Whitelight Image of 3I/ATLAS',
    description: '3425 Å to 5500 Å whitelight image from KCWI integral field spectroscopy showing the comet\'s coma and sunward jet. The yellow arrow denotes direction to the Sun. Scale bar shows physical scale viewed from Earth.',
    date: '2025-10-15T00:00:00Z',
    source: 'Research',
    imageUrl: '/gallery/loeb-research/keck-kcwi-whitelight.png',
    thumbnailUrl: '/gallery/loeb-research/keck-kcwi-whitelight.png',
    attribution: 'Loeb et al. 2024, arXiv:2510.11779 - Keck Observatory',
    metadata: {
      telescope: 'Keck II',
      instrument: 'KCWI',
      filters: '3425-5500Å whitelight'
    }
  },
  {
    id: 'keck-kcwi-spectrum-2510.11779',
    title: 'Keck/KCWI Spectrum: Nickel and Cyanide Detection',
    description: 'Continuum-subtracted KCWI spectrum between 3425 Å and 4050 Å showing prominent nickel (Ni) and cyanide (CN) emission lines from 3I/ATLAS, extracted from 3 arcsec aperture.',
    date: '2025-10-15T00:00:00Z',
    source: 'Research',
    imageUrl: '/gallery/loeb-research/keck-kcwi-spectrum.png',
    thumbnailUrl: '/gallery/loeb-research/keck-kcwi-spectrum.png',
    attribution: 'Loeb et al. 2024, arXiv:2510.11779 - Keck Observatory',
    metadata: {
      telescope: 'Keck II',
      instrument: 'KCWI',
      filters: 'Spectroscopy 3425-4050Å'
    }
  },
  {
    id: 'keck-kcwi-cn-ni-comparison-2510.11779',
    title: 'Keck/KCWI CN vs Ni Narrow-band Comparison',
    description: 'Narrow-band images from KCWI data cube comparing CN emissions (3865-3885Å, left) and Ni emissions (3605-3625Å, right). Both shown on same color scale revealing spatial distribution differences.',
    date: '2025-10-15T00:00:00Z',
    source: 'Research',
    imageUrl: '/gallery/loeb-research/keck-kcwi-cn-ni-comparison.png',
    thumbnailUrl: '/gallery/loeb-research/keck-kcwi-cn-ni-comparison.png',
    attribution: 'Loeb et al. 2024, arXiv:2510.11779 - Keck Observatory',
    metadata: {
      telescope: 'Keck II',
      instrument: 'KCWI',
      filters: 'CN (3865-3885Å) & Ni (3605-3625Å)'
    }
  },
  {
    id: 'keck-kcwi-jets-radial-2510.11779',
    title: 'Keck/KCWI Jet Detection in Radial Profiles',
    description: 'Model-subtracted radial profiles revealing strong solar and anti-solar jets in whitelight, CN, and Ni emissions. Left panels show 2D spatial distributions, right panels show azimuthal flux variations.',
    date: '2025-10-15T00:00:00Z',
    source: 'Research',
    imageUrl: '/gallery/loeb-research/keck-kcwi-jets-radial.png',
    thumbnailUrl: '/gallery/loeb-research/keck-kcwi-jets-radial.png',
    attribution: 'Loeb et al. 2024, arXiv:2510.11779 - Keck Observatory',
    metadata: {
      telescope: 'Keck II',
      instrument: 'KCWI',
      filters: 'Multi-wavelength jet analysis'
    }
  },
  {
    id: 'keck-kcwi-cn-ni-radial-diff-2510.11779',
    title: 'Keck/KCWI CN vs Ni Radial Difference Analysis',
    description: 'Measured radial differences between CN and Ni emissions showing different spatial extents. Binned data (large points) fit with exponential functions revealing coma morphology differences.',
    date: '2025-10-15T00:00:00Z',
    source: 'Research',
    imageUrl: '/gallery/loeb-research/keck-kcwi-cn-ni-radial-diff.png',
    thumbnailUrl: '/gallery/loeb-research/keck-kcwi-cn-ni-radial-diff.png',
    attribution: 'Loeb et al. 2024, arXiv:2510.11779 - Keck Observatory',
    metadata: {
      telescope: 'Keck II',
      instrument: 'KCWI',
      filters: 'CN & Ni radial profile comparison'
    }
  },
  // Paper 2: https://arxiv.org/abs/2509.26053 (VLT/UVES Ni/Fe Ratio Analysis)
  {
    id: 'vlt-uves-ni-spatial-2509.26053',
    title: 'VLT/UVES Nickel Spatial Profile',
    description: 'Spatial profile of brightest NiI emission line (λ3458Å) observed with VLT UVES on September 4, showing extended nickel distribution in the coma.',
    date: '2025-09-04T00:00:00Z',
    source: 'Research',
    imageUrl: '/gallery/loeb-research/vlt-uves-ni-spatial.png',
    thumbnailUrl: '/gallery/loeb-research/vlt-uves-ni-spatial.png',
    attribution: 'Hutsemékers et al. 2024, arXiv:2509.26053 - ESO/VLT',
    metadata: {
      telescope: 'VLT',
      instrument: 'UVES',
      filters: 'NiI λ3458Å'
    }
  },
  {
    id: 'vlt-uves-fe-ni-spectra-2509.26053',
    title: 'VLT/UVES Iron and Nickel Emission Spectra',
    description: 'Continuum-subtracted UVES spectra from August 28 and September 3-4 showing detection of three narrow FeI lines on August 28. Demonstrates temporal evolution of iron and nickel emissions.',
    date: '2025-09-04T00:00:00Z',
    source: 'Research',
    imageUrl: '/gallery/loeb-research/vlt-uves-fe-ni-spectra.png',
    thumbnailUrl: '/gallery/loeb-research/vlt-uves-fe-ni-spectra.png',
    attribution: 'Hutsemékers et al. 2024, arXiv:2509.26053 - ESO/VLT',
    metadata: {
      telescope: 'VLT',
      instrument: 'UVES',
      filters: 'FeI & NiI spectroscopy'
    }
  },
  {
    id: 'vlt-uves-ni-fe-ratio-aug28-2509.26053',
    title: 'VLT/UVES Ni/Fe Ratio Analysis - August 28',
    description: 'Ratio log₁₀(Iobs/Imod) for FeI (red diamonds) and NiI (blue squares) lines observed on August 28, showing extreme nickel-to-iron ratio anomaly compared to solar system comets.',
    date: '2025-08-28T00:00:00Z',
    source: 'Research',
    imageUrl: '/gallery/loeb-research/vlt-uves-ni-fe-ratio-aug28.png',
    thumbnailUrl: '/gallery/loeb-research/vlt-uves-ni-fe-ratio-aug28.png',
    attribution: 'Hutsemékers et al. 2024, arXiv:2509.26053 - ESO/VLT',
    metadata: {
      telescope: 'VLT',
      instrument: 'UVES',
      filters: 'Ni/Fe abundance ratio'
    }
  },
  {
    id: 'vlt-uves-ni-fe-ratio-sep12-2509.26053',
    title: 'VLT/UVES Ni/Fe Ratio Analysis - September 12',
    description: 'Ratio log₁₀(Iobs/Imod) for FeI and NiI lines on September 12, continuing to show unprecedented nickel enrichment relative to iron in this interstellar visitor.',
    date: '2025-09-12T00:00:00Z',
    source: 'Research',
    imageUrl: '/gallery/loeb-research/vlt-uves-ni-fe-ratio-sep12.png',
    thumbnailUrl: '/gallery/loeb-research/vlt-uves-ni-fe-ratio-sep12.png',
    attribution: 'Hutsemékers et al. 2024, arXiv:2509.26053 - ESO/VLT',
    metadata: {
      telescope: 'VLT',
      instrument: 'UVES',
      filters: 'Ni/Fe abundance ratio'
    }
  },
  {
    id: 'vlt-ni-fe-vs-heliocentric-2509.26053',
    title: 'Ni/Fe Ratio vs Heliocentric Distance',
    description: 'Q(NiI)/Q(FeI) production rate ratio as function of heliocentric distance for 3I/ATLAS (interstellar) compared to solar system comets, highlighting extreme nickel enrichment throughout approach to perihelion.',
    date: '2025-09-12T00:00:00Z',
    source: 'Research',
    imageUrl: '/gallery/loeb-research/vlt-ni-fe-vs-heliocentric.png',
    thumbnailUrl: '/gallery/loeb-research/vlt-ni-fe-vs-heliocentric.png',
    attribution: 'Hutsemékers et al. 2024, arXiv:2509.26053 - ESO/VLT',
    metadata: {
      telescope: 'VLT',
      instrument: 'UVES',
      filters: 'Comparative analysis'
    }
  },
  {
    id: 'vlt-ni-production-rate-2509.26053',
    title: 'Nickel Production Rate Evolution',
    description: 'Q(NiI) production rate in 3I/ATLAS as function of heliocentric distance with Ni(CO)₄ sublimation curve overlay. Analysis suggests nickel carbonyl as potential parent molecule for extreme Ni emissions.',
    date: '2025-09-12T00:00:00Z',
    source: 'Research',
    imageUrl: '/gallery/loeb-research/vlt-ni-production-rate.png',
    thumbnailUrl: '/gallery/loeb-research/vlt-ni-production-rate.png',
    attribution: 'Hutsemékers et al. 2024, arXiv:2509.26053 - ESO/VLT',
    metadata: {
      telescope: 'VLT',
      instrument: 'UVES',
      filters: 'Production rate modeling'
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
          esa_exomars: sortedImages.filter(img => img.source === 'ESA/ExoMars').length,
          jwst: sortedImages.filter(img => img.source === 'JWST').length,
          noirlab_gemini: sortedImages.filter(img => img.source === 'NOIRLab/Gemini').length,
          eso: sortedImages.filter(img => img.source === 'ESO').length,
          virtual_telescope: sortedImages.filter(img => img.source === 'Virtual Telescope').length
        },
        lastUpdated: new Date().toISOString()
      }
    }, {
      headers: {
        // Gallery images are static - cache for 1 hour in browser, 24 hours on CDN
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=172800',
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
          esa_exomars: official3IAtlasImages.filter(img => img.source === 'ESA/ExoMars').length,
          jwst: official3IAtlasImages.filter(img => img.source === 'JWST').length,
          noirlab_gemini: official3IAtlasImages.filter(img => img.source === 'NOIRLab/Gemini').length,
          eso: official3IAtlasImages.filter(img => img.source === 'ESO').length,
          virtual_telescope: official3IAtlasImages.filter(img => img.source === 'Virtual Telescope').length
        },
        lastUpdated: new Date().toISOString(),
        error: 'Failed to fetch additional images from NASA API'
      }
    }, {
      headers: {
        // Gallery images are static - cache for 1 hour in browser, 24 hours on CDN
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=172800',
      }
    });
  }
}

// Add cache headers for better performance
export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 24 hours - static content changes very infrequently