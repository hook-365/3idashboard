'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Contrast } from 'lucide-react';

/**
 * ThemeSelector - Theme switching component
 *
 * Allows users to switch between dark, light, and high-contrast themes.
 * Theme preference is saved to localStorage and syncs across tabs.
 */
export default function ThemeSelector() {
  const { themeMode, setTheme } = useTheme();

  const themes = [
    { mode: 'dark' as const, icon: Moon, label: 'Dark' },
    { mode: 'light' as const, icon: Sun, label: 'Light' },
    { mode: 'high-contrast' as const, icon: Contrast, label: 'High Contrast' },
  ];

  return (
    <div className="flex items-center gap-1 bg-[var(--color-bg-secondary)] rounded-lg p-1 border border-[var(--color-border-primary)]">
      {themes.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => setTheme(mode)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded transition-all
            ${themeMode === mode
              ? 'bg-[var(--color-interactive-primary)] text-white shadow-md'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
            }
          `}
          aria-label={`Switch to ${label} theme`}
          title={`Switch to ${label} theme`}
        >
          <Icon size={16} />
          <span className="text-xs font-medium hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
