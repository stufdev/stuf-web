import Image from 'next/image';
import Link from 'next/link';
import type { OffsideQuickMetric, OffsideQuickRow as OffsideQuickRowData, OffsideScope } from '@/lib/server/offside-market-scanner';
import { PercentageMiniBar } from './percentage-mini-bar';

type OffsidesQuickRowProps = {
  row: OffsideQuickRowData;
};

function formatFixtureDate(value: string) {
  const date = new Date(value);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${weekdays[date.getDay()]} ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${hours}:${minutes}`;
}

function formatPercentage(metric: OffsideQuickMetric | null) {
  if (!metric || metric.sample === 0 || metric.percentage === null || !Number.isFinite(metric.percentage)) {
    return '-';
  }

  return `${Math.round(metric.percentage)}% (${metric.hits}/${metric.sample})`;
}

function scopeLabel(scope: OffsideScope) {
  if (scope === 'home') {
    return 'home matches';
  }

  if (scope === 'away') {
    return 'away matches';
  }

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

export function OffsidesQuickRow({ row }: OffsidesQuickRowProps) {
  return (
    <article className="border-b border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 last:border-b-0 hover:bg-[var(--app-panel-muted)]">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1.1fr)_88px_minmax(120px,0.9fr)]">
        <Link className="flex min-w-0 items-center gap-2 underline-offset-2 hover:underline" href={row.detailedHref}>
          <TeamLogo alt={row.teamName} src={row.teamLogoUrl} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--app-text)]">{row.teamName}</div>
            <div className="truncate text-[11px] text-[var(--app-text-dim)]">{row.marketLabel}</div>
          </div>
        </Link>

        <div className="text-right text-sm font-semibold text-[var(--app-text)]">
          {row.metric.sample > 0 ? `${row.metric.hits}/${row.metric.sample}` : '-'}
        </div>

        <PercentageMiniBar metric={row.metric} />
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

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_76px]">
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
          <span className="inline-flex h-6 items-center justify-center rounded border border-[var(--app-border)] px-2 text-[11px] font-semibold text-[var(--app-text-dim)]">
            Odds TBD
          </span>
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
