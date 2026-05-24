import type { CornerQuickMetric } from '@/lib/server/corner-quick-scanner';

type PercentageMiniBarProps = {
  metric: CornerQuickMetric | null;
  muted?: boolean;
};

function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return `${Math.round(value)}%`;
}

function formatSample(metric: CornerQuickMetric | null) {
  if (!metric || metric.sample === 0) {
    return '-';
  }

  return `${metric.hits}/${metric.sample}`;
}

export function PercentageMiniBar({ metric, muted = false }: PercentageMiniBarProps) {
  const percentage = metric && metric.sample > 0 && metric.percentage !== null
    ? Math.min(Math.max(metric.percentage, 0), 100)
    : 0;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={muted ? 'text-[var(--app-text-dim)]' : 'font-semibold text-[var(--app-text)]'}>
          {formatPercentage(metric?.percentage)}
        </span>
        <span className="text-[var(--app-text-dim)]">{formatSample(metric)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-[var(--app-panel-muted)]">
        <div className={muted ? 'h-full bg-sky-300/60' : 'h-full bg-sky-400'} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
