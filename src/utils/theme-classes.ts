/**
 * Tailwind CSS classes that use theme CSS variables
 * These can be used throughout the app for theme-aware styling
 */

export const themeClasses = {
  // Background classes
  bg: {
    primary: 'bg-[var(--color-bg-primary)]',
    secondary: 'bg-[var(--color-bg-secondary)]',
    tertiary: 'bg-[var(--color-bg-tertiary)]',
  },

  // Text classes
  text: {
    primary: 'text-[var(--color-text-primary)]',
    secondary: 'text-[var(--color-text-secondary)]',
    tertiary: 'text-[var(--color-text-tertiary)]',
    heading: 'text-[var(--color-text-heading)]',
  },

  // Border classes
  border: {
    primary: 'border-[var(--color-border-primary)]',
    secondary: 'border-[var(--color-border-secondary)]',
  },

  // Status classes
  status: {
    success: 'text-[var(--color-status-success)]',
    successBg: 'bg-[var(--color-status-success)]',
    warning: 'text-[var(--color-status-warning)]',
    warningBg: 'bg-[var(--color-status-warning)]',
    error: 'text-[var(--color-status-error)]',
    errorBg: 'bg-[var(--color-status-error)]',
    info: 'text-[var(--color-status-info)]',
    infoBg: 'bg-[var(--color-status-info)]',
  },

  // Interactive classes
  interactive: {
    primary: 'bg-[var(--color-interactive-primary)] hover:bg-[var(--color-interactive-primary-hover)]',
    secondary: 'bg-[var(--color-interactive-secondary)] hover:bg-[var(--color-interactive-secondary-hover)]',
  },

  // Card/Panel classes
  card: 'bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg',
  panel: 'bg-[var(--color-bg-tertiary)] rounded-lg',
};

/**
 * Get theme-aware gradient style
 */
export function getGradientStyle(type: 'title' | 'button'): React.CSSProperties {
  if (typeof window === 'undefined') return {};

  const gradient = getComputedStyle(document.documentElement)
    .getPropertyValue(type === 'title' ? '--gradient-title' : '--gradient-button')
    .trim();

  return {
    background: gradient || (type === 'title'
      ? 'linear-gradient(to right, #22d3ee, #3b82f6, #a855f7)'
      : 'linear-gradient(to right, #d97706, #f59e0b)'),
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };
}
