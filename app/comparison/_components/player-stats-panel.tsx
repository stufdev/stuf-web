'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fetchJson } from '@/lib/fetch-json';
import { useLanguage } from '../../language-provider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PLAYER_GOAL_SPLIT_TABS, PLAYER_STATS_CATEGORY_TABS } from '../helpers';
import type {
  ComparisonScope,
  PlayerGoalSplitId,
  PlayerStatsCategoryId,
} from '../types';

type PlayerStatsPanelProps = {
  awayTeamId: number | null;
  awayTeamName: string;
  homeTeamId: number | null;
  homeTeamName: string;
  leagueId: number | null;
  leagueName: string | null;
  scope: ComparisonScope;
  season: number | null;
};

type PlayerMatchDetail = {
  fixtureId: number;
  homeAway: 'H' | 'A';
  minutes: number;
  opponentName: string;
  playedAt: string;
  score: string;
  total: number;
};

type PlayerLeaderboardRow = {
  details: PlayerMatchDetail[];
  matches: number;
  minutes: number;
  per90: number;
  playerId: number;
  playerName: string;
  total: number;
};

type ComparisonPlayerStatsResponse = {
  awayRows: PlayerLeaderboardRow[];
  homeRows: PlayerLeaderboardRow[];
};

type PlayerMetricMode = {
  category: PlayerStatsCategoryId;
  columnLabel: string;
  goalSplit: PlayerGoalSplitId;
  summaryLabel: string;
};

const DEFAULT_VISIBLE_ROWS = 20;
const EMPTY_PLAYER_RESPONSE: ComparisonPlayerStatsResponse = {
  awayRows: [],
  homeRows: [],
};

function getScopedTeamLabel(teamName: string, side: string, scope: ComparisonScope) {
  if (scope === 'all') return teamName;
  return `${teamName} (${side})`;
}

function formatSeasonLabel(season: number | null, seasonFallback: string) {
  if (season == null) return seasonFallback;
  return `${season}/${season + 1}`;
}

function formatCompetitionLabel(leagueName: string | null, season: number | null, leagueFallback: string, seasonFallback: string) {
  return `${leagueName ?? leagueFallback} - ${formatSeasonLabel(season, seasonFallback)}`;
}

function formatMatchDate(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(isoDate))
    .replace(',', '');
}

function formatPer90(value: number) {
  return value.toFixed(2);
}

function buildMetricMode(category: PlayerStatsCategoryId, goalSplit: PlayerGoalSplitId): PlayerMetricMode {
  if (category === 'goals') {
    if (goalSplit === 'first_goals') {
      return {
        category,
        columnLabel: '1st Goals',
        goalSplit,
        summaryLabel: 'First Goals *league only',
      };
    }

    if (goalSplit === 'goals_1h') {
      return {
        category,
        columnLabel: '1H Goals',
        goalSplit,
        summaryLabel: '1H Goals *league only',
      };
    }

    if (goalSplit === 'goals_2h') {
      return {
        category,
        columnLabel: '2H Goals',
        goalSplit,
        summaryLabel: '2H Goals *league only',
      };
    }

    return {
      category,
      columnLabel: 'Goals',
      goalSplit: 'goals',
      summaryLabel: 'Top Scorers *league only',
    };
  }

  const config: Record<Exclude<PlayerStatsCategoryId, 'goals'>, Omit<PlayerMetricMode, 'category' | 'goalSplit'>> = {
    assists: {
      columnLabel: 'Assists',
      summaryLabel: 'Most Assists *league only',
    },
    cards: {
      columnLabel: 'Cards',
      summaryLabel: 'Most Carded *league only',
    },
    shots: {
      columnLabel: 'Shots',
      summaryLabel: 'Most Shots *league only',
    },
    shots_on_target: {
      columnLabel: 'SOT',
      summaryLabel: 'Most Shots On Target *league only',
    },
    fouls: {
      columnLabel: 'Fouls',
      summaryLabel: 'Most Fouls Committed *league only',
    },
    fouls_won: {
      columnLabel: 'Won',
      summaryLabel: 'Most Fouls Won *league only',
    },
    tackles: {
      columnLabel: 'Tackles',
      summaryLabel: 'Most Tackles *league only',
    },
    offsides: {
      columnLabel: 'Offsides',
      summaryLabel: 'Most Offsides *league only',
    },
  };

  const categoryConfig = config[category];
  return {
    category,
    columnLabel: categoryConfig.columnLabel,
    goalSplit: 'goals',
    summaryLabel: categoryConfig.summaryLabel,
  };
}

