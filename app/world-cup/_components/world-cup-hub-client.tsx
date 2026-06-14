'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Globe, Trophy, Users, Zap } from 'lucide-react';
import { useLanguage } from '@/app/language-provider';
import { fetchJson } from '@/lib/fetch-json';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type {
  WcPlayerStreakRow,
  WcPlayerStreaksResult,
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
  initialPlayerStreaks: WcPlayerStreaksResult;
  initialTab: WorldCupTab;
  initialTopPlayers: WorldCupTopPlayersResult;
  standings: WorldCupStandingsGroup[];
  teamAverages: WorldCupTeamAverage[];
};

const TABS: Array<{ id: WorldCupTab; label: string; icon?: React.ReactNode }> = [
  { id: 'all', label: 'Overview' },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'table', label: 'Table & Averages' },
  { id: 'top-players', label: 'Top Players' },
  { id: 'player-streaks', label: 'Player Streaks' },
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

const TEAM_AVERAGE_METRICS: Array<{
  id: TeamAverageMetric;
  label: string;
  value: (row: WorldCupTeamAverage) => number | null;
}> = [
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

const fmtDate = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(iso));
const fmtKickoff = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const fmtNum = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(d);
const fmtTotal = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
const dateKey = (iso: string) => iso.slice(0, 10);

// ── Design tokens ──────────────────────────────────────────────────────────────
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'FT_PEN', 'AWD', 'WO']);
const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P']);

// ── Shared primitives ──────────────────────────────────────────────────────────

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  const { t } = useLanguage();
  return (
    <span
      className={cn(
        'text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  );
}

function TeamIdentity({
  logoUrl,
  name,
  className,
}: {
  logoUrl: string | null;
  name: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="size-[18px] shrink-0 rounded-[3px] object-contain" src={logoUrl} loading="lazy" />
      ) : (
        <span className="size-[18px] shrink-0 rounded-[3px] bg-muted/80" />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

/** Premium tab bar with solid active indicator */
function TabBar({
  tabs,
  active,
  onChange,
  liveCount,
}: {
  tabs: typeof TABS;
  active: WorldCupTab;
  onChange: (id: WorldCupTab) => void;
  liveCount: number;
}) {
  const { t } = useLanguage();
  return (
    <Tabs value={active} onValueChange={(value) => onChange(value as WorldCupTab)}>
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-border/60 bg-transparent p-0"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn(
              'relative h-auto flex-none rounded-none border-0 px-4 py-3 text-sm font-medium text-muted-foreground',
              'transition-colors duration-150 hover:text-foreground',
              'data-[state=active]:text-foreground',
              // Active underline
              'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground after:opacity-0',
              'data-[state=active]:after:opacity-100',
            )}
          >
            {t(tab.label)}
            {tab.id === 'fixtures' && liveCount > 0 ? (
              <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-red-500/15 text-[9px] font-bold text-red-500">
                {liveCount}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Compact segmented control */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  const { t } = useLanguage();
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      variant="outline"
      size="sm"
      className="rounded-lg border border-border/60 bg-muted/20 p-0.5"
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.id}
          value={opt.id}
          className="h-7 rounded-md border-0 px-3 text-xs font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          {t(opt.label)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Horizontal scrollable chips */
function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-all duration-150',
            opt.id === value
              ? 'border-foreground/20 bg-foreground text-background shadow-sm'
              : 'border-border/60 bg-background/70 text-muted-foreground hover:border-border hover:text-foreground',
          )}
        >
          {t(opt.label)}
        </button>
      ))}
    </div>
  );
}

/** Section header with left accent */
function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-end justify-between gap-4 pb-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-0.5 rounded-full bg-gradient-to-b from-foreground/40 to-transparent" />
        <div className="flex flex-col gap-0.5">
          <Eyebrow>{t(eyebrow)}</Eyebrow>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{t(title)}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card className="rounded-xl border-dashed border-border/70 bg-muted/10 shadow-none">
      <CardContent className="flex items-center justify-center px-6 py-12 text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

/** Premium data panel */
function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/60 bg-background shadow-xs',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Stat card for the hero ────────────────────────────────────────────────────
function HeroStatPill({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-3 py-2 backdrop-blur-sm">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{t(label)}</span>
    </div>
  );
}

