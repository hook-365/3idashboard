'use client';

import { useEffect, useState, useRef } from 'react';

interface Subsection {
  id: string;
  title: string;
}

interface Section {
  id: string;
  title: string;
  icon: string;
  description: string;
  color: string;
  subsections?: Subsection[];
}

interface SectionNavigatorProps {
  sections: Section[];
}

/**
 * SectionNavigator - Sticky side navigation that highlights current section
 *
 * Features:
 * - Highlights active section based on scroll position (syncs with hash navigation)
 * - Smooth scroll to section on click
 * - Auto-expands <details> elements when navigating
 * - Responsive: side nav on desktop, collapsible on mobile
 */
export default function SectionNavigator({ sections }: SectionNavigatorProps) {
  const [activeSection, setActiveSection] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to find parent section for a given ID
  const findParentSection = (id: string): string | null => {
    for (const section of sections) {
      if (section.id === id) return section.id; // It's a parent
      if (section.subsections?.some(sub => sub.id === id)) {
        return section.id; // Found parent
      }
    }
    return null;
  };

  useEffect(() => {
    // Update active section from hash changes
    const updateActiveFromHash = () => {
      const hash = window.location.hash.slice(1); // Remove #
      if (hash) {
        setActiveSection(hash);
      }
    };

    // Listen for custom hashupdate event from ScrollHashUpdater
    const handleHashUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ hash: string }>;
      if (customEvent.detail?.hash) {
        setActiveSection(customEvent.detail.hash);
      }
    };

    // Initial check
    updateActiveFromHash();

    // Listen for hash changes (from manual navigation)
    window.addEventListener('hashchange', updateActiveFromHash);

    // Listen for custom hashupdate event (from ScrollHashUpdater)
    window.addEventListener('hashupdate', handleHashUpdate);

    // Create our own IntersectionObserver for immediate scroll tracking
    // This ensures navigation highlights work even when hash updates are disabled

    // Delay observer setup to allow all nested components to mount
    const observerTimeout = setTimeout(() => {
      // Collect all section IDs (main sections + subsections)
      const allSectionIds: string[] = [];
      sections.forEach(section => {
        allSectionIds.push(section.id);
        if (section.subsections) {
          section.subsections.forEach(sub => allSectionIds.push(sub.id));
        }
      });

      // Get all elements (main sections + subsections)
      const sectionElements = allSectionIds
        .map(id => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);

      console.log('[SectionNavigator] Observing sections:', sectionElements.map(el => el.id));

      if (sectionElements.length === 0) {
        console.warn('[SectionNavigator] No section elements found to observe');
        return;
      }

      const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible section
        let mostVisible: { element: HTMLElement; ratio: number } | null = null;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!mostVisible || entry.intersectionRatio > mostVisible.ratio) {
              mostVisible = {
                element: entry.target as HTMLElement,
                ratio: entry.intersectionRatio
              };
            }
          }
        });

        // Debounce updates to prevent flickering
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current);
        }

        updateTimerRef.current = setTimeout(() => {
          // Update active section based on most visible element
          // Lower threshold to 0.05 (5%) to catch smaller sections
          if (mostVisible && mostVisible.ratio > 0.05) {
            setActiveSection(mostVisible.element.id);
          }
        }, 100); // Reduced to 100ms for more responsive tracking
      },
      {
        threshold: [0, 0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        rootMargin: '-100px 0px -20% 0px' // Less aggressive bottom margin for better small section detection
      }
    );

      sectionElements.forEach(el => observer.observe(el));
    }, 1000); // Wait 1 second for all components to mount

    return () => {
      window.removeEventListener('hashchange', updateActiveFromHash);
      window.removeEventListener('hashupdate', handleHashUpdate);
      clearTimeout(observerTimeout);
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [sections]);

  const handleSectionClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;

    // If it's a <details> element, open it
    if (element.tagName === 'DETAILS') {
      (element as HTMLDetailsElement).open = true;
    }

    // Smooth scroll to section
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Update hash without jumping
    history.pushState(null, '', `#${sectionId}`);
    setActiveSection(sectionId);

    // Close mobile menu after clicking
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle Button - Only shows on mobile */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[var(--color-chart-primary)] hover:bg-[var(--color-chart-primary)]/80 text-white rounded-full p-3 shadow-lg transition-colors"
          aria-label="Toggle section navigation"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--color-bg-primary)] border-t-2 border-[var(--color-border-primary)] rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Jump to Section</h3>
            <nav className="space-y-2">
              {sections.map((section) => {
                const isActive = activeSection === section.id;
                const hasActiveSubsection = section.subsections?.some(sub => activeSection === sub.id);
                const showSubsections = (isActive || hasActiveSubsection) && section.subsections && section.subsections.length > 0;
                const isParentHighlighted = isActive || hasActiveSubsection; // Highlight parent if subsection is active

                return (
                  <div key={section.id}>
                    <button
                      onClick={() => handleSectionClick(section.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        isParentHighlighted
                          ? 'bg-[var(--color-chart-primary)]/20 border-l-4 border-[var(--color-chart-primary)]'
                          : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{section.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold text-sm ${
                            isParentHighlighted
                              ? 'text-[var(--color-chart-primary)]'
                              : 'text-[var(--color-text-primary)]'
                          }`}>
                            {section.title}
                          </div>
                          <div className="text-xs text-[var(--color-text-tertiary)] truncate">
                            {section.description}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Subsections - only show when parent is active */}
                    {showSubsections && (
                      <div className="ml-10 mt-2 space-y-1">
                        {section.subsections!.map((subsection) => (
                          <button
                            key={subsection.id}
                            onClick={() => handleSectionClick(subsection.id)}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                              activeSection === subsection.id
                                ? 'bg-[var(--color-chart-primary)]/10 text-[var(--color-chart-primary)] font-medium'
                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                            }`}
                          >
                            → {subsection.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Navigation - Renders inline in parent's grid column */}
      <div className="hidden lg:block bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm border border-[var(--color-border-primary)] rounded-lg p-4 shadow-lg">
        <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 px-2">
          On This Page
        </h3>
        <nav className="space-y-1">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            const hasActiveSubsection = section.subsections?.some(sub => activeSection === sub.id);
            const showSubsections = (isActive || hasActiveSubsection) && section.subsections && section.subsections.length > 0;
            const isParentHighlighted = isActive || hasActiveSubsection; // Highlight parent if subsection is active

            return (
              <div key={section.id}>
                <button
                  onClick={() => handleSectionClick(section.id)}
                  className={`w-full text-left px-3 py-2 rounded transition-all group ${
                    isParentHighlighted
                      ? 'bg-[var(--color-chart-primary)]/20 border-l-4 border-[var(--color-chart-primary)]'
                      : 'hover:bg-[var(--color-bg-tertiary)] border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg mt-0.5 flex-shrink-0">{section.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${
                        isParentHighlighted
                          ? 'text-[var(--color-chart-primary)]'
                          : 'text-[var(--color-text-primary)] group-hover:text-[var(--color-chart-primary)]'
                      }`}>
                        {section.title}
                      </div>
                      <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5 line-clamp-1">
                        {section.description}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Subsections - only show when parent is active */}
                {showSubsections && (
                  <div className="ml-8 mt-1 space-y-1 border-l-2 border-[var(--color-border-secondary)] pl-3">
                    {section.subsections!.map((subsection) => (
                      <button
                        key={subsection.id}
                        onClick={() => handleSectionClick(subsection.id)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                          activeSection === subsection.id
                            ? 'bg-[var(--color-chart-primary)]/10 text-[var(--color-chart-primary)] font-medium'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                        }`}
                      >
                        {subsection.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}