function usePlayerLeaderboards(
  homeTeamId: number | null,
  awayTeamId: number | null,
  leagueId: number | null,
  season: number | null,
  scope: ComparisonScope,
  category: PlayerStatsCategoryId,
  goalSplit: PlayerGoalSplitId,
) {
  const [data, setData] = useState<ComparisonPlayerStatsResponse>(EMPTY_PLAYER_RESPONSE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayerLeaderboards() {
      if (!homeTeamId || !awayTeamId || !leagueId || !season) {
        setData(EMPTY_PLAYER_RESPONSE);
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetchJson<ComparisonPlayerStatsResponse>(
          `/api/v1/comparison/player-stats?homeTeamId=${homeTeamId}&awayTeamId=${awayTeamId}&leagueId=${leagueId}&season=${season}&scope=${scope}&category=${category}&goalSplit=${goalSplit}`,
        );

        if (cancelled) return;

        setData(response);
        setIsLoading(false);
      } catch (error) {
        if (cancelled) return;

        console.error('Failed to load player leaderboards', error);
        setData(EMPTY_PLAYER_RESPONSE);
        setErrorMessage('Player stats could not be loaded.');
        setIsLoading(false);
      }
    }

    void loadPlayerLeaderboards();

    return () => {
      cancelled = true;
    };
  }, [awayTeamId, category, goalSplit, homeTeamId, leagueId, scope, season]);

  return { data, errorMessage, isLoading };
}

type PlayerStatsTeamTableProps = {
  columnLabel: string;
  competitionLabel: string;
  emptyMessage: string;
  errorMessage: string | null;
  isLoading: boolean;
  rows: PlayerLeaderboardRow[];
  teamName: string;
};

