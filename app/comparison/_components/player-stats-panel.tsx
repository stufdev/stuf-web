'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fetchJson } from '@/lib/fetch-json';
import { useLanguage } from '../../language-provider';
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
      <div className="border-b border-[var(--app-border)] bg-[var(--app-canvas)] px-3 py-1.5 text-[12px] text-[var(--app-text-dim)]">
        {competitionLabel}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_40px] items-center gap-2 bg-[var(--app-panel-muted)] px-3 py-1.5">
        <p className="truncate text-[12px] font-semibold text-[var(--app-text)]">{teamName}</p>
        <p className="text-center text-[12px] font-semibold text-[var(--app-text)]">{t(columnLabel)}</p>
        <p className="text-center text-[12px] font-semibold text-[var(--app-text)]">{t('Per 90')}</p>
        <span />
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex h-20 items-center justify-center px-4 text-center text-[12px] text-[var(--app-text-dim)]">
            {t('Loading player stats...')}
          </div>
        ) : errorMessage ? (
          <div className="flex h-20 items-center justify-center px-4 text-center text-[12px] text-[var(--app-danger-text)]">
            {t(errorMessage)}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex h-20 items-center justify-center px-4 text-center text-[12px] text-[var(--app-text-dim)]">
            {emptyMessage}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {visibleRows.map((row) => {
                const isExpanded = expandedPlayerId === row.playerId;

                return (
                  <Fragment key={row.playerId}>
                    <tr
                      className={`border-b border-[var(--app-border)] transition-colors ${
                        isExpanded ? 'bg-[var(--app-panel-muted)]' : 'bg-[var(--app-panel)]'
                      }`}
                    >
                      <td className="px-3 py-1.5">
                        <button
                          className="text-left text-[12px] font-medium text-[var(--app-text)] hover:text-[var(--app-text)]"
                          onClick={() => setExpandedPlayerId((currentValue) => (currentValue === row.playerId ? null : row.playerId))}
                          type="button"
                        >
                          {row.playerName}
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-center text-[12px] font-semibold tabular-nums text-[var(--app-text)]">
                        {row.total}
                      </td>
                      <td className="px-2 py-1.5 text-center text-[12px] tabular-nums text-[var(--app-text-dim)]">
                        {formatPer90(row.per90)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          aria-expanded={isExpanded}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] border border-[var(--app-border)] bg-[var(--app-canvas)] text-[var(--app-text-dim)] transition-colors hover:text-[var(--app-text)]"
                          onClick={() => setExpandedPlayerId((currentValue) => (currentValue === row.playerId ? null : row.playerId))}
                          type="button"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="border-b border-[var(--app-border)] bg-[var(--app-panel-muted)]">
                        <td className="px-3 pb-3 pt-2" colSpan={4}>
                          <div className="pt-1">
                            <div className="mb-2 flex items-center justify-between gap-3 px-1">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">
                                {t('Per match breakdown')}
                              </p>
                              <p className="text-[12px] text-[var(--app-text-dim)]">
                                {row.matches} {t('Matches').toLowerCase()}, {row.minutes} min
                              </p>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-left">
                                <thead>
                                  <tr className="border-b border-[var(--app-border)]">
                                    <th className="px-2 py-0.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-dim)]">
                                      {t('Date')}
                                    </th>
                                    <th className="px-2 py-0.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-dim)]">
                                      {t('H/A')}
                                    </th>
                                    <th className="px-2 py-0.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-dim)]">
                                      {t('Opponent')}
                                    </th>
                                    <th className="px-2 py-0.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-dim)]">
                                      {t('Score')}
                                    </th>
                                    <th className="px-2 py-0.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-dim)]">
                                      {t('Mins')}
                                    </th>
                                    <th className="px-2 py-0.5 text-right text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-dim)]">
                                      {t(columnLabel)}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.details.map((detail) => (
                                    <tr
                                      key={`${row.playerId}-${detail.fixtureId}`}
                                      className="border-b border-[var(--app-border)] last:border-b-0"
                                    >
                                      <td className="px-2 py-1 text-[12px] text-[var(--app-text-dim)]">
                                        {formatMatchDate(detail.playedAt, locale)}
                                      </td>
                                      <td className="px-2 py-1 text-[12px] font-semibold text-[var(--app-text)]">
                                        {detail.homeAway === 'H' ? t('Home short') : t('Away short')}
                                      </td>
                                      <td className="px-2 py-1 text-[12px] text-[var(--app-text)]">
                                        {detail.opponentName}
                                      </td>
                                      <td className="px-2 py-1 text-[12px] font-medium text-[var(--app-text)]">
                                        {detail.score}
                                      </td>
                                      <td className="px-2 py-1 text-[12px] tabular-nums text-[var(--app-text-dim)]">
                                        {detail.minutes}
                                      </td>
                                      <td className="px-2 py-1 text-right text-[12px] font-semibold tabular-nums text-[var(--app-text)]">
                                        {detail.total}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {rows.length > DEFAULT_VISIBLE_ROWS ? (
        <div className="flex justify-center border-t border-[var(--app-border)] px-3 py-2">
          <button
            className="rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-1.5 text-[12px] font-semibold text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)]"
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

  const mode = useMemo(() => buildMetricMode(category, goalSplit), [category, goalSplit]);
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
    () => formatCompetitionLabel(leagueName, season, t('League'), t('Season')),
    [leagueName, season, t],
  );

  return (
    <section className="overflow-hidden rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex flex-col gap-1 border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--app-text)]">{t('Player Stats')}</h2>
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{t('Per 90 statistics')}</p>
      </div>

      <div className="border-b border-[var(--app-border)] px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {PLAYER_STATS_CATEGORY_TABS.map((tab) => {
            const isActive = tab.id === category;
            return (
              <button
                key={tab.id}
                className={`rounded-[5px] border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'border-[var(--app-border-strong)] bg-[var(--app-panel-muted)] text-[var(--app-text)]'
                    : 'border-transparent bg-transparent text-[var(--app-text-dim)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]'
                }`}
                onClick={() => setCategory(tab.id)}
                type="button"
              >
                {t(tab.label)}
              </button>
            );
          })}
        </div>
      </div>

      {category === 'goals' ? (
        <div className="border-b border-[var(--app-border)] px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {PLAYER_GOAL_SPLIT_TABS.map((tab) => {
              const isActive = tab.id === goalSplit;
              return (
                <button
                  key={tab.id}
                  className={`rounded-[5px] border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'border-[var(--app-border-strong)] bg-[var(--app-panel-muted)] text-[var(--app-text)]'
                      : 'border-transparent bg-transparent text-[var(--app-text-dim)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]'
                  }`}
                  onClick={() => setGoalSplit(tab.id)}
                  type="button"
                >
                  {t(tab.label)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col justify-between gap-2 border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-4 py-2.5 md:flex-row md:items-center">
        <p className="text-[11px] font-semibold text-[var(--app-text)]">{t(mode.summaryLabel)}</p>
        <p className="text-xs font-medium text-[var(--app-text-dim)]">{t('Click a player to expand per-match detail')}</p>
      </div>

      <div className="grid divide-y divide-[var(--app-border)] xl:grid-cols-2 xl:divide-x xl:divide-y-0">
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
