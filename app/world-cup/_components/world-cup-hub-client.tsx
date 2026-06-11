'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchJson } from '@/lib/fetch-json';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  WorldCupFixture,
  WorldCupPlayerMetric,
  WorldCupPlayerSource,
  WorldCupScope,
  WorldCupStandingsGroup,
  WorldCupStandingRow,
  WorldCupTeamAverage,
  WorldCupTopPlayersResult,
} from '@/lib/server/world-cup';

type WorldCupTab = 'all' | 'fixtures' | 'table' | 'top-players' | 'player-streaks' | 'player-props';
type TeamAverageMetric = 'goals' | 'corners' | 'cards' | 'shots' | 'shots_on_target' | 'fouls' | 'offsides' | 'tackles';

type WorldCupHubClientProps = {
  fixtures: WorldCupFixture[];
  initialTab: WorldCupTab;
  initialTopPlayers: WorldCupTopPlayersResult;
  standings: WorldCupStandingsGroup[];
  teamAverages: WorldCupTeamAverage[];
};

const TABS: Array<{ id: WorldCupTab; label: string }> = [
  { id: 'all', label: 'Overview' },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'table', label: 'Table & Averages' },
  { id: 'top-players', label: 'Top Players' },
  { id: 'player-streaks', label: 'Streaks' },
  { id: 'player-props', label: 'Player Props' },
];

const PLAYER_METRICS: Array<{ id: WorldCupPlayerMetric; label: string }> = [
  { id: 'goals', label: 'Goals' },
  { id: 'assists', label: 'Assists' },
  { id: 'goal_involvements', label: 'G+A' },
  { id: 'shots', label: 'Shots' },
  { id: 'shots_on_target', label: 'On Target' },
  { id: 'cards', label: 'Cards' },
  { id: 'fouls_committed', label: 'Fouls' },
  { id: 'fouls_drawn', label: 'Fouls Won' },
  { id: 'tackles', label: 'Tackles' },
  { id: 'offsides', label: 'Offsides' },
];

const TEAM_AVERAGE_METRICS: Array<{ id: TeamAverageMetric; label: string; value: (row: WorldCupTeamAverage) => number | null }> = [
  { id: 'goals', label: 'Goals', value: (row) => row.avgGoalsFor },
  { id: 'corners', label: 'Corners', value: (row) => row.avgCornersFor },
  { id: 'cards', label: 'Cards', value: (row) => row.avgCardsFor },
  { id: 'shots', label: 'Shots', value: (row) => row.avgTotalShotsFor },
  { id: 'shots_on_target', label: 'On Target', value: (row) => row.avgShotsOnTargetFor },
  { id: 'fouls', label: 'Fouls', value: (row) => row.avgFoulsCommitted },
  { id: 'offsides', label: 'Offsides', value: (row) => row.avgOffsidesFor },
  { id: 'tackles', label: 'Tackles', value: (row) => row.avgTacklesFor },
];

// ── helpers ───────────────────────────────────────────────────────────────────
function updateUrl(params: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  const query = url.searchParams.toString();
  window.history.replaceState(null, '', query ? `${url.pathname}?${query}` : url.pathname);
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('en', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(iso));
const fmtKickoff = (iso: string) =>
  new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const fmtNum = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(d);
const fmtTotal = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
const dateKey = (iso: string) => iso.slice(0, 10);

// ── shared primitives (Linear-grade) ──────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{children}</span>;
}

function MetaStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-sm font-medium text-foreground tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function TeamIdentity({ logoUrl, name, className }: { logoUrl: string | null; name: string; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="size-4 shrink-0 rounded-[3px] object-contain" src={logoUrl} loading="lazy" />
      ) : (
        <span className="size-4 shrink-0 rounded-[3px] bg-muted" />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

/** Linear-style underline tab bar. */
function TabBar({ tabs, active, onChange }: { tabs: typeof TABS; active: WorldCupTab; onChange: (id: WorldCupTab) => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--dur-fast)]',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {isActive ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Compact segmented control inside a track. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
      {options.map((opt) => {
        const isActive = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-[var(--dur-fast)]',
              isActive
                ? 'bg-card text-foreground ring-1 ring-foreground/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Horizontal scrollable chips for many options (e.g. metrics). */
function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((opt) => {
        const isActive = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--dur-fast)]',
              isActive
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-3">
      <div className="flex flex-col gap-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-10 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Dense data surface tuned for table-heavy content. */
function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10', className)}>{children}</div>
  );
}

// ── Fixtures ───────────────────────────────────────────────────────────────────
function FixturesSection({ fixtures }: { fixtures: WorldCupFixture[] }) {
  const grouped = useMemo(() => {
    const groups = new Map<string, WorldCupFixture[]>();
    for (const fixture of fixtures) groups.set(dateKey(fixture.date), [...(groups.get(dateKey(fixture.date)) ?? []), fixture]);
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [fixtures]);

  if (grouped.length === 0) return <EmptyState>No World Cup fixtures in range.</EmptyState>;

  return (
    <div className="flex flex-col gap-5">
      {grouped.map(([key, rows]) => (
        <div key={key} className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{fmtDate(rows[0].date)}</span>
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{rows.length}</span>
          </div>
          <Panel>
            {rows.map((fixture, index) => (
              <Link
                key={fixture.id}
                href={`/comparison?fixture=${fixture.id}`}
                prefetch={false}
                className={cn(
                  'group/row grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2.5 transition-colors duration-[var(--dur-fast)] hover:bg-muted/40 sm:grid-cols-[1fr_88px_1fr_120px]',
                  index > 0 && 'border-t border-border/60',
                )}
              >
                <TeamIdentity logoUrl={fixture.homeTeam.logoUrl} name={fixture.homeTeam.name} className="justify-end text-right text-sm font-medium" />
                <div className="flex items-center justify-center">
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground tabular-nums">
                    {fmtKickoff(fixture.date)}
                  </span>
                </div>
                <TeamIdentity logoUrl={fixture.awayTeam.logoUrl} name={fixture.awayTeam.name} className="text-sm font-medium" />
                <div className="hidden items-center justify-end gap-2 sm:flex">
                  {fixture.roundName ? (
                    <span className="truncate text-xs text-muted-foreground">{fixture.roundName}</span>
                  ) : null}
                  <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100" />
                </div>
              </Link>
            ))}
          </Panel>
        </div>
      ))}
    </div>
  );
}

// ── Standings ──────────────────────────────────────────────────────────────────
function StandingsRow({ row, qualifies }: { row: WorldCupStandingRow; qualifies: boolean }) {
  return (
    <div className="grid grid-cols-[18px_1fr_repeat(4,22px)_30px_30px] items-center gap-x-2 py-1.5 text-sm">
      <span className="relative font-mono text-xs text-muted-foreground tabular-nums">
        {qualifies ? <span className="absolute -left-2 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-primary" /> : null}
        {row.rank ?? '—'}
      </span>
      <TeamIdentity logoUrl={row.team.logoUrl} name={row.team.name} className={cn('text-sm', qualifies ? 'font-medium text-foreground' : 'text-foreground/90')} />
      <span className="text-center font-mono text-xs text-muted-foreground tabular-nums">{row.played ?? 0}</span>
      <span className="text-center font-mono text-xs text-muted-foreground tabular-nums">{row.win ?? 0}</span>
      <span className="text-center font-mono text-xs text-muted-foreground tabular-nums">{row.draw ?? 0}</span>
      <span className="text-center font-mono text-xs text-muted-foreground tabular-nums">{row.loss ?? 0}</span>
      <span className="text-center font-mono text-xs text-muted-foreground tabular-nums">{row.goalsDiff ?? 0}</span>
      <span className="text-center font-mono text-xs font-semibold text-foreground tabular-nums">{row.points ?? 0}</span>
    </div>
  );
}

function StandingsSection({ groups }: { groups: WorldCupStandingsGroup[] }) {
  if (groups.length === 0) return <EmptyState>No World Cup standings loaded.</EmptyState>;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <Panel key={group.groupName}>
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold text-foreground">{group.groupName}</span>
            <span className="text-[11px] text-muted-foreground">Group stage</span>
          </div>
          <div className="px-4 py-1">
            <div className="grid grid-cols-[18px_1fr_repeat(4,22px)_30px_30px] gap-x-2 border-b border-border/60 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              <span>#</span>
              <span>Team</span>
              <span className="text-center">P</span>
              <span className="text-center">W</span>
              <span className="text-center">D</span>
              <span className="text-center">L</span>
              <span className="text-center">GD</span>
              <span className="text-center">Pts</span>
            </div>
            <div className="divide-y divide-border/40">
              {group.rows.map((row, i) => (
                <StandingsRow key={row.team.id} row={row} qualifies={i < 2} />
              ))}
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

// ── Team averages ──────────────────────────────────────────────────────────────
function TeamAveragesSection({ teamAverages }: { teamAverages: WorldCupTeamAverage[] }) {
  const [metric, setMetric] = useState<TeamAverageMetric>('goals');
  const cfg = TEAM_AVERAGE_METRICS.find((m) => m.id === metric) ?? TEAM_AVERAGE_METRICS[0];
  const rows = useMemo(
    () => teamAverages.slice().sort((a, b) => (cfg.value(b) ?? -1) - (cfg.value(a) ?? -1)),
    [cfg, teamAverages],
  );
  const max = useMemo(() => Math.max(1, ...rows.map((r) => cfg.value(r) ?? 0)), [cfg, rows]);

  if (teamAverages.length === 0) return <EmptyState>No team averages loaded.</EmptyState>;

  return (
    <div className="flex flex-col gap-3">
      <Chips options={TEAM_AVERAGE_METRICS} value={metric} onChange={setMetric} />
      <Panel>
        <div className="grid grid-cols-[1fr_64px_120px_64px] items-center gap-3 border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          <span>Team</span>
          <span className="text-right">Matches</span>
          <span className="text-right">{cfg.label} / match</span>
          <span className="text-right">GA</span>
        </div>
        <div className="divide-y divide-border/40">
          {rows.slice(0, 16).map((row) => {
            const v = cfg.value(row);
            return (
              <div key={row.team.id} className="grid grid-cols-[1fr_64px_120px_64px] items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/40">
                <TeamIdentity logoUrl={row.team.logoUrl} name={row.team.name} className="text-sm" />
                <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">{row.matchesPlayed}</span>
                <div className="flex items-center justify-end gap-2">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(((v ?? 0) / max) * 100)}%` }} />
                  </span>
                  <span className="w-9 text-right font-mono text-xs font-semibold text-foreground tabular-nums">{fmtNum(v)}</span>
                </div>
                <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">{fmtNum(row.avgGoalsAgainst)}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ── Top players ────────────────────────────────────────────────────────────────
function TopPlayersSection({ initialTopPlayers }: { initialTopPlayers: WorldCupTopPlayersResult }) {
  const [metric, setMetric] = useState<WorldCupPlayerMetric>(initialTopPlayers.metric);
  const [scope, setScope] = useState<WorldCupScope>(initialTopPlayers.scope);
  const [source, setSource] = useState<WorldCupPlayerSource>(initialTopPlayers.source);
  const [page, setPage] = useState(initialTopPlayers.page);
  const [result, setResult] = useState(initialTopPlayers);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialKeyRef = useRef(`${initialTopPlayers.metric}:${initialTopPlayers.scope}:${initialTopPlayers.source}:${initialTopPlayers.page}`);

  useEffect(() => {
    const key = `${metric}:${scope}:${source}:${page}`;
    updateUrl({
      playerMetric: metric === 'goals' ? null : metric,
      playerPage: page === 1 ? null : String(page),
      playerScope: scope === 'overall' ? null : scope,
      playerSource: source === 'qualifiers' ? null : source,
    });
    if (key === initialKeyRef.current) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams({ metric, page: String(page), scope, source });
        const next = await fetchJson<WorldCupTopPlayersResult>(`/api/v1/world-cup/top-players?${params.toString()}`, { signal: controller.signal });
        setResult(next);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setErrorMessage(error instanceof Error ? error.message : 'Top players could not be loaded.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [metric, page, scope, source]);

  const maxPage = Math.max(1, Math.ceil(result.totalRows / result.pageSize));
  const maxTotal = useMemo(() => Math.max(1, ...result.rows.map((r) => r.total)), [result.rows]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          options={[{ id: 'qualifiers', label: 'Qualifiers' }, { id: 'worldcup', label: 'World Cup' }]}
          value={source}
          onChange={(v) => { setSource(v); setPage(1); }}
        />
        <Segmented
          options={[{ id: 'overall', label: 'All' }, { id: 'home', label: 'Home' }, { id: 'away', label: 'Away' }]}
          value={scope}
          onChange={(v) => { setScope(v); setPage(1); }}
        />
      </div>
      <Chips options={PLAYER_METRICS} value={metric} onChange={(v) => { setMetric(v); setPage(1); }} />

      {errorMessage ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</div>
      ) : null}

      <Panel>
        <div className="grid grid-cols-[28px_1fr_84px_56px_1fr_52px] items-center gap-3 border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          <span className="text-center">#</span>
          <span>Player</span>
          <span className="text-right">Starts (Sub)</span>
          <span className="text-right">Mins</span>
          <span className="pl-3">Total</span>
          <span className="text-right">/90</span>
        </div>
        <div className="divide-y divide-border/40">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <Skeleton className="size-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            : result.rows.map((row) => (
                <div key={`${row.playerId}-${row.team.id}-${row.pageRank}`} className="grid grid-cols-[28px_1fr_84px_56px_1fr_52px] items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/40">
                  <span className={cn('text-center font-mono text-xs tabular-nums', row.pageRank <= 3 ? 'font-semibold text-primary' : 'text-muted-foreground')}>{row.pageRank}</span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{row.playerName}</span>
                    <TeamIdentity logoUrl={row.team.logoUrl} name={row.team.name} className="text-xs text-muted-foreground" />
                  </div>
                  <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">{row.lineups} ({row.substitutes})</span>
                  <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">{row.minutes}</span>
                  <div className="flex items-center gap-2 pl-3">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((row.total / maxTotal) * 100)}%` }} />
                    </span>
                    <span className="w-7 text-right font-mono text-xs font-semibold text-foreground tabular-nums">{fmtTotal(row.total)}</span>
                  </div>
                  <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">{row.per90 === null ? '—' : row.per90.toFixed(2)}</span>
                </div>
              ))}
          {!loading && result.rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No rows for this source and metric yet.</div>
          ) : null}
        </div>
      </Panel>

      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{result.totalRows} players</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{page} / {maxPage}</span>
          <Button variant="outline" size="icon-sm" disabled={page >= maxPage} onClick={() => setPage((v) => Math.min(maxPage, v + 1))} aria-label="Next page">
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Reused-surface link cards ───────────────────────────────────────────────────
function LinkCards({ kind }: { kind: 'streaks' | 'props' }) {
  const rows = kind === 'streaks'
    ? [
        { href: '/streaks?leagueId=1&season=2026&view=season', label: 'Season-best streaks', desc: 'Longest historical runs per national team.' },
        { href: '/streaks?leagueId=1&season=2026', label: 'Active fixture streaks', desc: 'Live streaks heading into WC fixtures.' },
      ]
    : [
        { href: '/player-props?leagueId=1&season=2026&upcomingOnly=false', label: 'All-season player props', desc: 'Prop hit-rates across the full evidence pool.' },
        { href: '/player-props?leagueId=1&season=2026&upcomingOnly=true', label: 'Upcoming fixture props', desc: 'Props for players in upcoming WC fixtures.' },
      ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <Link key={row.href} href={row.href} prefetch={false} className="group/card block">
          <Card className="gap-1 transition-colors duration-[var(--dur-fast)] hover:bg-muted/30">
            <div className="flex items-center justify-between px-4">
              <span className="text-sm font-medium text-foreground">{row.label}</span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-[var(--dur-fast)] group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5 group-hover/card:text-foreground" />
            </div>
            <p className="px-4 text-xs text-muted-foreground">{row.desc}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────
export function WorldCupHubClient({ fixtures, initialTab, initialTopPlayers, standings, teamAverages }: WorldCupHubClientProps) {
  const [activeTab, setActiveTab] = useState<WorldCupTab>(initialTab);
  const showAll = activeTab === 'all';

  function changeTab(tab: WorldCupTab) {
    setActiveTab(tab);
    updateUrl({ tab: tab === 'all' ? null : tab });
  }

  const teamCount = useMemo(() => standings.reduce((acc, g) => acc + g.rows.length, 0), [standings]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Page header */}
      <div className="border-b border-border">
        <div className="mx-auto w-full max-w-[1500px] px-6 pt-6 pb-0">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
            <div className="flex flex-col gap-1.5">
              <Eyebrow>FIFA World Cup · Summer 2026</Eyebrow>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">World Cup 2026</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <MetaStat value={String(teamCount || 48)} label="teams" />
                <span className="h-3 w-px bg-border" />
                <MetaStat value={String(standings.length || 12)} label="groups" />
                <span className="h-3 w-px bg-border" />
                <MetaStat value={String(fixtures.length)} label="fixtures" />
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              Evidence-powered
            </Badge>
          </div>
          <TabBar tabs={TABS} active={activeTab} onChange={changeTab} />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-10 px-6 py-7">
        {(showAll || activeTab === 'fixtures') && (
          <section id="fixtures">
            <SectionHead eyebrow="Schedule" title="Upcoming fixtures" />
            <FixturesSection fixtures={fixtures} />
          </section>
        )}

        {(showAll || activeTab === 'table') && (
          <section id="table" className="flex flex-col gap-8">
            <div>
              <SectionHead eyebrow="Standings" title="Group tables" />
              <StandingsSection groups={standings} />
            </div>
            <div>
              <SectionHead eyebrow="Team averages" title="Per-match team stats" />
              <TeamAveragesSection teamAverages={teamAverages} />
            </div>
          </section>
        )}

        {(showAll || activeTab === 'top-players') && (
          <section id="top-players">
            <SectionHead eyebrow="Leaderboard" title="Top players" />
            <TopPlayersSection initialTopPlayers={initialTopPlayers} />
          </section>
        )}

        {(showAll || activeTab === 'player-streaks') && (
          <section id="player-streaks">
            <SectionHead eyebrow="Streaks" title="Team streaks" />
            <LinkCards kind="streaks" />
          </section>
        )}

        {(showAll || activeTab === 'player-props') && (
          <section id="player-props">
            <SectionHead eyebrow="Player props" title="Prop percentages" />
            <LinkCards kind="props" />
          </section>
        )}
      </div>
    </main>
  );
}
