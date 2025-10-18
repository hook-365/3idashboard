'use client';

interface MagnitudeScaleProps {
  currentMagnitude?: number;
}

export default function MagnitudeScale({ currentMagnitude }: MagnitudeScaleProps) {
  const magnitude = currentMagnitude || 8.5;

  // Calculate position on scale (0 to 15 for better visual range)
  const scaleMin = 0;
  const scaleMax = 15;
  const position = ((magnitude - scaleMin) / (scaleMax - scaleMin)) * 100;

  // Key magnitude values and their positions
  const markers = [
    { value: 0, label: 'Brightest', position: 0 },
    { value: 6, label: 'Naked Eye Limit', position: 40 },
    { value: 10, label: 'Binoculars', position: 66.67 },
    { value: 12, label: 'Telescope', position: 80 },
    { value: 15, label: 'Large Scope', position: 100 }
  ];

  return (
    <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6 mb-6">
      <h4 className="text-sm font-semibold text-[var(--color-chart-primary)] mb-6 flex items-center gap-2">
        <span>📊</span> Brightness Scale
      </h4>

      <div className="space-y-6">
        {/* Visual scale with graduated tick marks */}
        <div className="relative pt-10 pb-20">
          {/* Current position marker - on top */}
          <div
            className="absolute -translate-x-1/2 z-10"
            style={{ left: `${Math.min(Math.max(position, 0), 100)}%`, top: '0px' }}
          >
            <div className="relative">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className="bg-[var(--color-chart-primary)] text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg">
                  ☄️ {magnitude.toFixed(1)}
                </div>
              </div>
              <div className="w-5 h-5 bg-[var(--color-chart-primary)] border-3 border-white rounded-full shadow-lg" />
            </div>
          </div>

          {/* Scale bar with gradient */}
          <div className="relative w-full h-3 bg-gradient-to-r from-yellow-300 via-orange-300 to-slate-500 rounded-full shadow-inner" />

          {/* Tick marks and labels - properly aligned */}
          <div className="relative w-full mt-2">
            {markers.map((marker) => (
              <div
                key={marker.value}
                className="absolute top-0 flex flex-col items-center"
                style={{
                  left: marker.position === 0 ? '0%' : marker.position === 100 ? '100%' : `${marker.position}%`,
                  transform: marker.position === 0 ? 'translateX(0%)' : marker.position === 100 ? 'translateX(-100%)' : 'translateX(-50%)'
                }}
              >
                <div className="w-0.5 h-4 bg-[var(--color-text-tertiary)]" />
                <div className={`text-xs font-semibold text-[var(--color-text-primary)] mt-2 ${marker.position === 0 ? 'text-left' : marker.position === 100 ? 'text-right' : 'text-center'}`}>
                  {marker.value}
                </div>
                <div className={`text-[10px] text-[var(--color-text-tertiary)] mt-0.5 whitespace-nowrap ${marker.position === 0 ? 'text-left' : marker.position === 100 ? 'text-right' : 'text-center'}`}>
                  {marker.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment guide - aligned with scale values */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-start gap-2 p-3 bg-[var(--color-bg-secondary)] rounded-lg">
            <span className="text-xl flex-shrink-0">👁️</span>
            <div>
              <div className="font-bold text-[var(--color-text-primary)] mb-1">Naked Eye</div>
              <div className="text-[var(--color-text-tertiary)] leading-relaxed">
                Mag ≤6<br/>
                Dark skies only
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-[var(--color-bg-secondary)] rounded-lg">
            <span className="text-xl flex-shrink-0">🔭</span>
            <div>
              <div className="font-bold text-[var(--color-text-primary)] mb-1">Binoculars</div>
              <div className="text-[var(--color-text-tertiary)] leading-relaxed">
                Mag 7-10<br/>
                10x50 recommended
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-[var(--color-bg-secondary)] rounded-lg">
            <span className="text-xl flex-shrink-0">🔬</span>
            <div>
              <div className="font-bold text-[var(--color-text-primary)] mb-1">Telescope</div>
              <div className="text-[var(--color-text-tertiary)] leading-relaxed">
                Mag 10-12<br/>
                6-10 inch
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-[var(--color-bg-secondary)] rounded-lg">
            <span className="text-xl flex-shrink-0">🌌</span>
            <div>
              <div className="font-bold text-[var(--color-text-primary)] mb-1">Large Scope</div>
              <div className="text-[var(--color-text-tertiary)] leading-relaxed">
                Mag &gt;12<br/>
                10+ inch / Photo
              </div>
            </div>
          </div>
        </div>

        {/* Current status */}
        <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-lg">
          <p className="text-sm text-[var(--color-text-primary)]">
            <strong className="text-[var(--color-chart-primary)]">Current: Magnitude {magnitude.toFixed(1)}</strong>
            {magnitude <= 6 && ' - Visible to naked eye in dark skies! No equipment needed.'}
            {magnitude > 6 && magnitude <= 10 && ' - You\'ll need binoculars (10x50) or a small telescope.'}
            {magnitude > 10 && magnitude <= 12 && ' - Requires a 6-10 inch telescope in dark skies.'}
            {magnitude > 12 && ' - Requires a large telescope (10+ inch) or astrophotography. Very challenging!'}
          </p>
        </div>
      </div>
    </div>
  );
}
