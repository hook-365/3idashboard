'use client';

import { useRef, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartOptions, ChartData } from 'chart.js';
import { getTextColors, getBackgroundColors, getBorderColors, getChartColors } from '@/utils/chart-theme';
import { ExtensionSafeChartContainer } from '@/components/ExtensionSafeComponents';
import InfoTooltip from '@/components/common/InfoTooltip';
import { InlineCitation } from '@/components/common/Citation';

// Import global Chart.js setup (registers all components once)
import '@/lib/chartjs-setup';
import type { Chart as ChartJS } from 'chart.js';

/**
 * ActivityScalingChart Component
 *
 * Visualizes the extreme heliocentric distance scaling of gas production
 * in 3I/ATLAS compared to typical comets. Shows how wildly unusual the
 * r_h^(-8.43) and r_h^(-9.38) power laws are compared to normal r_h^(-2 to -4).
 *
 * This is one of the most striking anomalies - the object started outgassing
 * MUCH farther from the Sun than expected, suggesting exotic volatile ices
 * or unusual surface properties from its interstellar origin.
 *
 * Based on arXiv:2508.18382 findings
 */

interface ActivityScalingChartProps {
  className?: string;
}

export default function ActivityScalingChart({ className = '' }: ActivityScalingChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Generate theoretical curves for comparison
  const chartData: ChartData<'line'> = useMemo(() => {
    const textColors = getTextColors();
    const chartColors = getChartColors();

    // Heliocentric distance range: 3.5 AU (far) to 1.36 AU (perihelion)
    const distances = [];
    for (let r = 3.5; r >= 1.36; r -= 0.05) {
      distances.push(r);
    }

    // Normalize all curves to Q=1 at r=2.0 AU for comparison
    const r_ref = 2.0;

    // Calculate production rates using different power laws
    // Values from published literature:
    const typicalLow = distances.map(r => Math.pow(r_ref / r, 2)); // r^(-2) typical
    const halley = distances.map(r => Math.pow(r_ref / r, 3.5)); // r^(-3.5) Halley's Comet (Fink & Combi 1994)
    const borisov = distances.map(r => Math.pow(r_ref / r, 2.2)); // r^(-2.2) 2I/Borisov, shallow dependence
    const typicalHigh = distances.map(r => Math.pow(r_ref / r, 4)); // r^(-4) typical high
    const haleBopp = distances.map(r => Math.pow(r_ref / r, 4.5)); // r^(-4.5) Hale-Bopp, highly active phase
    const atlasNi = distances.map(r => Math.pow(r_ref / r, 8.43)); // 3I/ATLAS Ni (arXiv:2508.18382)
    const atlasCN = distances.map(r => Math.pow(r_ref / r, 9.38)); // 3I/ATLAS CN (arXiv:2508.18382)

    return {
      labels: distances.map(d => d.toFixed(2)),
      datasets: [
        {
          label: 'Typical Comet (r⁻²)',
          data: typicalLow,
          borderColor: '#6b7280', // gray
          backgroundColor: '#6b7280',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.4,
        },
        {
          label: "2I/Borisov (r⁻²·²) 🌟",
          data: borisov,
          borderColor: '#8b5cf6', // purple (interstellar)
          backgroundColor: '#8b5cf6',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.4,
          borderDash: [3, 3],
        },
        {
          label: "1P/Halley (r⁻³·⁵)",
          data: halley,
          borderColor: '#3b82f6', // blue
          backgroundColor: '#3b82f6',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.4,
        },
        {
          label: 'Active Comet (r⁻⁴)',
          data: typicalHigh,
          borderColor: chartColors.quinary,
          backgroundColor: chartColors.quinary,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.4,
        },
        {
          label: "C/1995 O1 Hale-Bopp (r⁻⁴·⁵)",
          data: haleBopp,
          borderColor: '#10b981', // green
          backgroundColor: '#10b981',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.4,
        },
        {
          label: '3I/ATLAS Ni I (r⁻⁸·⁴³) ⚠️',
          data: atlasNi,
          borderColor: chartColors.tertiary,
          backgroundColor: chartColors.tertiary,
          borderWidth: 4,
          pointRadius: 0,
          pointHoverRadius: 6,
          tension: 0.4,
          borderDash: [10, 5],
        },
        {
          label: '3I/ATLAS CN (r⁻⁹·³⁸) 🔥',
          data: atlasCN,
          borderColor: chartColors.quaternary,
          backgroundColor: chartColors.quaternary,
          borderWidth: 4,
          pointRadius: 0,
          pointHoverRadius: 6,
          tension: 0.4,
          borderDash: [5, 5],
        },
      ],
    };
  }, []);

  const options: ChartOptions<'line'> = useMemo(() => {
    const textColors = getTextColors();
    const bgColors = getBackgroundColors();
    const borderColors = getBorderColors();

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: textColors.secondary,
            font: {
              size: 13,
            },
            usePointStyle: true,
            padding: 15,
          },
        },
        title: {
          display: true,
          text: 'Gas Production vs Distance from Sun',
          color: textColors.heading,
          font: {
            size: 16,
            weight: 'bold',
          },
          padding: {
            bottom: 20,
          },
        },
        tooltip: {
          backgroundColor: bgColors.tertiary,
          titleColor: textColors.primary,
          bodyColor: textColors.secondary,
          borderColor: borderColors.secondary,
          borderWidth: 1,
          callbacks: {
            title: (context) => {
              return `Distance: ${context[0].label} AU from Sun`;
            },
            label: (context) => {
              const value = context.parsed.y;
              return `${context.dataset.label}: ${value.toFixed(2)}x relative`;
            },
            afterBody: () => {
              return '\n(All curves normalized to 1.0 at 2.0 AU)';
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Heliocentric Distance (AU) →',
            color: textColors.secondary,
            font: {
              size: 13,
              weight: 'bold',
            },
          },
          reverse: true, // Far distances on left, perihelion on right
          ticks: {
            color: textColors.tertiary,
            callback: function(value, index) {
              // Show every 5th tick for readability
              if (index % 5 === 0) {
                return this.getLabelForValue(value as number);
              }
              return '';
            },
          },
          grid: {
            color: borderColors.primary,
          },
        },
        y: {
          type: 'logarithmic',
          title: {
            display: true,
            text: 'Gas Production Rate (relative to 2.0 AU) →',
            color: textColors.secondary,
            font: {
              size: 13,
              weight: 'bold',
            },
          },
          ticks: {
            color: textColors.tertiary,
            callback: function(value) {
              // Format log scale nicely
              const val = value as number;
              if (val >= 1) {
                return `${val.toFixed(0)}x`;
              } else if (val >= 0.1) {
                return `${val.toFixed(1)}x`;
              } else {
                return `${val.toFixed(2)}x`;
              }
            },
          },
          grid: {
            color: borderColors.primary,
          },
        },
      },
    };
  }, []);

  return (
    <div id="activity-scaling" className={`min-h-[500px] bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-primary)] ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-[var(--color-text-heading)] mb-2 flex items-center gap-2">
          📈 Extreme Activity Scaling Anomaly
        </h3>
        <p className="text-[var(--color-text-tertiary)] text-sm">
          How gas production changes with distance - 3I/ATLAS is breaking all the rules
        </p>
      </div>

      {/* Explanation Callout */}
      <div className="bg-red-500/15 border-l-4 border-red-500 rounded-r-lg p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🚨</div>
          <div>
            <h4 className="text-lg font-bold text-red-400 mb-2">
              PHYSICS ANOMALY: Wildly Steep Activity Curve
            </h4>
            <div className="text-[var(--color-text-secondary)] space-y-2">
              <p>
                <strong className="text-[var(--color-text-primary)]">Normal comets:</strong>{' '}
                Gas production scales as r<sub>h</sub><sup>-2</sup> to r<sub>h</sub><sup>-4</sup>
                {' '}(gets 4-16x stronger when distance halves)
              </p>
              <p>
                <strong className="text-orange-400">3I/ATLAS:</strong>{' '}
                Q(Ni) ∝ r<sub>h</sub><sup>-8.43±0.79</sup>, Q(CN) ∝ r<sub>h</sub><sup>-9.38±1.2</sup>
                {' '}(gets 300-600x stronger when distance halves!)
              </p>
              <p className="text-sm mt-3 text-[var(--color-text-tertiary)]">
                <strong>What this means:</strong> The comet started releasing gas MUCH farther from the Sun
                than any normal comet. This suggests it contains exotic volatile ices or has unusual
                surface properties from its interstellar origin.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ExtensionSafeChartContainer className="h-96 mb-6" aria-label="Activity scaling comparison chart">
        <Line ref={chartRef} data={chartData} options={options} />
      </ExtensionSafeChartContainer>

      {/* Interpretation Guide */}
      <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6">
        <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          🧠 What Does This Chart Mean?
          <InfoTooltip content="This chart shows how unusual 3I/ATLAS's behavior is compared to known comets" />
        </h4>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="text-xl">📊</div>
            <div>
              <span className="font-semibold text-[var(--color-text-primary)]">Reading the Chart:</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                X-axis: distance from Sun (right = close, left = far). Y-axis: how much gas is being
                released (log scale). Higher curves = more extreme sensitivity to solar heating. Compare
                3I/ATLAS to famous comets we've studied!
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-xl">⚪</div>
            <div>
              <span className="font-semibold text-gray-400">Gray (r⁻²):</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                Typical comet baseline - gentle increase as it gets closer to the Sun
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-xl">🟣</div>
            <div>
              <span className="font-semibold text-purple-400">Purple (2I/Borisov, r⁻²·²) 🌟:</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                The FIRST confirmed interstellar comet (2019). Shows shallow activity scaling - behaved like
                typical comets from our solar system despite coming from another star system!
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-xl">🔵</div>
            <div>
              <span className="font-semibold text-blue-400">Blue (1P/Halley, r⁻³·⁵):</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                Famous periodic comet visible from Earth every 76 years. Moderately active scaling
                typical of well-studied short-period comets.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-xl">🟡</div>
            <div>
              <span className="font-semibold text-[var(--color-chart-quinary)]">Orange (r⁻⁴):</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                Very active comet range - strong response to solar heating, upper limit of normal behavior
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-xl">🟢</div>
            <div>
              <span className="font-semibold text-green-500">Green (Hale-Bopp, r⁻⁴·⁵):</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                "Great Comet of 1997" - one of the brightest comets of the 20th century. Extremely active
                during its approach phase, but notice 3I/ATLAS is STILL TWICE as steep!
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-xl">🔴</div>
            <div>
              <span className="font-semibold text-[var(--color-chart-tertiary)]">Red (3I/ATLAS Ni, r⁻⁸·⁴³) ⚠️:</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                EXTREME sensitivity - shoots up dramatically as it approaches the Sun. This has NEVER
                been seen before in any comet!
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-xl">🟠</div>
            <div>
              <span className="font-semibold text-[var(--color-chart-quaternary)]">Orange-Red (3I/ATLAS CN, r⁻⁹·³⁸) 🔥:</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                WILDLY EXTREME - even steeper than nickel! Completely unprecedented in cometary science.
                Off the charts compared to anything we've ever observed.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 mt-4 pt-4 border-t border-[var(--color-border-primary)]">
            <div className="text-xl">💡</div>
            <div>
              <span className="font-semibold text-[var(--color-status-warning)]">Key Insight:</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                The steep curves mean 3I/ATLAS started outgassing at distances where normal comets are
                completely inactive. This suggests it contains super-volatile ices (CO, CO₂, N₂) that
                sublime at much colder temperatures than water ice. This composition is consistent with
                formation in a cold, distant stellar nursery.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Citations */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border-primary)]">
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
          📚 Data Sources & References:
        </p>
        <div className="text-xs text-[var(--color-text-tertiary)] space-y-1">
          <div>
            <strong>3I/ATLAS:</strong>{' '}
            <InlineCitation id="atlas-vlt-spectroscopy" style="short" /> - VLT/UVES spectroscopic observations.
            Q(Ni) ∝ r<sub>h</sub><sup>-8.43±0.79</sup>, Q(CN) ∝ r<sub>h</sub><sup>-9.38±1.2</sup>
          </div>
          <div>
            <strong>1P/Halley:</strong>{' '}
            <InlineCitation id="halley-fink-combi-1994" style="short" /> - CN production r<sub>h</sub><sup>-3.7±0.8</sup>,
            dust r<sub>h</sub><sup>-3.0±0.7</sup>
          </div>
          <div>
            <strong>C/1995 O1 Hale-Bopp:</strong>{' '}
            <InlineCitation id="hale-bopp-weaver-1997" style="short" /> - Heliocentric evolution
            showing r<sub>h</sub><sup>-3.5</sup> to r<sub>h</sub><sup>-4.5</sup> during approach phase
          </div>
          <div>
            <strong>2I/Borisov:</strong>{' '}
            <InlineCitation id="borisov-fitzsimmons-2019" style="short" />,{' '}
            <InlineCitation id="borisov-cordiner-2020" style="short" /> - Shallow distance dependence
            (r<sub>h</sub><sup>-2</sup> to r<sub>h</sub><sup>-2.5</sup>), typical of water-driven outgassing
          </div>
        </div>
      </div>
    </div>
  );
}
