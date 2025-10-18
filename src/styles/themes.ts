/**
 * Theme definitions for the 3I/ATLAS Dashboard
 *
 * Supports dark, light, and high-contrast modes with comprehensive color palettes
 * for backgrounds, text, borders, status indicators, charts, and interactive elements.
 */

export type ThemeMode = 'dark' | 'light' | 'high-contrast';

export interface Theme {
  colors: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      heading: string;
    };
    border: {
      primary: string;
      secondary: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    chart: {
      primary: string;
      secondary: string;
      tertiary: string;
      quaternary: string;
      quinary: string;
      senary: string;
      perihelion: string;
      blackout: string;
    };
    gradient: {
      title: string;
      button: string;
    };
    interactive: {
      primary: string;
      primaryHover: string;
      secondary: string;
      secondaryHover: string;
    };
  };
}

export const themes: Record<ThemeMode, Theme> = {
  dark: {
    colors: {
      background: {
        primary: '#0a0a0a',
        secondary: '#1a1a1a',
        tertiary: '#2a2a2a',
      },
      text: {
        primary: '#e5e5e5',
        secondary: '#a3a3a3',
        tertiary: '#737373',
        heading: '#f5f5f5',
      },
      border: {
        primary: '#404040',
        secondary: '#525252',
      },
      status: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      chart: {
        primary: '#8b5cf6',
        secondary: '#ec4899',
        tertiary: '#06b6d4',
        quaternary: '#10b981',
        quinary: '#f59e0b',
        senary: '#6366f1',
        perihelion: '#dc2626',
        blackout: '#facc15',
      },
      gradient: {
        title: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%)',
        button: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      },
      interactive: {
        primary: '#8b5cf6',
        primaryHover: '#7c3aed',
        secondary: '#3b82f6',
        secondaryHover: '#2563eb',
      },
    },
  },
  light: {
    colors: {
      background: {
        primary: '#ffffff',
        secondary: '#f5f5f5',
        tertiary: '#e5e5e5',
      },
      text: {
        primary: '#171717',
        secondary: '#525252',
        tertiary: '#737373',
        heading: '#0a0a0a',
      },
      border: {
        primary: '#d4d4d4',
        secondary: '#a3a3a3',
      },
      status: {
        success: '#16a34a',
        warning: '#ea580c',
        error: '#dc2626',
        info: '#2563eb',
      },
      chart: {
        primary: '#7c3aed',
        secondary: '#db2777',
        tertiary: '#0891b2',
        quaternary: '#16a34a',
        quinary: '#ea580c',
        senary: '#4f46e5',
        perihelion: '#b91c1c',
        blackout: '#ca8a04',
      },
      gradient: {
        title: 'linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #0891b2 100%)',
        button: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
      },
      interactive: {
        primary: '#7c3aed',
        primaryHover: '#6d28d9',
        secondary: '#2563eb',
        secondaryHover: '#1d4ed8',
      },
    },
  },
  'high-contrast': {
    colors: {
      background: {
        primary: '#000000',
        secondary: '#1a1a1a',
        tertiary: '#333333',
      },
      text: {
        primary: '#ffffff',
        secondary: '#d4d4d4',
        tertiary: '#a3a3a3',
        heading: '#ffffff',
      },
      border: {
        primary: '#ffffff',
        secondary: '#d4d4d4',
      },
      status: {
        success: '#22c55e',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',
      },
      chart: {
        primary: '#a78bfa',
        secondary: '#f472b6',
        tertiary: '#22d3ee',
        quaternary: '#4ade80',
        quinary: '#fb923c',
        senary: '#818cf8',
        perihelion: '#ef4444',
        blackout: '#fde047',
      },
      gradient: {
        title: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #22d3ee 100%)',
        button: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)',
      },
      interactive: {
        primary: '#a78bfa',
        primaryHover: '#9333ea',
        secondary: '#60a5fa',
        secondaryHover: '#3b82f6',
      },
    },
  },
};
