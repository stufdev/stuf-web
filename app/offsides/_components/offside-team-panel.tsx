'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { OffsideStatSummary, OffsideTeamPanel, OffsideViewMode } from '@/lib/server/offside-market-scanner';
import { OffsideMatchTable } from './offside-match-table';
import { OffsidePercentageBar } from './offside-percentage-bar';

type OffsideTeamPanelProps = {
  panel: OffsideTeamPanel;
  viewMode: OffsideViewMode;
  isEvidenceUpdating?: boolean;
  isUpdating?: boolean;
  onBackToSummary?: () => void;
  showBackToSummary?: boolean;
};

function formatNextFixtureDate(value: string) {
  const date = new Date(value);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${weekdays[date.getDay()]} ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${hours}:${minutes}`;
}

function TeamLogo({ alt, src }: { alt: string; src: string | null }) {
  if (!src) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] text-xs font-bold text-[var(--app-text-dim)]">
        {alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return <Image alt={alt} className="h-11 w-11 shrink-0 rounded object-contain" height={44} src={src} width={44} />;
}

function formatPercentage(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '-';
  }
  return `${Math.round(value)}%`;
}

function formatSample(stat: OffsideStatSummary | null) {
  if (!stat || stat.sample === 0) {
    return '-';
  }
  return `${stat.hits}/${stat.sample}`;
}

function SplitContextBadge({ label, stat }: { label: string; stat: OffsideStatSummary | null }) {
  const hitPercentage = stat && stat.sample > 0 ? Math.min(Math.max(stat.percentage, 0), 100) : 0;
  const missPercentage = stat && stat.sample > 0 ? 100 - hitPercentage : 0;

  return (
    <div className="rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">
        {stat && stat.sample > 0 ? `${formatPercentage(stat.percentage)} · ${formatSample(stat)}` : '-'}
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded bg-[var(--app-panel)]">
        <div className="bg-emerald-500" style={{ width: `${hitPercentage}%` }} />
        <div className="bg-red-500/80" style={{ width: `${missPercentage}%` }} />
      </div>
    </div>
  );
}

function ContextSplit({ panel }: { panel: OffsideTeamPanel }) {
  return (
    <div className="rounded border border-dashed border-[var(--app-border)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Context split</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SplitContextBadge label="Home" stat={panel.stats.home} />
        <SplitContextBadge label="Away" stat={panel.stats.away} />
      </div>
    </div>
  );
}

function NextFixtureBlock({ panel }: { panel: OffsideTeamPanel }) {
  if (!panel.nextFixture) {
    return (
      <div className="rounded border border-[var(--app-border)] px-3 py-2 text-sm text-[var(--app-text-dim)]">
        No upcoming fixture
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Next match</div>
        <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">
          {panel.nextFixture.isHome ? 'Home vs' : 'Away vs'} {panel.nextFixture.opponentName}
        </div>
        <div className="mt-0.5 text-xs text-[var(--app-text-dim)]">{formatNextFixtureDate(panel.nextFixture.date)}</div>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 items-center rounded border border-[var(--app-border)] px-2 text-xs font-semibold text-[var(--app-text-dim)]">
          Odds TBD
        </span>
        <Link
          className="inline-flex h-8 items-center justify-center rounded border border-[var(--app-accent)] bg-[var(--app-accent-soft)] px-3 text-xs font-semibold text-[var(--app-accent)] hover:bg-[var(--app-accent)] hover:text-white"
          href={`/comparison?fixtureId=${panel.nextFixture.fixtureId}&marketKey=${panel.marketKey}&source=offsides`}
        >
          Analyze Fixture
        </Link>
      </div>
    </div>
  );
}

export function OffsideTeamPanel({
  panel,
  viewMode,
  isEvidenceUpdating = false,
  isUpdating = false,
  onBackToSummary,
  showBackToSummary = false,
}: OffsideTeamPanelProps) {
  return (
    <section className="rounded border border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="grid gap-4 border-b border-[var(--app-border)] p-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo alt={panel.teamName} src={panel.teamLogoUrl} />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-[var(--app-text)]">{panel.teamName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--app-text-dim)]">
              {panel.leagueLogoUrl ? (
                <Image alt="" className="h-4 w-4 object-contain" height={16} src={panel.leagueLogoUrl} width={16} />
              ) : null}
              <span>{panel.leagueName}</span>
              <span>{panel.season}</span>
            </div>
            <div className="mt-2 text-sm font-medium text-[var(--app-text-soft)]">{panel.marketLabel}</div>
            {showBackToSummary ? (
              onBackToSummary ? (
                <button
                  className="mt-2 inline-flex text-xs font-semibold text-[var(--app-accent)] hover:underline disabled:cursor-wait disabled:opacity-60"
                  disabled={isUpdating}
                  onClick={onBackToSummary}
                  type="button"
                >
                  Back to league summary
                </button>
              ) : (
                <Link className="mt-2 inline-flex text-xs font-semibold text-[var(--app-accent)] hover:underline" href={panel.summaryHref}>
                  Back to league summary
                </Link>
              )
            ) : null}
          </div>
        </div>

        <NextFixtureBlock panel={panel} />
      </div>

      <div className="grid gap-4 p-4">
        {viewMode === 'all' ? (
          <>
            <OffsidePercentageBar stat={panel.stats.overall} title="Overall" />
            <ContextSplit panel={panel} />
            <OffsideMatchTable
              isLoading={isEvidenceUpdating}
              rows={panel.matchRows.overall}
              teamId={panel.teamId}
              title="Overall"
            />
          </>
        ) : (
          <>
            <OffsidePercentageBar stat={panel.stats.overall} title="Overall summary" variant="compact" />
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="grid gap-3">
                <OffsidePercentageBar stat={panel.stats.home} title="Home" />
                <OffsideMatchTable
                  isLoading={isEvidenceUpdating}
                  rows={panel.matchRows.home}
                  teamId={panel.teamId}
                  title="Home"
                />
              </div>
              <div className="grid gap-3">
                <OffsidePercentageBar stat={panel.stats.away} title="Away" />
                <OffsideMatchTable
                  isLoading={isEvidenceUpdating}
                  rows={panel.matchRows.away}
                  teamId={panel.teamId}
                  title="Away"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
