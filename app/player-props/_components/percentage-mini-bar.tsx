'use client';

type PercentageMiniBarProps = {
  percentage: number | null;
  size?: 'sm' | 'md';
};

function barColor(pct: number): string {
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-yellow-400';
  return 'bg-[var(--app-text-dim)]';
}

export function PercentageMiniBar({ percentage, size = 'sm' }: PercentageMiniBarProps) {
  if (percentage === null) {
    return <span className="text-[var(--app-text-dim)]">—</span>;
  }

  const pct = Math.max(0, Math.min(100, percentage));
  const height = size === 'md' ? 'h-1.5' : 'h-1';

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-8 shrink-0 text-right text-xs font-mono">
        {pct.toFixed(0)}%
      </span>
      <div className={`relative flex-1 ${height} rounded-full bg-[var(--app-border)] min-w-[40px]`}>
        <div
          className={`absolute left-0 top-0 ${height} rounded-full ${barColor(pct)} transition-all duration-200`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