// ── Fixtures ───────────────────────────────────────────────────────────────────
function fmtOddsPrice(price: number) {
  return price.toFixed(2);
}

function FixtureCenter({ fixture }: { fixture: WorldCupFixture }) {
  const { locale, t } = useLanguage();
  if (FINISHED_STATUSES.has(fixture.statusShort ?? '')) {
    return (
      <div className="flex min-w-[80px] flex-col items-center justify-center gap-0.5">
        <span className="rounded-md bg-muted/80 px-2.5 py-1 font-mono text-[14px] font-semibold leading-none text-foreground tabular-nums">
          {fixture.homeGoals ?? '?'} – {fixture.awayGoals ?? '?'}
        </span>
        <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          FT
        </span>
      </div>
    );
  }
  if (LIVE_STATUSES.has(fixture.statusShort ?? '')) {
    return (
      <div className="flex min-w-[80px] flex-col items-center justify-center gap-0.5">
        <span className="rounded-md bg-red-500/12 px-2.5 py-1 font-mono text-[14px] font-semibold leading-none text-red-500 tabular-nums">
          {fixture.homeGoals ?? '0'} – {fixture.awayGoals ?? '0'}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-red-500">
          <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
          LIVE
        </span>
      </div>
    );
  }
  return (
    <div className="flex min-w-[80px] items-center justify-center">
      <span className="font-mono text-[13px] font-semibold leading-none tabular-nums text-foreground">
        {fmtKickoff(fixture.date, locale)}
      </span>
    </div>
  );
}

function FixtureOddsCell({ fixture }: { fixture: WorldCupFixture }) {
  const { t } = useLanguage();
  const isSettled =
    FINISHED_STATUSES.has(fixture.statusShort ?? '') || LIVE_STATUSES.has(fixture.statusShort ?? '');

  if (isSettled || !fixture.matchOdds) {
    return (
      <div className="flex min-w-[152px] items-center justify-center gap-1.5">
        {fixture.roundName ? (
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/50">
            {t(fixture.roundName)}
          </span>
        ) : null}
      </div>
    );
  }

  const { homePrice, drawPrice, awayPrice } = fixture.matchOdds;
  return (
    <div className="flex min-h-[46px] min-w-[152px] items-center justify-center gap-1.5">
      {homePrice !== null ? (
        <span className="font-mono text-[13px] font-semibold leading-none tabular-nums text-[#8b5cf6]">
          {fmtOddsPrice(homePrice)}
        </span>
      ) : null}
      {drawPrice !== null ? (
        <span className="font-mono text-[13px] font-medium leading-none tabular-nums text-[#c4b5fd]">
          {fmtOddsPrice(drawPrice)}
        </span>
      ) : null}
      {awayPrice !== null ? (
        <span className="font-mono text-[13px] font-semibold leading-none tabular-nums text-[#8b5cf6]">
          {fmtOddsPrice(awayPrice)}
        </span>
      ) : null}
    </div>
  );
}

