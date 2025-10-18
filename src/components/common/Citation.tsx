/**
 * Citation Components
 *
 * Reusable components for displaying scientific references and data source attributions.
 * Ensures consistent formatting and proper linking across the dashboard.
 */

import { getCitation, formatCitation, getCitationUrl, type Citation as CitationType } from '@/utils/citations';
import InfoTooltip from './InfoTooltip';

// ========================================
// INLINE CITATION (superscript number or short format)
// ========================================

interface InlineCitationProps {
  /** Citation ID from citations.ts */
  id: string;
  /** Display style: 'number' (superscript [1]), 'short' (Author 2024), or 'full' */
  style?: 'number' | 'short' | 'full';
  /** Optional custom number for [1] style */
  number?: number;
  className?: string;
}

export function InlineCitation({ id, style = 'short', number, className = '' }: InlineCitationProps) {
  const citation = getCitation(id);

  if (!citation) {
    console.warn(`Citation not found: ${id}`);
    return null;
  }

  const url = getCitationUrl(citation);
  const text = style === 'number'
    ? `[${number ?? '?'}]`
    : formatCitation(citation, style === 'full' ? 'full' : 'short');

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-[var(--color-chart-senary)] hover:text-[var(--color-chart-senary)]/80 underline ${
          style === 'number' ? 'text-xs align-super' : ''
        } ${className}`}
        title={citation.description || formatCitation(citation, 'full')}
      >
        {text}
      </a>
    );
  }

  return (
    <span className={`${style === 'number' ? 'text-xs align-super' : ''} ${className}`}>
      {text}
    </span>
  );
}

// ========================================
// CITATION BLOCK (full reference with metadata)
// ========================================

interface CitationBlockProps {
  /** Citation ID from citations.ts */
  id: string;
  /** Show full metadata (journal, DOI, etc.) */
  showMetadata?: boolean;
  className?: string;
}

export function CitationBlock({ id, showMetadata = true, className = '' }: CitationBlockProps) {
  const citation = getCitation(id);

  if (!citation) {
    console.warn(`Citation not found: ${id}`);
    return null;
  }

  const url = getCitationUrl(citation);

  return (
    <div className={`bg-[var(--color-bg-tertiary)] rounded-lg p-4 border border-[var(--color-border-primary)] ${className}`}>
      {/* Type badge */}
      <div className="mb-2">
        <span className={`inline-block px-2 py-1 rounded text-xs font-mono ${
          citation.type === 'paper' || citation.type === 'preprint'
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : citation.type === 'data-source'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
        }`}>
          {citation.type.toUpperCase()}
        </span>
        {citation.license && (
          <span className="ml-2 inline-block px-2 py-1 rounded text-xs font-mono bg-orange-500/20 text-orange-400 border border-orange-500/30">
            {citation.license}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-[var(--color-text-primary)] font-semibold mb-1">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-chart-senary)] hover:text-[var(--color-chart-senary)]/80 underline"
          >
            {citation.title}
          </a>
        ) : (
          citation.title
        )}
      </h4>

      {/* Authors and year */}
      {(citation.authors || citation.year) && (
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">
          {citation.authors && <span>{citation.authors}</span>}
          {citation.authors && citation.year && <span> </span>}
          {citation.year && <span>({citation.year})</span>}
        </p>
      )}

      {/* Journal/Publication info */}
      {showMetadata && (citation.journal || citation.volume || citation.pages) && (
        <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
          {citation.journal && <span className="italic">{citation.journal}</span>}
          {citation.volume && <span> <strong>{citation.volume}</strong></span>}
          {citation.pages && <span>:{citation.pages}</span>}
        </p>
      )}

      {/* DOI/arXiv/URL */}
      {showMetadata && (citation.doi || citation.arxiv || citation.url) && (
        <p className="text-xs text-[var(--color-text-tertiary)] mb-2 font-mono">
          {citation.doi && (
            <a
              href={`https://doi.org/${citation.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-chart-primary)] hover:text-[var(--color-chart-primary)]/80 underline"
            >
              DOI: {citation.doi}
            </a>
          )}
          {citation.arxiv && (
            <a
              href={`https://arxiv.org/abs/${citation.arxiv}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-chart-primary)] hover:text-[var(--color-chart-primary)]/80 underline"
            >
              arXiv:{citation.arxiv}
            </a>
          )}
          {!citation.doi && !citation.arxiv && citation.url && (
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-chart-primary)] hover:text-[var(--color-chart-primary)]/80 underline break-all"
            >
              {citation.url}
            </a>
          )}
        </p>
      )}

      {/* Description */}
      {citation.description && (
        <p className="text-xs text-[var(--color-text-secondary)]">
          {citation.description}
        </p>
      )}

      {/* Notes */}
      {showMetadata && citation.notes && (
        <p className="text-xs text-[var(--color-text-tertiary)] mt-2 italic">
          Note: {citation.notes}
        </p>
      )}
    </div>
  );
}

// ========================================
// CITATION LIST (multiple references)
// ========================================

interface CitationListProps {
  /** Array of citation IDs from citations.ts */
  ids: string[];
  /** Display style: 'blocks', 'compact', or 'inline' */
  style?: 'blocks' | 'compact' | 'inline';
  /** Section title */
  title?: string;
  className?: string;
}

export function CitationList({ ids, style = 'compact', title = 'References', className = '' }: CitationListProps) {
  const citations = ids.map(id => getCitation(id)).filter(Boolean) as CitationType[];

  if (citations.length === 0) {
    return null;
  }

  if (style === 'blocks') {
    return (
      <div className={className}>
        {title && (
          <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            📚 {title}
          </h4>
        )}
        <div className="space-y-3">
          {citations.map(citation => (
            <CitationBlock key={citation.id} id={citation.id} showMetadata={true} />
          ))}
        </div>
      </div>
    );
  }

  if (style === 'inline') {
    return (
      <span className={className}>
        {citations.map((citation, index) => (
          <span key={citation.id}>
            <InlineCitation id={citation.id} style="short" />
            {index < citations.length - 1 && <span>; </span>}
          </span>
        ))}
      </span>
    );
  }

  // Compact style (default)
  return (
    <div className={`text-xs text-[var(--color-text-tertiary)] ${className}`}>
      {title && (
        <p className="font-semibold text-[var(--color-text-secondary)] mb-2">
          📚 {title}:
        </p>
      )}
      <div className="space-y-1">
        {citations.map(citation => {
          const url = getCitationUrl(citation);
          const text = formatCitation(citation, 'short');

          return (
            <div key={citation.id}>
              <strong className="text-[var(--color-text-secondary)]">
                {citation.type === 'data-source' && '🔭 '}
                {citation.type === 'paper' && '📄 '}
                {citation.type === 'preprint' && '📑 '}
                {citation.type === 'book' && '📚 '}
                {citation.title}:
              </strong>{' '}
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-chart-senary)] hover:text-[var(--color-chart-senary)]/80 underline"
                >
                  {text}
                </a>
              ) : (
                <span>{text}</span>
              )}
              {citation.description && (
                <span className="ml-1">• {citation.description}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========================================
// DATA SOURCE ATTRIBUTION (special format for COBS, JPL, etc.)
// ========================================

interface DataSourceAttributionProps {
  /** Citation ID from citations.ts (must be type: 'data-source') */
  id: string;
  /** Show license badge */
  showLicense?: boolean;
  className?: string;
}

export function DataSourceAttribution({ id, showLicense = true, className = '' }: DataSourceAttributionProps) {
  const citation = getCitation(id);

  if (!citation || citation.type !== 'data-source') {
    console.warn(`Data source citation not found or wrong type: ${id}`);
    return null;
  }

  const url = citation.url;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-[var(--color-text-secondary)]">
        <strong className="text-[var(--color-text-primary)]">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-chart-senary)] hover:text-[var(--color-chart-senary)]/80 underline"
            >
              {citation.title}
            </a>
          ) : (
            citation.title
          )}
        </strong>
        {citation.description && <span className="ml-1 text-xs">({citation.description})</span>}
      </span>
      {showLicense && citation.license && (
        <span className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-orange-500/20 text-orange-400 border border-orange-500/30">
          {citation.license}
        </span>
      )}
      {citation.notes && (
        <InfoTooltip content={citation.notes} />
      )}
    </div>
  );
}
