import Image from 'next/image';
import Link from 'next/link';
import type { GenericQuickMetric, GenericQuickRow as GenericQuickRowData, GenericScope } from '@/lib/server/generic-market-scanner';
import { PercentageMiniBar } from './percentage-mini-bar';

type MarketsQuickRowProps = {
  row: GenericQuickRowData;
};

function formatFixtureDate(value: string) {
  const date = new Date(value);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${weekdays[date.getDay()]} ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${hours}:${minutes}`;
}

function formatPercentage(metric: GenericQuickMetric | null) {
  if (!metric || metric.sample === 0 || metric.percentage === null || !Number.isFinite(metric.percentage)) {
    return '-';
  }
  return `${Math.round(metric.percentage)}% (${metric.hits}/${metric.sample})`;
}

function scopeLabel(scope: GenericScope) {
  if (scope === 'home') return 'home matches';
  if (scope === 'away') return 'away matches';
  return 'all matches';
}

function TeamLogo({ alt, src }: { alt: string; src: string | null }) {
  if (!src) {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] text-[10px] font-bold text-[var(--app-text-dim)]">
        {alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return <Image alt={alt} className="h-7 w-7 shrink-0 rounded object-contain" height={28} src={src} width={28} />;
}

function FormStrip({ strip }: { strip: boolean[] | null }) {
  if (!strip || strip.length === 0) return null;
  return (
    <div className="flex items-center gap-0.5" title="Last 5 matches (oldest → newest)">
      {strip.map((hit, index) => (
        <div
          key={index}
          className={`h-2.5 w-2.5 rounded-sm ${hit ? 'bg-emerald-500' : 'bg-red-500'}`}
        />
      ))}
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak < 3) return null;
  return (
    <span className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
      🔥{streak}
    </span>
  );
}

export function MarketsQuickRow({ row }: MarketsQuickRowProps) {
  return (
    <article className="border-b border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 last:border-b-0 hover:bg-[var(--app-panel-muted)]">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1.1fr)_88px_minmax(120px,0.9fr)]">
        <Link className="flex min-w-0 items-center gap-2 underline-offset-2 hover:underline" href={row.detailedHref}>
          <TeamLogo alt={row.teamName} src={row.teamLogoUrl} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-[var(--app-text)]">{row.teamName}</span>
              <StreakBadge streak={row.metric.currentStreak} />
            </div>
            <div className="truncate text-[11px] text-[var(--app-text-dim)]">{row.marketLabel}</div>
          </div>
        </Link>

        <div className="text-right text-sm font-semibold text-[var(--app-text)]">
          {row.metric.sample > 0 ? `${row.metric.hits}/${row.metric.sample}` : '-'}
        </div>

        <div className="flex flex-col gap-1">
          <PercentageMiniBar metric={row.metric} />
          <FormStrip strip={row.metric.formStrip} />
        </div>
      </div>

      <div className="mt-2 grid gap-2 text-xs text-[var(--app-text-dim)]">
        {row.nextFixture ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {row.nextFixture.isHome ? 'Home vs' : 'Away vs'}{' '}
              <span className="font-semibold text-[var(--app-text-soft)]">{row.nextFixture.opponentName}</span>
            </span>
            <span>{formatFixtureDate(row.nextFixture.date)}</span>
            {row.fixtureContextMismatch ? (
              <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                Context mismatch
              </span>
            ) : null}
          </div>
        ) : (
          <div>No upcoming fixture</div>
        )}

        <div>
          {row.nextFixture ? (
            <>
              {row.nextFixture.opponentName} in {scopeLabel(row.opponentSupportScope ?? row.scope)}:{' '}
              <span className="font-semibold text-[var(--app-text-soft)]">{formatPercentage(row.opponentSupport)}</span>
            </>
          ) : (
            'Opponent support unavailable'
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-7 items-center justify-center rounded border border-[var(--app-border)] px-2 text-[11px] font-semibold text-[var(--app-text-soft)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
            href={row.detailedHref}
          >
            Detailed
          </Link>
          {row.comparisonHref ? (
            <Link
              className="inline-flex h-7 items-center justify-center rounded border border-[var(--app-accent)] bg-[var(--app-accent-soft)] px-2 text-[11px] font-semibold text-[var(--app-accent)] hover:bg-[var(--app-accent)] hover:text-white"
              href={row.comparisonHref}
            >
              Analyze
            </Link>
          ) : (
            <span className="inline-flex h-7 items-center justify-center rounded border border-[var(--app-border)] px-2 text-[11px] font-semibold text-[var(--app-text-dim)]">
              Analyze
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
