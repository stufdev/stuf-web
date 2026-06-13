import Image from 'next/image';
import Link from 'next/link';
import type {
  GenericDetailResult,
  GenericFilterOptions,
  GenericFilters,
  GenericMatchRow,
  GenericScope,
  GenericStatSummary,
  GenericTeamPanel,
} from '@/lib/server/generic-market-scanner';

type MarketsDetailedViewProps = {
  categoryLabel: string;
  filters: GenericFilters;
  options: GenericFilterOptions;
  result: GenericDetailResult;
};

const SCOPE_TITLES: Record<GenericScope, string> = {
  overall: 'All Matches',
  home: 'Home Matches',
  away: 'Away Matches',
};

function uniqueLeagueOptions(options: GenericFilterOptions) {
  const seen = new Set<number>();
  return options.leagueSeasons.filter((item) => {
    if (seen.has(item.leagueId)) return false;
    seen.add(item.leagueId);
    return true;
  });
}

function seasonsForLeague(options: GenericFilterOptions, leagueId: number) {
  return options.leagueSeasons.filter((item) => item.leagueId === leagueId).map((item) => item.season);
}

function formatMatchDate(value: string) {
  const date = new Date(value);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function TeamLogo({ alt, src }: { alt: string; src: string | null }) {
  if (!src) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] text-xs font-bold text-[var(--app-text-dim)]">
        {alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return <Image alt={alt} className="h-9 w-9 shrink-0 rounded object-contain" height={36} src={src} width={36} />;
}

function StatSummaryCell({ scope, summary }: { scope: GenericScope; summary: GenericStatSummary | null }) {
  return (
    <div className="rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{SCOPE_TITLES[scope]}</div>
      {summary === null ? (
        <div className="mt-2 text-sm text-[var(--app-text-dim)]">—</div>
      ) : (
        <>
          <div className="mt-1 text-xl font-semibold text-[var(--app-text)]">{Math.round(summary.percentage)}%</div>
          <div className="text-xs text-[var(--app-text-dim)]">
            {summary.hits}/{summary.sample} · streak {summary.currentStreak}
          </div>
          <div className="mt-1 text-[11px] text-[var(--app-text-dim)]">
            L5: {summary.last5Hits ?? '—'}/{summary.last5Sample ?? '—'} · L10: {summary.last10Hits ?? '—'}/{summary.last10Sample ?? '—'}
          </div>
        </>
      )}
    </div>
  );
}

function EvidenceTable({ rows, title }: { rows: GenericMatchRow[]; title: string }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded border border-[var(--app-border)]">
      <div className="border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2 text-xs font-semibold text-[var(--app-text)]">
        {title} · {rows.length} matches
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--app-border)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--app-text-dim)]">
            <th className="px-3 py-2 font-semibold">Date</th>
            <th className="px-3 py-2 font-semibold">Match</th>
            <th className="px-3 py-2 text-center font-semibold">Values</th>
            <th className="px-3 py-2 text-center font-semibold">Hit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={`border-b border-[var(--app-border)] last:border-b-0 ${row.result ? 'bg-emerald-500/10' : 'bg-red-500/10'}`} key={`${row.fixtureId}`}>
              <td className="px-3 py-2 text-[var(--app-text-dim)]">{formatMatchDate(row.date)}</td>
              <td className="px-3 py-2 text-[var(--app-text)]">
                {row.homeTeamName} <span className="text-[var(--app-text-dim)]">vs</span> {row.awayTeamName}
              </td>
              <td className="px-3 py-2 text-center font-semibold text-[var(--app-text)]">{row.scoreLabel ?? '—'}</td>
              <td className="px-3 py-2 text-center">
                {row.result ? (
                  <span className="font-bold text-emerald-500">✓</span>
                ) : (
                  <span className="font-bold text-rose-500">✗</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamPanel({ panel, viewMode }: { panel: GenericTeamPanel; viewMode: GenericFilters['viewMode'] }) {
  const evidenceScopes: GenericScope[] = viewMode === 'homeaway' ? ['home', 'away'] : ['overall'];

  return (
    <article className="rounded border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo alt={panel.teamName} src={panel.teamLogoUrl} />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-[var(--app-text)]">{panel.teamName}</h2>
            <div className="truncate text-xs text-[var(--app-text-dim)]">
              {panel.leagueName} · {panel.season} · {panel.marketLabel}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!panel.evidenceLoaded && (
            <Link
              className="inline-flex h-8 items-center justify-center rounded border border-[var(--app-border)] px-3 text-xs font-semibold text-[var(--app-text-soft)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
              href={panel.evidenceHref}
            >
              Evidence
            </Link>
          )}
          {panel.nextFixture && (
            <Link
              className="inline-flex h-8 items-center justify-center rounded border border-[var(--app-accent)] bg-[var(--app-accent-soft)] px-3 text-xs font-semibold text-[var(--app-accent)] hover:bg-[var(--app-accent)] hover:text-white"
              href={`/comparison?fixtureId=${panel.nextFixture.fixtureId}&marketKey=${panel.marketKey}&source=markets-detailed`}
            >
              Analyze next
            </Link>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <StatSummaryCell scope="overall" summary={panel.stats.overall} />
        <StatSummaryCell scope="home" summary={panel.stats.home} />
        <StatSummaryCell scope="away" summary={panel.stats.away} />
      </div>

      {panel.nextFixture && (
        <div className="mt-3 text-xs text-[var(--app-text-dim)]">
          Next: {panel.nextFixture.isHome ? 'Home vs' : 'Away vs'}{' '}
          <span className="font-semibold text-[var(--app-text-soft)]">{panel.nextFixture.opponentName}</span> ·{' '}
          {formatMatchDate(panel.nextFixture.date)}
        </div>
      )}

      {panel.evidenceLoaded && (
        <div className="mt-3 grid gap-3">
          {evidenceScopes.map((scope) => (
            <EvidenceTable key={scope} rows={panel.matchRows[scope]} title={SCOPE_TITLES[scope]} />
          ))}
        </div>
      )}
    </article>
  );
}

export function MarketsDetailedView({ categoryLabel, filters, options, result }: MarketsDetailedViewProps) {
  const leagueOptions = uniqueLeagueOptions(options);
  const seasonOptions = seasonsForLeague(options, filters.leagueId);

  return (
    <>
      <section className="px-4 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">{result.marketLabel}</h1>
            <div className="mt-1 text-sm text-[var(--app-text-dim)]">
              {categoryLabel} team profiles with per-match evidence. Search a team to load its evidence table.
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              className="rounded border border-[var(--app-border)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
              href={`/markets/${filters.category}?leagueId=${filters.leagueId}&season=${filters.season}&marketKey=${filters.marketKey}`}
            >
              Quick board
            </Link>
            <div className="rounded border border-[var(--app-border)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
              {result.panels.length} teams
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-4">
        <form className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_110px_minmax(260px,1.4fr)_minmax(180px,1fr)_140px_120px]" method="get">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">League</span>
            <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" defaultValue={filters.leagueId} name="leagueId">
              {leagueOptions.map((league) => <option key={league.leagueId} value={league.leagueId}>{league.leagueName}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Season</span>
            <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" defaultValue={filters.season} name="season">
              {seasonOptions.map((season) => <option key={season} value={season}>{season}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Market</span>
            <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" defaultValue={filters.marketKey} name="marketKey">
              {options.markets.map((market) => <option key={market.key} value={market.key}>{market.label}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Team Search</span>
            <input className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" defaultValue={filters.teamSearch} name="teamSearch" placeholder="Arsenal" type="search" />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Evidence scope</span>
            <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" defaultValue={filters.viewMode} name="viewMode">
              <option value="all">All matches</option>
              <option value="homeaway">Home / Away</option>
            </select>
          </label>

          <div className="flex flex-col justify-end">
            <button className="h-10 rounded border border-[var(--app-accent)] bg-[var(--app-accent)] px-3 text-sm font-semibold text-white hover:opacity-90" type="submit">
              Apply
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 px-4 py-4">
        {!result.marketAvailable ? (
          <div className="border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel)] p-4 text-sm text-[var(--app-text-dim)]">
            This market is not active in market_definitions yet: {result.marketKey}
          </div>
        ) : null}

        {result.panels.length === 0 ? (
          <div className="border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel)] px-4 py-10 text-center">
            <div className="text-sm font-semibold text-[var(--app-text)]">No team profiles for these filters.</div>
            <div className="mt-1 text-xs text-[var(--app-text-dim)]">
              The Market Serving Layer has no rows for {result.marketKey} in this league/season.
            </div>
          </div>
        ) : (
          result.panels.map((panel) => (
            <TeamPanel key={panel.teamId} panel={panel} viewMode={filters.viewMode} />
          ))
        )}
      </section>
    </>
  );
}
