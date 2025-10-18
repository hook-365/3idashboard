'use client';

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  context?: string;
  color?: 'purple' | 'red' | 'orange' | 'blue' | 'green' | 'yellow' | 'cyan' | 'slate';
  className?: string;
}

export default function StatCard({
  icon,
  value,
  label,
  context,
  color = 'blue',
  className = ''
}: StatCardProps) {
  const colorMap = {
    purple: { gradient: 'from-purple-600/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    red: { gradient: 'from-red-600/20', text: 'text-red-400', border: 'border-red-500/30' },
    orange: { gradient: 'from-orange-600/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    blue: { gradient: 'from-blue-600/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    green: { gradient: 'from-green-600/20', text: 'text-green-400', border: 'border-green-500/30' },
    yellow: { gradient: 'from-yellow-600/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    cyan: { gradient: 'from-cyan-600/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    slate: { gradient: 'from-slate-600/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  };

  const colors = colorMap[color];

  return (
    <div className={`bg-gradient-to-br ${colors.gradient} to-[var(--color-bg-tertiary)] rounded-lg p-5 text-center border ${colors.border} hover:scale-105 transition-transform ${className}`}>
      <div className="text-4xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold ${colors.text} mb-1`}>
        {value}
      </div>
      <div className="text-sm text-[var(--color-text-secondary)]">{label}</div>
      {context && (
        <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
          {context}
        </div>
      )}
    </div>
  );
}
