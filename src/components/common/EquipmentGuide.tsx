/**
 * Equipment Viewing Guide Component
 * Shows what equipment is needed to observe 3I/ATLAS based on current magnitude
 * Provides detailed visual expectations and photography tips for each equipment level
 * Theme-aware and mobile-responsive
 */

'use client';

import React, { useState } from 'react';
import { InlineCitation } from './Citation';

interface EquipmentGuideProps {
  magnitude: number; // Current magnitude of 3I/ATLAS
  isVisible?: boolean; // Whether 3I/ATLAS is currently visible from Earth
}

interface EquipmentLevel {
  name: string;
  icon: string;
  magRange: string;
  minMag: number; // Lower bound (brighter)
  maxMag: number; // Upper bound (fainter)
  expectations: string;
  bestPractices: string;
  tip: string;
  photographyNote?: string;
}

const EQUIPMENT_LEVELS: EquipmentLevel[] = [
  {
    name: 'Naked Eye',
    icon: '👁️',
    magRange: '0-6',
    minMag: 0,
    maxMag: 6,
    expectations: 'Faint fuzzy patch visible in dark skies. No color, no tail detail. Requires excellent dark sky conditions away from light pollution.',
    bestPractices: 'Use averted vision (look slightly to the side). Allow 30 minutes for dark adaptation. Best viewing 2 hours after sunset.',
    tip: 'Extremely rare for comets! Most visible comets are mag 4-5 at best.',
    photographyNote: '5-10 second exposures at ISO 1600 can reveal more detail than the naked eye.'
  },
  {
    name: 'Binoculars (7x50 or 10x50)',
    icon: '🔍',
    magRange: '7-10.5',
    minMag: 7,
    maxMag: 10.5,
    expectations: '⚠️ 3I/ATLAS (mag 12.0) is TOO FAINT for binoculars. Limit for extended objects: mag 10.5 with 10x50 binoculars in perfect dark skies. For brighter comets: small diffuse glow, central condensation may be visible.',
    bestPractices: 'N/A for 3I/ATLAS (too faint). For brighter comets: stabilize on tripod, sweep slowly, use 10x magnification.',
    tip: 'Binoculars work great for mag 10 or brighter comets, but 3I/ATLAS is below this threshold.',
    photographyNote: 'N/A for 3I/ATLAS - requires larger aperture'
  },
  {
    name: 'Small Telescope (4-6 inch)',
    icon: '🔭',
    magRange: '10-11',
    minMag: 10,
    maxMag: 11,
    expectations: '⚠️ 3I/ATLAS (mag 12) is MARGINAL for 6" scopes - barely visible as faint smudge in perfect conditions with averted vision. For mag 11 comets: distinct fuzzy patch with central condensation.',
    bestPractices: 'Use low magnification (40-60x). Wide field eyepieces. Dark adaptation essential. Averted vision critical for faint targets.',
    tip: '3I/ATLAS at mag 12 requires 8-10" aperture for comfortable viewing. 6" scopes are at their absolute limit.',
    photographyNote: '30-60 second tracked exposures work better than visual observation for mag 12 objects.'
  },
  {
    name: 'Medium Telescope (8-10 inch)',
    icon: '🔭',
    magRange: '11.5-12.5',
    minMag: 11.5,
    maxMag: 12.5,
    expectations: '✓ RECOMMENDED for 3I/ATLAS (mag 12). Well-defined coma with bright central condensation visible with averted vision. Tail structure NOT visible visually. Greenish color hints possible in larger apertures.',
    bestPractices: 'Start at 50-80x magnification. Dark skies (Bortle 3-4) essential. Allow 30+ minutes for dark adaptation. Use averted vision. OIII filters may help.',
    tip: '8-10" aperture is the MINIMUM for visual observation of 3I/ATLAS coma. Visual observation will NOT show tail structure.',
    photographyNote: 'Amateur astrophotography: 50-100+ stacked exposures (60-120 sec each) MAY reveal faint tail hints. Professional imaging (2m telescope, 159 stacked frames) required for clear tail/jet structure. Expect subtle results with amateur equipment.'
  },
  {
    name: 'Large Telescope (12+ inch)',
    icon: '🔬',
    magRange: '13+',
    minMag: 13,
    maxMag: 20,
    expectations: '✓ EXCELLENT for 3I/ATLAS. Well-defined coma with prominent central condensation visible. Tail/jet structure NOT visible visually through eyepiece - requires astrophotography with long exposures and stacking. Greenish coma color from C2 gas may be detectable in larger apertures (16"+).',
    bestPractices: 'Variable magnification: 80x for context, 150-200x for nucleus detail. Multiple filters (OIII, UHC) reveal emission features. Dark skies still important.',
    tip: 'Large apertures show 3I/ATLAS comfortably and can detect subtle inner coma structure, but the faint sunward jet revealed by professional imaging (Serra-Ricart, Loeb et al. 2025, Astronomers Telegram #17445) requires photography, not visual observation.',
    photographyNote: 'CRITICAL: Tail/jet structure requires 50-100+ stacked exposures (50-120 sec each). Professional observations used 159 stacked 50-sec frames to reveal faint sunward jet. Visual observation alone will NOT show tail structure even in large amateur scopes.'
  }
];

