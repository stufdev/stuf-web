import type { GoalQuickMetric } from '@/lib/server/goal-market-scanner';

type PercentageMiniBarProps = {
  metric: GoalQuickMetric;
};

export function PercentageMiniBar({ metric }: PercentageMiniBarProps) {
  const percentage = metric.sample > 0 && metric.percentage !== null
    ? Math.min(Math.max(metric.percentage, 0), 100)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[var(--app-text)]">{metric.sample > 0 ? `${Math.round(percentage)}%` : '-'}</span>
        <span className="text-[var(--app-text-dim)]">{metric.sample > 0 ? `${metric.hits}/${metric.sample}` : '-'}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-[var(--app-panel-muted)]">
        <div className="h-full bg-sky-400" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

