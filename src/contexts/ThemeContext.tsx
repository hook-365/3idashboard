'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeMode, Theme, themes } from '@/styles/themes';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'comet-dashboard-theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage or system preference on mount
  useEffect(() => {
    let savedTheme: ThemeMode | null = null;

    // Try to load from localStorage
    try {
      savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    } catch (e) {
      // localStorage is disabled or blocked - will use system preference
      console.log('[ThemeProvider] localStorage unavailable, using system preference');
    }

    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'high-contrast')) {
      // Use saved preference
      setThemeMode(savedTheme);
    } else {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeMode(prefersDark ? 'dark' : 'light');
    }

    setMounted(true);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a theme
      let savedTheme: string | null = null;
      try {
        savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      } catch (e) {
        // localStorage unavailable - always follow system preference
      }

      if (!savedTheme) {
        setThemeMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted]);

  // Apply theme to document root and save to localStorage
  useEffect(() => {
    if (!mounted) return;

    // Set data-theme attribute on document root
    document.documentElement.setAttribute('data-theme', themeMode);

    // Save to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (e) {
      // localStorage unavailable - theme will reset on page reload
      console.log('[ThemeProvider] localStorage unavailable, theme preference not saved');
    }

    // Apply CSS custom properties to root
    const theme = themes[themeMode];
    const root = document.documentElement;

    // Background colors
    root.style.setProperty('--color-bg-primary', theme.colors.background.primary);
    root.style.setProperty('--color-bg-secondary', theme.colors.background.secondary);
    root.style.setProperty('--color-bg-tertiary', theme.colors.background.tertiary);

    // Text colors
    root.style.setProperty('--color-text-primary', theme.colors.text.primary);
    root.style.setProperty('--color-text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--color-text-tertiary', theme.colors.text.tertiary);
    root.style.setProperty('--color-text-heading', theme.colors.text.heading);

    // Border colors
    root.style.setProperty('--color-border-primary', theme.colors.border.primary);
    root.style.setProperty('--color-border-secondary', theme.colors.border.secondary);

    // Status colors
    root.style.setProperty('--color-status-success', theme.colors.status.success);
    root.style.setProperty('--color-status-warning', theme.colors.status.warning);
    root.style.setProperty('--color-status-error', theme.colors.status.error);
    root.style.setProperty('--color-status-info', theme.colors.status.info);

    // Chart colors
    root.style.setProperty('--color-chart-primary', theme.colors.chart.primary);
    root.style.setProperty('--color-chart-secondary', theme.colors.chart.secondary);
    root.style.setProperty('--color-chart-tertiary', theme.colors.chart.tertiary);
    root.style.setProperty('--color-chart-quaternary', theme.colors.chart.quaternary);
    root.style.setProperty('--color-chart-quinary', theme.colors.chart.quinary);
    root.style.setProperty('--color-chart-senary', theme.colors.chart.senary);
    root.style.setProperty('--color-chart-perihelion', theme.colors.chart.perihelion);
    root.style.setProperty('--color-chart-blackout', theme.colors.chart.blackout);

    // Gradients
    root.style.setProperty('--gradient-title', theme.colors.gradient.title);
    root.style.setProperty('--gradient-button', theme.colors.gradient.button);

    // Interactive colors
    root.style.setProperty('--color-interactive-primary', theme.colors.interactive.primary);
    root.style.setProperty('--color-interactive-primary-hover', theme.colors.interactive.primaryHover);
    root.style.setProperty('--color-interactive-secondary', theme.colors.interactive.secondary);
    root.style.setProperty('--color-interactive-secondary-hover', theme.colors.interactive.secondaryHover);
  }, [themeMode, mounted]);

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const value: ThemeContextType = {
    theme: themes[themeMode],
    themeMode,
    setTheme,
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