function FixturesSection({ fixtures }: { fixtures: WorldCupFixture[] }) {
  const { locale, t } = useLanguage();
  const grouped = useMemo(() => {
    const groups = new Map<string, WorldCupFixture[]>();
    for (const fixture of fixtures)
      groups.set(dateKey(fixture.date), [...(groups.get(dateKey(fixture.date)) ?? []), fixture]);
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [fixtures]);

  if (grouped.length === 0) return <EmptyState>{t('No World Cup fixtures in range.')}</EmptyState>;

  return (
    <div className="overflow-hidden rounded-[5px] border border-border/50 bg-background">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 font-sans [&_td]:border-0 [&_th]:border-0">
          <thead>
            <tr className="bg-muted/15 hover:bg-muted/15">
              <th className="px-4 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Home
              </th>
              <th className="w-[96px] px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Score / KO
              </th>
              <th className="px-4 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Away
              </th>
              <th className="w-[160px] bg-[#2b2d33] px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c4b5fd] dark:bg-[#23252b]">
                Odds (1 X 2)
              </th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(([key, rows]) => (
              <>
                {/* Date group row */}
                <tr
                  key={`date-${key}`}
                  className="border-b border-border/50 bg-[#f3f3f4] hover:bg-[#f3f3f4] dark:bg-muted/20 dark:hover:bg-muted/20"
                >
                  <td className="px-4 py-1" colSpan={4}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-sky-500" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#171717] dark:text-foreground/90">
                          {fmtDate(rows[0].date, locale)}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] tabular-nums text-[#4d4d4d] dark:text-muted-foreground">
                        {rows.length} {rows.length === 1 ? t('match') : t('matches')}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Fixture rows */}
                {rows.map((fixture) => (
                  <tr
                    key={fixture.id}
                    className="group/row cursor-pointer border-b border-border/35 transition-colors duration-150 last:border-0 hover:bg-muted/8"
                    onClick={() => { window.location.href = `/comparison?fixture=${fixture.id}`; }}
                  >
                    {/* Home team */}
                    <td className="px-4 py-1.5 align-middle">
                      <div className="relative flex min-w-[160px] items-center gap-2 pr-5">
                        <ArrowUpRight
                          className="absolute top-1/2 right-0 size-3.5 -translate-y-1/2 text-[#9a9a9a] opacity-0 transition-opacity group-hover/row:opacity-100"
                          strokeWidth={2.4}
                        />
                        {fixture.homeTeam.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            className="size-5 shrink-0 rounded-[3px] object-contain"
                            src={fixture.homeTeam.logoUrl}
                            loading="lazy"
                          />
                        ) : (
                          <span className="size-5 shrink-0 rounded-[3px] bg-muted/80" />
                        )}
                        <span className="truncate text-[12px] font-medium leading-4 text-foreground">
                          {fixture.homeTeam.name}
                        </span>
                      </div>
                    </td>

                    {/* Center: score / KO */}
                    <td className="w-[96px] px-2 py-1.5 align-middle">
                      <div className="flex justify-center">
                        <FixtureCenter fixture={fixture} />
                      </div>
                    </td>

                    {/* Away team */}
                    <td className="px-4 py-1.5 align-middle">
                      <div className="flex min-w-[160px] items-center gap-2">
                        {fixture.awayTeam.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            className="size-5 shrink-0 rounded-[3px] object-contain"
                            src={fixture.awayTeam.logoUrl}
                            loading="lazy"
                          />
                        ) : (
                          <span className="size-5 shrink-0 rounded-[3px] bg-muted/80" />
                        )}
                        <span className="truncate text-[12px] font-medium leading-4 text-foreground">
                          {fixture.awayTeam.name}
                        </span>
                      </div>
                    </td>

                    {/* Odds — dark column, same as scanner */}
                    <td className="w-[160px] bg-[#2b2d33] px-2 py-1.5 align-middle dark:bg-[#23252b]">
                      <FixtureOddsCell fixture={fixture} />
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Standings ──────────────────────────────────────────────────────────────────
function StandingsRow({ row, rank }: { row: WorldCupStandingRow; rank: number }) {
  const qualifies = rank <= 2;
  const isTop = rank === 1;

  return (
    <TableRow
      className={cn(
        'border-border/40 transition-colors hover:bg-muted/25',
        qualifies && 'bg-primary/[0.03]',
      )}
    >
      <TableCell className="w-[36px] px-3 py-2.5 text-center">
        <span
          className={cn(
            'relative inline-flex size-5 items-center justify-center rounded font-mono text-[11px] font-semibold tabular-nums',
            isTop
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : qualifies
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground',
          )}
        >
          {row.rank ?? '—'}
        </span>
      </TableCell>
      <TableCell className="min-w-0 px-2 py-2.5">
        <TeamIdentity
          logoUrl={row.team.logoUrl}
          name={row.team.name}
          className={cn(
            'text-sm',
            qualifies ? 'font-medium text-foreground' : 'text-foreground/80',
          )}
        />
      </TableCell>
      <TableCell className="w-[28px] px-1 py-2.5 text-center font-mono text-xs text-muted-foreground tabular-nums">
        {row.played ?? 0}
      </TableCell>
      <TableCell className="w-[28px] px-1 py-2.5 text-center font-mono text-xs text-muted-foreground tabular-nums">
        {row.win ?? 0}
      </TableCell>
      <TableCell className="w-[28px] px-1 py-2.5 text-center font-mono text-xs text-muted-foreground tabular-nums">
        {row.draw ?? 0}
      </TableCell>
      <TableCell className="w-[28px] px-1 py-2.5 text-center font-mono text-xs text-muted-foreground tabular-nums">
        {row.loss ?? 0}
      </TableCell>
      <TableCell
        className={cn(
          'w-[36px] px-1 py-2.5 text-center font-mono text-xs tabular-nums',
          (row.goalsDiff ?? 0) > 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : (row.goalsDiff ?? 0) < 0
              ? 'text-red-500'
              : 'text-muted-foreground',
        )}
      >
        {(row.goalsDiff ?? 0) > 0 ? `+${row.goalsDiff}` : row.goalsDiff ?? 0}
      </TableCell>
      <TableCell
        className={cn(
          'w-[36px] px-3 py-2.5 text-center font-mono text-xs font-bold tabular-nums',
          qualifies ? 'text-foreground' : 'text-foreground/70',
        )}
      >
        {row.points ?? 0}
      </TableCell>
    </TableRow>
  );
}

function StandingsSection({ groups }: { groups: WorldCupStandingsGroup[] }) {
  const { t } = useLanguage();
  if (groups.length === 0) return <EmptyState>{t('No World Cup standings loaded.')}</EmptyState>;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <Panel key={group.groupName}>
          {/* Group header */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
            <span className="text-sm font-semibold text-foreground">{group.groupName}</span>
            <Badge
              variant="outline"
              className="rounded-md border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              Group stage
            </Badge>
          </div>
          <div className="overflow-x-auto w-full">
<Table className="[&_td]:border-0 [&_th]:border-0">
            <TableHeader>
              <TableRow className="border-border/40 bg-muted/10 hover:bg-muted/10">
                <TableHead className="w-[36px] px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  #
                </TableHead>
                <TableHead className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  {t('Team')}
                </TableHead>
                <TableHead className="w-[28px] px-1 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  P
                </TableHead>
                <TableHead className="w-[28px] px-1 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  W
                </TableHead>
                <TableHead className="w-[28px] px-1 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  D
                </TableHead>
                <TableHead className="w-[28px] px-1 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  L
                </TableHead>
                <TableHead className="w-[36px] px-1 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  GD
                </TableHead>
                <TableHead className="w-[36px] px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  Pts
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.rows.map((row, i) => (
                <StandingsRow key={row.team.id} row={row} rank={i + 1} />
              ))}
            </TableBody>
          </Table>
</div>
          {/* Qualification legend */}
          <div className="flex items-center gap-2 border-t border-border/40 px-4 py-2">
            <span className="size-1.5 rounded-full bg-primary/60" />
            <span className="text-[10px] text-muted-foreground">{t('Top 2 qualify')}</span>
          </div>
        </Panel>
      ))}
    </div>
  );
}

// ── Team averages ──────────────────────────────────────────────────────────────
function TeamAveragesSection({ teamAverages }: { teamAverages: WorldCupTeamAverage[] }) {
  const { t } = useLanguage();
  const [metric, setMetric] = useState<TeamAverageMetric>('goals');
  const cfg = TEAM_AVERAGE_METRICS.find((m) => m.id === metric) ?? TEAM_AVERAGE_METRICS[0]!;
  const rows = useMemo(
    () => teamAverages.slice().sort((a, b) => (cfg.value(b) ?? -1) - (cfg.value(a) ?? -1)),
    [cfg, teamAverages],
  );
  const max = useMemo(() => Math.max(1, ...rows.map((r) => cfg.value(r) ?? 0)), [cfg, rows]);

  if (teamAverages.length === 0) return <EmptyState>{t('No team averages loaded.')}</EmptyState>;

  return (
    <div className="flex flex-col gap-3">
      <Chips options={TEAM_AVERAGE_METRICS} value={metric} onChange={setMetric} />
      <Panel>
        <div className="overflow-x-auto w-full">
<Table className="[&_td]:border-0 [&_th]:border-0">
          <TableHeader>
            <TableRow className="border-border/40 bg-muted/10 hover:bg-muted/10">
              <TableHead className="w-[32px] px-3 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                #
              </TableHead>
              <TableHead className="px-2 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                Team
              </TableHead>
              <TableHead className="w-[64px] px-2 py-2.5 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                {t('Matches')}
              </TableHead>
              <TableHead className="w-[180px] px-3 py-2.5 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                {t(cfg.label)} / {t('match')}
              </TableHead>
              <TableHead className="w-[64px] px-3 py-2.5 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                GA
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 16).map((row, i) => {
              const v = cfg.value(row);
              const pct = Math.round(((v ?? 0) / max) * 100);
              const isTop3 = i < 3;

              return (
                <TableRow key={row.team.id} className="border-border/40 transition-colors hover:bg-muted/20">
                  <TableCell className="px-3 py-2.5 text-center">
                    <span
                      className={cn(
                        'inline-flex size-5 items-center justify-center rounded font-mono text-[10px] font-semibold tabular-nums',
                        i === 0
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : i === 1
                            ? 'bg-muted/60 text-foreground/70'
                            : i === 2
                              ? 'bg-amber-900/10 text-amber-700/80 dark:text-amber-600'
                              : 'text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2.5">
                    <TeamIdentity
                      logoUrl={row.team.logoUrl}
                      name={row.team.name}
                      className={cn('text-sm', isTop3 ? 'font-medium text-foreground' : '')}
                    />
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {row.matchesPlayed}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-3">
                      <Progress
                        value={pct}
                        className={cn(
                          'h-1.5 w-24',
                          isTop3
                            ? '[&>[data-slot=progress-indicator]]:bg-emerald-500'
                            : '[&>[data-slot=progress-indicator]]:bg-primary/60',
                        )}
                      />
                      <span
                        className={cn(
                          'w-9 text-right font-mono text-xs font-semibold tabular-nums',
                          isTop3 ? 'text-foreground' : 'text-foreground/80',
                        )}
                      >
                        {fmtNum(v)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {fmtNum(row.avgGoalsAgainst)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
</div>
      </Panel>
    </div>
  );
}

// ── Top players ────────────────────────────────────────────────────────────────
const RANK_STYLES: Record<number, { badge: string; text: string }> = {
  1: { badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', text: 'text-amber-600 dark:text-amber-400' },
  2: { badge: 'bg-muted/60 text-foreground/70', text: 'text-foreground/70' },
  3: { badge: 'bg-amber-900/10 text-amber-700 dark:text-amber-600/80', text: 'text-amber-700 dark:text-amber-600' },
};

function TopPlayersSection({ initialTopPlayers }: { initialTopPlayers: WorldCupTopPlayersResult }) {
  const { t } = useLanguage();
  const [metric, setMetric] = useState<WorldCupPlayerMetric>(initialTopPlayers.metric);
  const [scope, setScope] = useState<WorldCupScope>(initialTopPlayers.scope);
  const [source, setSource] = useState<WorldCupPlayerSource>(initialTopPlayers.source);
  const [page, setPage] = useState(initialTopPlayers.page);
  const [result, setResult] = useState(initialTopPlayers);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialKeyRef = useRef(
    `${initialTopPlayers.metric}:${initialTopPlayers.scope}:${initialTopPlayers.source}:${initialTopPlayers.page}`,
  );

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
        const next = await fetchJson<WorldCupTopPlayersResult>(
          `/api/v1/world-cup/top-players?${params.toString()}`,
          { signal: controller.signal },
        );
        setResult(next);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setErrorMessage(error instanceof Error ? error.message : t('Top players could not be loaded.'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [metric, page, scope, source]);

  const maxPage = Math.max(1, Math.ceil(result.totalRows / result.pageSize));
  const maxTotal = useMemo(() => Math.max(1, ...result.rows.map((r) => r.total)), [result.rows]);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          options={[
            { id: 'qualifiers', label: 'Qualifiers' },
            { id: 'worldcup', label: 'World Cup' },
          ]}
          value={source}
          onChange={(v) => {
            setSource(v);
            setPage(1);
          }}
        />
        <Segmented
          options={[
            { id: 'overall', label: 'All' },
            { id: 'home', label: 'Home' },
            { id: 'away', label: 'Away' },
          ]}
          value={scope}
          onChange={(v) => {
            setScope(v);
            setPage(1);
          }}
        />
      </div>
      <Chips
        options={PLAYER_METRICS}
        value={metric}
        onChange={(v) => {
          setMetric(v);
          setPage(1);
        }}
      />

      {errorMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <Panel>
        <div className="overflow-x-auto w-full">
<Table className="[&_td]:border-0 [&_th]:border-0">
          <TableHeader>
            <TableRow className="border-border/40 bg-muted/10 hover:bg-muted/10">
              <TableHead className="w-[40px] px-3 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                #
              </TableHead>
              <TableHead className="px-2 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                {t('Player')}
              </TableHead>
              <TableHead className="w-[96px] px-2 py-2.5 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                {t('Starts')} ({t('Sub')})
              </TableHead>
              <TableHead className="w-[60px] px-2 py-2.5 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                {t('Mins')}
              </TableHead>
              <TableHead className="w-[160px] px-3 py-2.5 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                {t('Total')}
              </TableHead>
              <TableHead className="w-[56px] px-3 py-2.5 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                /90
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-border/40">
                    <TableCell className="px-3 py-3" colSpan={6}>
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-5 rounded-full" />
                        <Skeleton className="h-3.5 flex-1" />
                        <Skeleton className="h-3.5 w-20" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : result.rows.map((row) => {
                  const rankStyle = RANK_STYLES[row.pageRank];
                  const pct = Math.round((row.total / maxTotal) * 100);

                  return (
                    <TableRow
                      key={`${row.playerId}-${row.team.id}-${row.pageRank}`}
                      className="border-border/40 transition-colors hover:bg-muted/20"
                    >
                      <TableCell className="px-3 py-2.5 text-center">
                        <span
                          className={cn(
                            'inline-flex size-5 items-center justify-center rounded font-mono text-[10px] font-semibold tabular-nums',
                            rankStyle ? rankStyle.badge : 'text-muted-foreground',
                          )}
                        >
                          {row.pageRank}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-0 px-2 py-2.5">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span
                            className={cn(
                              'truncate text-sm font-medium',
                              rankStyle ? rankStyle.text : 'text-foreground',
                            )}
                          >
                            {row.playerName}
                          </span>
                          <HoverCard openDelay={200}>
                            <HoverCardTrigger asChild>
                              <span className="cursor-default">
                                <TeamIdentity
                                  logoUrl={row.team.logoUrl}
                                  name={row.team.name}
                                  className="text-xs text-muted-foreground"
                                />
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-48 p-3" side="right">
                              <div className="flex flex-col gap-1.5">
                                <TeamIdentity
                                  logoUrl={row.team.logoUrl}
                                  name={row.team.name}
                                  className="text-sm font-medium text-foreground"
                                />
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{t('Starts')}</span>
                                  <span className="font-mono font-semibold text-foreground">{row.lineups}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{t('Minutes')}</span>
                                  <span className="font-mono font-semibold text-foreground">{row.minutes}</span>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {row.lineups} ({row.substitutes})
                      </TableCell>
                      <TableCell className="px-2 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {row.minutes}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-2.5">
                          <Progress
                            value={pct}
                            className={cn(
                              'h-1.5 w-20',
                              row.pageRank <= 3
                                ? '[&>[data-slot=progress-indicator]]:bg-emerald-500'
                                : '[&>[data-slot=progress-indicator]]:bg-primary/60',
                            )}
                          />
                          <span className="w-7 text-right font-mono text-xs font-semibold text-foreground tabular-nums">
                            {fmtTotal(row.total)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {row.per90 === null ? '—' : row.per90.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!loading && result.rows.length === 0 ? (
              <TableRow>
                <TableCell className="px-4 py-10 text-center text-sm text-muted-foreground" colSpan={6}>
                  {t('No rows for this source and metric yet.')}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
</div>
      </Panel>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {result.totalRows} {result.totalRows === 1 ? t('player') : t('players')}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => setPage((v) => Math.max(1, v - 1))}
            aria-label="Previous page"
            className="size-8 rounded-lg border-border/60"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-[52px] text-center font-mono text-xs text-muted-foreground tabular-nums">
            {page} / {maxPage}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= maxPage}
            onClick={() => setPage((v) => Math.min(maxPage, v + 1))}
            aria-label="Next page"
            className="size-8 rounded-lg border-border/60"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Player streaks ─────────────────────────────────────────────────────────────
type StreakFilter = '2' | '3' | '4' | '5';
const STREAK_FILTER_OPTIONS: Array<{ id: StreakFilter; label: string }> = [
  { id: '2', label: '2+' },
  { id: '3', label: '3+' },
  { id: '4', label: '4+' },
  { id: '5', label: '5+' },
];

function streakBadgeClass(streak: number): string {
  if (streak >= 5) return 'bg-red-500/15 text-red-600 dark:text-red-400';
  if (streak >= 4) return 'bg-orange-500/15 text-orange-600 dark:text-orange-400';
  if (streak >= 3) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
  return 'bg-sky-500/12 text-sky-600 dark:text-sky-400';
}

function PlayerStreakRow({ row }: { row: WcPlayerStreakRow }) {
  const { locale, t } = useLanguage();
  return (
    <TableRow className="border-border/40 transition-colors hover:bg-muted/20">
      <TableCell className="min-w-0 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {row.playerName ?? `Player ${row.playerId}`}
          </span>
          <div className="flex min-w-0 items-center gap-1.5">
            <TeamIdentity logoUrl={row.team.logoUrl} name={row.team.name} className="text-xs text-muted-foreground" />
            <span className="text-muted-foreground/40">·</span>
            <span className="truncate text-[10px] text-muted-foreground">{t(row.propLabel)}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="w-[72px] px-2 py-3 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <span
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-lg font-mono text-base font-bold tabular-nums',
              streakBadgeClass(row.currentStreak),
            )}
          >
            {row.currentStreak}
          </span>
          <span className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{t('in a row')}</span>
        </div>
      </TableCell>
      <TableCell className="w-[80px] px-2 py-3 text-right">
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-xs tabular-nums">
            <span className="font-semibold text-foreground">{row.hits}</span>
            <span className="text-muted-foreground">/{row.sample}</span>
          </span>
          {row.percentage !== null ? (
            <span className="font-mono text-[10px] font-medium text-muted-foreground tabular-nums">
              {Math.round(row.percentage)}%
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        {row.nextOpponentName ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-foreground">
              vs {row.nextOpponentName}
              {row.nextVenueScope ? (
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  ({row.nextVenueScope === 'home' ? 'H' : 'A'})
                </span>
              ) : null}
            </span>
            {row.nextFixtureDate ? (
              <span className="text-[10px] text-muted-foreground">{fmtDate(row.nextFixtureDate, locale)}</span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function PlayerStreaksSection({ initialStreaks }: { initialStreaks: WcPlayerStreaksResult }) {
  const { t } = useLanguage();
  const [filterStr, setFilterStr] = useState<StreakFilter>(
    String(initialStreaks.minStreak) as StreakFilter,
  );
  const [result, setResult] = useState<WcPlayerStreaksResult>(initialStreaks);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const initialKeyRef = useRef(String(initialStreaks.minStreak));

  useEffect(() => {
    const key = filterStr;
    if (key === initialKeyRef.current) {
      setResult(initialStreaks);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setLoading(true);
      try {
        const next = await fetchJson<WcPlayerStreaksResult>(
          `/api/v1/world-cup/player-streaks?minStreak=${filterStr}`,
          { signal: controller.signal },
        );
        setResult(next);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [filterStr, initialStreaks]);

  return (
    <div className="flex flex-col gap-3">
      <Chips options={STREAK_FILTER_OPTIONS} value={filterStr} onChange={setFilterStr} />

      {loading ? (
        <Panel>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border/40')}
            >
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))}
        </Panel>
      ) : result.rows.length === 0 ? (
        <EmptyState>
          {t('No active player streaks at')} {filterStr}+ {t('in WC 2026 data yet.')}
        </EmptyState>
      ) : (
        <Panel>
          <div className="overflow-x-auto w-full">
<Table className="[&_td]:border-0 [&_th]:border-0">
            <TableHeader>
              <TableRow className="border-border/40 bg-muted/10 hover:bg-muted/10">
                <TableHead className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  Player
                </TableHead>
                <TableHead className="w-[72px] px-2 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  {t('Streak')}
                </TableHead>
                <TableHead className="w-[80px] px-2 py-2.5 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  {t('Record')}
                </TableHead>
                <TableHead className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  {t('Next Match')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row) => (
                <PlayerStreakRow key={`${row.playerId}-${row.propKey}`} row={row} />
              ))}
            </TableBody>
          </Table>
</div>
        </Panel>
      )}

      <div className="flex justify-end">
        <Link
          href="/streaks?leagueId=1&season=2026"
          prefetch={false}
          className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
        >
          {t('Team form streaks')}
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}



// ── Page ────────────────────────────────────────────────────────────────────────
export function WorldCupHubClient({
  fixtures,
  initialPlayerStreaks,
  initialTab,
  initialTopPlayers,
  standings,
  teamAverages,
}: WorldCupHubClientProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<WorldCupTab>(initialTab);
  const showAll = activeTab === 'all';

  function changeTab(tab: WorldCupTab) {
    setActiveTab(tab);
    updateUrl({ tab: tab === 'all' ? null : tab });
  }

  const teamCount = useMemo(
    () => standings.reduce((acc, g) => acc + g.rows.length, 0),
    [standings],
  );

  const liveFixtureCount = useMemo(
    () => fixtures.filter((f) => LIVE_STATUSES.has(f.statusShort ?? '')).length,
    [fixtures],
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ── Premium Hero Header ── */}
      <div className="relative border-b border-border/60">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-background" />
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

        <div className="relative mx-auto w-full max-w-[1500px] px-6 pt-7 pb-0">
          <div className="flex flex-wrap items-start justify-between gap-5 pb-6">
            {/* Left: Title block */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Eyebrow>{t('FIFA World Cup · Summer 2026')}</Eyebrow>
                {liveFixtureCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-500">
                    <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
                    {t('Live')} · {liveFixtureCount}
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('World Cup 2026')}</h1>

              {/* Stats pills */}
              <div className="flex flex-wrap items-center gap-2">
                <HeroStatPill value={String(teamCount || 48)} label="teams" icon={Users} />
                <HeroStatPill value={String(standings.length || 12)} label="groups" icon={Globe} />
                <HeroStatPill value={String(fixtures.length)} label="fixtures" icon={Trophy} />
              </div>
            </div>

            {/* Right: Badge */}
            <Badge
              variant="outline"
              className="h-8 gap-2 rounded-xl border-border/60 bg-background/80 px-3 text-xs font-medium text-foreground backdrop-blur-sm"
            >
              <Zap className="size-3.5 text-amber-500" />
              {t('Evidence-powered')}
            </Badge>
          </div>

          {/* Tab bar flush to bottom of header */}
          <TabBar tabs={TABS} active={activeTab} onChange={changeTab} liveCount={liveFixtureCount} />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-0 px-6 py-8">
        {(showAll || activeTab === 'fixtures') && (
          <section id="fixtures" className={cn(showAll && 'pb-10')}>
            <SectionHead eyebrow="Schedule" title="Upcoming fixtures" />
            <FixturesSection fixtures={fixtures} />
          </section>
        )}

        {showAll && <Separator className="bg-border/50" />}

        {(showAll || activeTab === 'table') && (
          <section id="table" className={cn('flex flex-col gap-8', showAll && 'py-10')}>
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

        {showAll && <Separator className="bg-border/50" />}

        {(showAll || activeTab === 'top-players') && (
          <section id="top-players" className={cn(showAll && 'py-10')}>
            <SectionHead eyebrow="Leaderboard" title="Top players" />
            <TopPlayersSection initialTopPlayers={initialTopPlayers} />
          </section>
        )}

        {showAll && <Separator className="bg-border/50" />}

        {(showAll || activeTab === 'player-streaks') && (
          <section id="player-streaks" className={cn(showAll && 'py-10')}>
            <SectionHead eyebrow="Player streaks" title="Active player streaks" />
            <PlayerStreaksSection initialStreaks={initialPlayerStreaks} />
          </section>
        )}

        {showAll && <Separator className="bg-border/50" />}

        {(showAll || activeTab === 'player-props') && (
          <section id="player-props" className={cn(showAll && 'py-10')}>
            <SectionHead eyebrow="Player props" title="Prop percentages" />
            <div className="flex h-32 items-center justify-center rounded-xl border border-border/60 bg-muted/10 text-sm text-muted-foreground">
              {/* Prop link cards han sido ocultados temporalmente por diseño. */}
              {t('Section is currently being refactored.')}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
