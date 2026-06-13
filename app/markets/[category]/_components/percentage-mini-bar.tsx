import type { GenericQuickMetric } from '@/lib/server/generic-market-scanner';

type PercentageMiniBarProps = {
  metric: GenericQuickMetric;
};

function percentageColor(pct: number): { text: string; bar: string } {
  if (pct >= 70) return { text: 'text-emerald-400', bar: 'bg-emerald-400' };
  if (pct >= 55) return { text: 'text-amber-400', bar: 'bg-amber-400' };
  return { text: 'text-[var(--app-text)]', bar: 'bg-sky-400' };
}

export function PercentageMiniBar({ metric }: PercentageMiniBarProps) {
  const percentage = metric.sample > 0 && metric.percentage !== null
    ? Math.min(Math.max(metric.percentage, 0), 100)
    : 0;

  const colors = percentageColor(percentage);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`font-semibold ${colors.text}`}>{metric.sample > 0 ? `${Math.round(percentage)}%` : '-'}</span>
        <span className="text-[var(--app-text-dim)]">{metric.sample > 0 ? `${metric.hits}/${metric.sample}` : '-'}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-[var(--app-panel-muted)]">
        <div className={`h-full ${colors.bar}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
