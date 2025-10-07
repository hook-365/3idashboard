'use client';

import { useState } from 'react';

interface InfoTooltipProps {
  content: string;
  learnMoreUrl?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function InfoTooltip({
  content,
  learnMoreUrl,
  position = 'top'
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1">
      <button
        className="info-icon text-[var(--color-chart-primary)] hover:text-[var(--color-chart-secondary)] transition-colors"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="More information"
        type="button"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`tooltip absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 w-64 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-lg p-3 shadow-lg`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <p className="text-sm text-[var(--color-text-primary)]">{content}</p>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--color-chart-primary)] hover:underline mt-2 inline-block"
            >
              Learn more →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