function PlayerStatsTeamTable({
  columnLabel,
  competitionLabel,
  emptyMessage,
  errorMessage,
  isLoading,
  rows,
  teamName,
}: PlayerStatsTeamTableProps) {
  const { locale, t } = useLanguage();
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_ROWS);
  const visibleRows = rows.slice(0, visibleCount);

  return (
    <section className="flex flex-col">
      <div className="border-b border-border/50 bg-muted/10 px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
        {competitionLabel}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_40px] items-center gap-2 bg-muted/20 border-b border-border/50 px-4 py-2">
        <p className="truncate text-[12px] font-bold uppercase tracking-widest text-foreground">{teamName}</p>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t(columnLabel)}</p>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Per 90')}</p>
        <span />
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex h-24 items-center justify-center px-4 text-center text-[13px] font-medium text-muted-foreground">
            {t('Loading player stats...')}
          </div>
        ) : errorMessage ? (
          <div className="flex h-24 items-center justify-center px-4 text-center text-[13px] font-medium text-destructive">
            {t(errorMessage)}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex h-24 items-center justify-center px-4 text-center text-[13px] font-medium text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <Table>
            <TableBody>
              {visibleRows.map((row) => {
                const isExpanded = expandedPlayerId === row.playerId;

                return (
                  <Fragment key={row.playerId}>
                    <TableRow
                      className={`border-border/50 transition-colors hover:bg-muted/30 cursor-pointer ${
                        isExpanded ? 'bg-muted/20 hover:bg-muted/20' : ''
                      }`}
                      onClick={() => setExpandedPlayerId((currentValue) => (currentValue === row.playerId ? null : row.playerId))}
                    >
                      <TableCell className="px-4 py-2 text-[13px] font-semibold text-foreground">
                        {row.playerName}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-center text-[13px] font-bold tabular-nums text-foreground">
                        {row.total}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-center text-[13px] tabular-nums text-muted-foreground">
                        {formatPer90(row.per90)}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        <div
                          className="inline-flex size-6 items-center justify-center rounded-md border border-border/50 bg-background text-muted-foreground transition-colors hover:text-foreground hover:border-border"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded ? (
                      <TableRow className="border-border/50 bg-muted/10 hover:bg-muted/10">
                        <TableCell className="p-0" colSpan={4}>
                          <div className="px-4 py-3">
                            <div className="mb-3 flex items-center justify-between gap-3 px-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {t('Per match breakdown')}
                              </p>
                              <p className="text-[11px] font-medium text-muted-foreground">
                                {row.matches} {t('Matches').toLowerCase()}, {row.minutes} min
                              </p>
                            </div>
                            <div className="overflow-x-auto rounded-md border border-border/50 bg-background shadow-sm">
                              <Table>
                                <TableHeader className="bg-muted/20">
                                  <TableRow className="border-border/50 hover:bg-transparent">
                                    <TableHead className="h-8 px-3 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                      {t('Date')}
                                    </TableHead>
                                    <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                      {t('H/A')}
                                    </TableHead>
                                    <TableHead className="h-8 px-3 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                      {t('Opponent')}
                                    </TableHead>
                                    <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                      {t('Score')}
                                    </TableHead>
                                    <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                      {t('Mins')}
                                    </TableHead>
                                    <TableHead className="h-8 px-3 py-1 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                      {t(columnLabel)}
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {row.details.map((detail) => (
                                    <TableRow
                                      key={`${row.playerId}-${detail.fixtureId}`}
                                      className="border-border/50 hover:bg-muted/30"
                                    >
                                      <TableCell className="px-3 py-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
                                        {formatMatchDate(detail.playedAt, locale)}
                                      </TableCell>
                                      <TableCell className="px-2 py-1.5 text-center text-[11px] font-bold text-foreground">
                                        {detail.homeAway === 'H' ? t('Home short') : t('Away short')}
                                      </TableCell>
                                      <TableCell className="px-3 py-1.5 text-[12px] font-medium text-foreground">
                                        {detail.opponentName}
                                      </TableCell>
                                      <TableCell className="px-2 py-1.5 text-center text-[12px] font-bold text-foreground">
                                        {detail.score}
                                      </TableCell>
                                      <TableCell className="px-2 py-1.5 text-center text-[12px] tabular-nums text-muted-foreground">
                                        {detail.minutes}
                                      </TableCell>
                                      <TableCell className="px-3 py-1.5 text-right text-[12px] font-bold tabular-nums text-foreground">
                                        {detail.total}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {rows.length > DEFAULT_VISIBLE_ROWS ? (
        <div className="flex justify-center border-t border-border/50 px-4 py-3">
          <button
            className="rounded-md border border-border/60 bg-muted/20 px-4 py-2 text-[12px] font-semibold text-foreground transition-colors hover:border-border hover:bg-muted/40"
            onClick={() => setVisibleCount((currentValue) => (currentValue >= rows.length ? DEFAULT_VISIBLE_ROWS : rows.length))}
            type="button"
          >
            {visibleCount >= rows.length ? t('Show less') : t('Show more')}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function PlayerStatsPanel({
  awayTeamId,
  awayTeamName,
  homeTeamId,
  homeTeamName,
  leagueId,
  leagueName,
  scope,
  season,
}: PlayerStatsPanelProps) {
  const { t } = useLanguage();
  const [category, setCategory] = useState<PlayerStatsCategoryId>('goals');
  const [goalSplit, setGoalSplit] = useState<PlayerGoalSplitId>('goals');

  // World Cup (league 1) leaderboards are widened server-side to the squad's
  // cross-competition history, so the "*league only" caption would mislead.
  const isNationalFixture = leagueId === 1;
  const baseMode = useMemo(() => buildMetricMode(category, goalSplit), [category, goalSplit]);
  const mode = useMemo(
    () =>
      isNationalFixture
        ? { ...baseMode, summaryLabel: baseMode.summaryLabel.replace('*league only', '*all competitions') }
        : baseMode,
    [baseMode, isNationalFixture],
  );
  const homeTableKey = `${homeTeamId ?? 'none'}:${leagueId ?? 'none'}:${season ?? 'none'}:${scope}:${category}:${goalSplit}`;
  const awayTableKey = `${awayTeamId ?? 'none'}:${leagueId ?? 'none'}:${season ?? 'none'}:${scope}:${category}:${goalSplit}`;
  const { data, errorMessage, isLoading } = usePlayerLeaderboards(
    homeTeamId,
    awayTeamId,
    leagueId,
    season,
    scope,
    category,
    goalSplit,
  );
  const scopedHomeTeamName = getScopedTeamLabel(homeTeamName, t('Home').toLowerCase(), scope);
  const scopedAwayTeamName = getScopedTeamLabel(awayTeamName, t('Away').toLowerCase(), scope);
  const competitionLabel = useMemo(
    () =>
      isNationalFixture
        ? `${leagueName ?? t('National teams')} · ${t('all competitions (last 24 months)')}`
        : formatCompetitionLabel(leagueName, season, t('League'), t('Season')),
    [isNationalFixture, leagueName, season, t],
  );

  return (
    <section className="overflow-hidden rounded-md border border-border/60 bg-background shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-3">
        <h2 className="text-[15px] font-bold text-foreground">{t('Player Stats')}</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Per 90 statistics')}</p>
      </div>

      <div className="border-b border-border/50 px-2 py-1.5">
        <Tabs value={category} onValueChange={(v) => setCategory(v as PlayerStatsCategoryId)} className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="flex h-10 w-max justify-start bg-transparent p-1">
              {PLAYER_STATS_CATEGORY_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="text-[12px] font-medium tracking-wide data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm px-3 h-full rounded-sm transition-all"
                >
                  {t(tab.label)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>

      {category === 'goals' ? (
        <div className="border-b border-border/50 px-2 py-1">
          <Tabs value={goalSplit} onValueChange={(v) => setGoalSplit(v as PlayerGoalSplitId)} className="w-full">
            <div className="overflow-x-auto pb-1">
              <TabsList className="flex h-9 w-max justify-start bg-muted/20 p-1 rounded-md">
                {PLAYER_GOAL_SPLIT_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="text-[11px] font-medium data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm px-3 h-full rounded-sm transition-all"
                  >
                    {t(tab.label)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>
      ) : null}

      <div className="flex flex-col justify-between gap-2 border-b border-border/50 bg-muted/10 px-4 py-3 md:flex-row md:items-center">
        <p className="text-[12px] font-bold uppercase tracking-widest text-foreground">{t(mode.summaryLabel)}</p>
        <p className="text-[11px] font-medium text-muted-foreground">{t('Click a player to expand per-match detail')}</p>
      </div>

      <div className="grid divide-y divide-border/50 xl:grid-cols-2 xl:divide-x xl:divide-y-0">
        <PlayerStatsTeamTable
          key={homeTableKey}
          columnLabel={mode.columnLabel}
          competitionLabel={competitionLabel}
          emptyMessage={t('No player stats found for this home-side scope yet.')}
          errorMessage={errorMessage}
          isLoading={isLoading}
          rows={data.homeRows}
          teamName={scopedHomeTeamName}
        />

        <PlayerStatsTeamTable
          key={awayTableKey}
          columnLabel={mode.columnLabel}
          competitionLabel={competitionLabel}
          emptyMessage={t('No player stats found for this away-side scope yet.')}
          errorMessage={errorMessage}
          isLoading={isLoading}
          rows={data.awayRows}
          teamName={scopedAwayTeamName}
        />
      </div>
    </section>
  );
}
