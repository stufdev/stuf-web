import type { CornerStatSummary } from '@/lib/server/corner-detail-scanner';

type CornerPercentageBarProps = {
  stat: CornerStatSummary | null;
  title: string;
  variant?: 'primary' | 'compact';
};

function formatPercentage(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '-';
  }
  return `${Math.round(value)}%`;
}

function formatSample(stat: CornerStatSummary | null) {
  if (!stat || stat.sample === 0) {
    return '-';
  }
  return `${stat.hits}/${stat.sample}`;
}

export function CornerPercentageBar({ stat, title, variant = 'primary' }: CornerPercentageBarProps) {
  const hitPercentage = stat && stat.sample > 0 ? Math.min(Math.max(stat.percentage, 0), 100) : 0;
  const missPercentage = stat && stat.sample > 0 ? 100 - hitPercentage : 0;
  const isCompact = variant === 'compact';

  return (
    <div className={`rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] ${isCompact ? 'p-2' : 'p-3'}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{title}</div>
        <div className={`${isCompact ? 'text-xs' : 'text-sm'} font-semibold text-[var(--app-text)]`}>
          {stat && stat.sample > 0 ? `${formatPercentage(stat.percentage)} · ${formatSample(stat)}` : '-'}
        </div>
      </div>

      <div className={`flex overflow-hidden rounded bg-[var(--app-panel)] ${isCompact ? 'mt-2 h-2' : 'mt-3 h-3'}`}>
        <div className="bg-emerald-500" style={{ width: `${hitPercentage}%` }} />
        <div className="bg-red-500/80" style={{ width: `${missPercentage}%` }} />
      </div>

      {!isCompact ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-[var(--app-text-dim)]">Current</div>
          <div className="font-semibold text-[var(--app-text)]">{stat && stat.sample > 0 ? stat.currentStreak : '-'}</div>
        </div>
        <div>
          <div className="text-[var(--app-text-dim)]">Last 5</div>
          <div className="font-semibold text-[var(--app-text)]">
            {stat?.last5Sample ? `${stat.last5Hits}/${stat.last5Sample}` : '-'}
          </div>
        </div>
        <div>
          <div className="text-[var(--app-text-dim)]">Last 10</div>
          <div className="font-semibold text-[var(--app-text)]">
            {stat?.last10Sample ? `${stat.last10Hits}/${stat.last10Sample}` : '-'}
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
}