export default function EquipmentGuide({ magnitude, isVisible = true }: EquipmentGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine which equipment levels can see 3I/ATLAS
  const getVisibilityStatus = (level: EquipmentLevel): 'visible' | 'marginal' | 'not-visible' => {
    if (magnitude <= level.maxMag - 1) return 'visible';
    if (magnitude <= level.maxMag) return 'marginal';
    return 'not-visible';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'visible':
        return {
          bg: 'bg-[var(--color-status-success)]/10',
          border: 'border-[var(--color-status-success)]/30',
          text: 'text-[var(--color-status-success)]',
          icon: '✓',
          badge: 'bg-[var(--color-status-success)]'
        };
      case 'marginal':
        return {
          bg: 'bg-[var(--color-status-warning)]/10',
          border: 'border-[var(--color-status-warning)]/30',
          text: 'text-[var(--color-status-warning)]',
          icon: '⚠',
          badge: 'bg-[var(--color-status-warning)]'
        };
      case 'not-visible':
        return {
          bg: 'bg-[var(--color-status-error)]/10',
          border: 'border-[var(--color-status-error)]/30',
          text: 'text-[var(--color-status-error)]',
          icon: '✗',
          badge: 'bg-[var(--color-status-error)]'
        };
      default:
        return {
          bg: 'bg-[var(--color-text-tertiary)]/10',
          border: 'border-[var(--color-border-secondary)]',
          text: 'text-[var(--color-text-tertiary)]',
          icon: '?',
          badge: 'bg-[var(--color-text-tertiary)]'
        };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'visible': return 'VISIBLE';
      case 'marginal': return 'CHALLENGING';
      case 'not-visible': return 'NOT VISIBLE';
      default: return 'UNKNOWN';
    }
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border-primary)]">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-[var(--color-bg-tertiary)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">🔭</span>
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              Equipment Guide - What Will You See?
            </h3>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">
              Based on magnitude <span className="font-mono font-bold text-[var(--color-chart-primary)]">{magnitude.toFixed(1)}m</span>
              {!isVisible && (
                <span className="ml-2 text-[var(--color-status-error)]">
                  (Not currently visible from Earth)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="text-2xl text-[var(--color-text-tertiary)]">
          {isExpanded ? '▼' : '▶'}
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-6">
          {/* Magnitude Scale Bar */}
          <div className="bg-gradient-to-r from-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)] border-2 border-[var(--color-chart-primary)]/30 rounded-lg p-5 mb-6">
            <h4 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <span>🌟</span> Magnitude Scale & Equipment Requirements
            </h4>

            {/* Horizontal Scale Bar */}
            <div className="relative h-20 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-900 rounded-lg mb-4 overflow-hidden">
              {/* Scale markers */}
              <div className="absolute inset-0 flex justify-between items-end pb-2 px-2">
                {[0, 2, 4, 6, 8, 10, 12, 14, 16].map((mag) => (
                  <div key={mag} className="flex flex-col items-center">
                    <div className="h-3 w-0.5 bg-white/60"></div>
                    <span className="text-[10px] font-mono text-white font-bold mt-1">{mag}</span>
                  </div>
                ))}
              </div>

              {/* Equipment zone markers */}
              <div className="absolute top-2 left-0 w-full flex text-[10px] font-bold text-white/90">
                <div className="text-center px-1" style={{ width: '37.5%' }}>👁️ Naked Eye</div>
                <div className="text-center px-1" style={{ width: '21.875%' }}>🔭 Binoculars</div>
                <div className="text-center px-1" style={{ width: '6.25%' }}>🔭 4-6"</div>
                <div className="text-center px-1" style={{ width: '6.25%' }}>🔭 8-10"</div>
                <div className="text-center px-1" style={{ width: '28.125%' }}>🔭 12"+</div>
              </div>

              {/* Current comet position indicator */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                style={{
                  left: `${Math.min(100, Math.max(0, (magnitude / 16) * 100))}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-chart-primary)] text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap shadow-lg">
                  3I/ATLAS: {magnitude.toFixed(1)}m
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-[var(--color-chart-primary)]"></div>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded px-2 py-1">
                <span>👁️</span>
                <span className="text-[var(--color-text-secondary)]">Naked Eye: 0-6 mag</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded px-2 py-1">
                <span>🔭</span>
                <span className="text-[var(--color-text-secondary)]">Binoculars: 7-10.5 mag</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded px-2 py-1">
                <span>🔭</span>
                <span className="text-[var(--color-text-secondary)]">4-6" Scope: 10-11 mag</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded px-2 py-1">
                <span>🔭</span>
                <span className="text-[var(--color-text-secondary)]">8-10" Scope: 11.5-12.5 mag</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded px-2 py-1">
                <span>🔭</span>
                <span className="text-[var(--color-text-secondary)]">12"+ Scope: 13+ mag</span>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-tertiary)] mt-3 italic">
              <strong>Note:</strong> Lower magnitude = brighter object. Each whole number represents 2.5× brightness difference.
              Current magnitude shown with white marker.
            </p>
          </div>

      {/* Equipment Levels Grid */}
      <div className="space-y-4 mb-6">
        {EQUIPMENT_LEVELS.map((level) => {
          const status = getVisibilityStatus(level);
          const colors = getStatusColor(status);
          const statusText = getStatusText(status);

          return (
            <div
              key={level.name}
              className={`${colors.bg} border-2 ${colors.border} rounded-lg p-5 transition-all duration-300 hover:shadow-lg`}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden="true">{level.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-[var(--color-text-primary)]">
                        {level.name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${colors.text}`}>
                        mag {level.magRange}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xl ${colors.text}`} aria-hidden="true">{colors.icon}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.text} ${colors.bg} border ${colors.border}`}>
                    {statusText}
                  </span>
                </div>
              </div>

              {/* Content - Only show details if visible or marginal */}
              {(status === 'visible' || status === 'marginal') && (
                <div className="space-y-3 ml-12">
                  {/* What to Expect */}
                  <div>
                    <div className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase mb-1">
                      What to Expect:
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                      {level.expectations}
                    </p>
                  </div>

                  {/* Best Practices */}
                  <div>
                    <div className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase mb-1">
                      Best Practices:
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                      {level.bestPractices}
                    </p>
                  </div>

                  {/* Pro Tip */}
                  <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 border border-[var(--color-border-secondary)]">
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">💡</span>
                      <div>
                        <span className="text-xs font-semibold text-[var(--color-chart-primary)]">Pro Tip: </span>
                        <span className="text-xs text-[var(--color-text-primary)]">{level.tip}</span>
                      </div>
                    </div>
                  </div>

                  {/* Photography Note */}
                  {level.photographyNote && (
                    <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 border border-[var(--color-border-secondary)]">
                      <div className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">📷</span>
                        <div>
                          <span className="text-xs font-semibold text-[var(--color-chart-secondary)]">Photography: </span>
                          <span className="text-xs text-[var(--color-text-primary)]">{level.photographyNote}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Marginal warning */}
                  {status === 'marginal' && (
                    <div className="bg-[var(--color-status-warning)]/10 rounded-lg p-3 border border-[var(--color-status-warning)]/30">
                      <div className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">⚠️</span>
                        <p className="text-xs text-[var(--color-status-warning)]">
                          <strong>Challenging conditions:</strong> This equipment is at its limit for the current magnitude. Excellent dark skies, dark adaptation, and averted vision are essential.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Not visible message */}
              {status === 'not-visible' && (
                <div className="ml-12">
                  <p className="text-sm text-[var(--color-text-tertiary)] italic">
                    3I/ATLAS is too faint at magnitude {magnitude.toFixed(1)} for this equipment level. Wait until magnitude drops below {level.maxMag.toFixed(1)}.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CRITICAL: Visual vs Photography Reality Check */}
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-lg p-5 mb-6 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">⚠️</span>
          <h4 className="text-lg font-bold text-[var(--color-text-primary)]">Visual vs Photography: Critical Distinction</h4>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
            <strong>Tail/jet structure is NOT visible through the eyepiece</strong> - even in large amateur telescopes (12-20 inch).
            Professional research by Serra-Ricart, Loeb et al. (2025) using the 2-meter Twin Telescope required <strong>159 stacked 50-second exposures</strong> to reveal the faint sunward jet.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-status-success)]/10 border border-[var(--color-status-success)]/30 rounded p-3">
              <div className="font-semibold text-[var(--color-status-success)] mb-1">✓ Visual Observation (Eyepiece):</div>
              <ul className="text-xs text-[var(--color-text-primary)] space-y-1">
                <li>• Coma (fuzzy head) visible with 8"+ telescopes</li>
                <li>• Central condensation/nucleus visible</li>
                <li>• Greenish color hints in 16"+ apertures</li>
                <li>• NO tail/jet structure visible</li>
              </ul>
            </div>
            <div className="bg-[var(--color-chart-secondary)]/10 border border-[var(--color-chart-secondary)]/30 rounded p-3">
              <div className="font-semibold text-[var(--color-chart-secondary)] mb-1">📷 Photography Only:</div>
              <ul className="text-xs text-[var(--color-text-primary)] space-y-1">
                <li>• Tail/jet structure (requires stacking)</li>
                <li>• Multiple tail components</li>
                <li>• Detailed coma morphology</li>
                <li>• Gas emission features (with filters)</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] italic mt-2">
            <strong>Research Citation:</strong> Serra-Ricart, M., Loeb, A., et al. (2025), "A Sunward Jet from 3I-ATLAS Imaged by the Two Meter Twin Telescope" (Astronomers Telegram #17445) -
            Even professional 2-meter apertures require extensive imaging to capture tail structure invisible to visual observation.
          </p>
        </div>
      </div>

      {/* General Photography Tips Section */}
      <div className="bg-gradient-to-r from-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)] border-2 border-[var(--color-chart-secondary)]/30 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📸</span>
          <h4 className="text-lg font-bold text-[var(--color-text-primary)]">General Photography Tips</h4>
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-semibold text-[var(--color-text-secondary)] mb-1">Camera Settings (Coma):</div>
            <ul className="space-y-1 text-[var(--color-text-primary)]">
              <li>• ISO 1600-3200 for DSLR</li>
              <li>• Exposures: 60-120 seconds (with tracking)</li>
              <li>• Wide aperture (f/2.8-f/4)</li>
              <li>• Manual focus on bright star</li>
              <li>• 20-30 frames for good coma detail</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-[var(--color-text-secondary)] mb-1">Tail Structure (Advanced):</div>
            <ul className="space-y-1 text-[var(--color-text-primary)]">
              <li>• 50-100+ stacked frames MINIMUM</li>
              <li>• 60-120 sec exposures each</li>
              <li>• Aggressive histogram stretching</li>
              <li>• Expect subtle/faint results</li>
              <li>• Professional results need 150+ frames</li>
            </ul>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--color-border-secondary)]">
          <p className="text-xs text-[var(--color-text-tertiary)] italic">
            <strong>Reality Check:</strong> 3I/ATLAS tail structure has extremely low surface brightness. Even with 100+ stacked amateur frames, expect faint wisps at best. Professional 2m telescopes with 150+ stacked exposures reveal the clear sunward jet structure (Serra-Ricart, Loeb et al. 2025). Amateur imaging can capture the impressive coma, but dramatic tail imaging requires professional equipment.
          </p>
        </div>
      </div>

      {/* Key Concepts Footer */}
      <div className="mt-6 pt-6 border-t border-[var(--color-border-secondary)]">
        <div className="flex items-start gap-2">
          <span className="text-lg mt-0.5">💡</span>
          <div className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
            <strong>Magnitude Scale:</strong> Lower numbers = brighter objects. Each whole number represents 2.5× brightness difference.
            Naked eye limit is ~6.0 in dark skies, ~4.0 in suburbs. Visual magnitude and photographic magnitude can differ slightly.
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
