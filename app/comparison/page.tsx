'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { getDateKey, getDateWindowKeys } from '@/lib/date';
import { fetchJson } from '@/lib/fetch-json';
import { fetchUpcomingFixtures } from '@/lib/upcoming-fixtures';
import { StatePanel } from '../components/state-panel';
import { useLanguage } from '../language-provider';
import { ComparisonToolbar } from './_components/comparison-toolbar';
import { HeadToHeadPanel } from './_components/head-to-head-panel';
import { PlayerStatsPanel } from './_components/player-stats-panel';
import { RefereeStatsPanel } from './_components/referee-stats-panel';
import { ScopeToggle } from './_components/scope-toggle';
import { StatisticsMarketPanel } from './_components/statistics-market-panel';
import { StatisticsSummaryPanel } from './_components/statistics-summary-panel';
import { TabsNav, type ComparisonTabId } from './_components/tabs-nav';
import { TeamPanel } from './_components/team-panel';
import { TrendPanel } from './_components/trend-panel';
import {
    DEFAULT_MARKET_GROUP,
    DEFAULT_MARKET_LINE,
    getMarketGroup,
    getMarketGroupByKey,
    getMarketLineByKey,
} from '../market-catalog';
import { getCompetitionLabel, getTeamName } from './helpers';
import type {
    ComparisonScope,
    ComparisonCoreResponse,
    HistoricalFixtureRecord,
    HistoricalMatch,
    StatisticsCategoryId,
    TrendCategoryId,
    UpcomingFixtureRecord,
} from './types';

const UPCOMING_DATE_WINDOW_DAYS = 6;
const EMPTY_COMPARISON_DATA: ComparisonCoreResponse = {
    awayMatches: [],
    awaySummary: null,
    awayTrends: [],
    headToHeadMatches: [],
    homeMatches: [],
    homeSummary: null,
    homeTrends: [],
};

function formatShortDate(isoDate: string, locale: string) {
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
        .format(new Date(isoDate))
        .replace(',', '');
}

function formatFixtureDateTime(isoDate: string, locale: string) {
    return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(isoDate));
}

function mapFixtureToHistoricalMatch(record: HistoricalFixtureRecord, teamId: number, locale: string): HistoricalMatch {
    const homeStats = record.fixture_statistics.find(
        (item) => item.team_id === record.home_team_id && item.period === 'FT',
    );
    const awayStats = record.fixture_statistics.find(
        (item) => item.team_id === record.away_team_id && item.period === 'FT',
    );
    const homeStats1H = record.fixture_statistics.find(
        (item) => item.team_id === record.home_team_id && item.period === '1H',
    );
    const awayStats1H = record.fixture_statistics.find(
        (item) => item.team_id === record.away_team_id && item.period === '1H',
    );
    const homeStats2H = record.fixture_statistics.find(
        (item) => item.team_id === record.home_team_id && item.period === '2H',
    );
    const awayStats2H = record.fixture_statistics.find(
        (item) => item.team_id === record.away_team_id && item.period === '2H',
    );

    const homeTeamName = getTeamName(record.home_team) ?? 'Home team';
    const awayTeamName = getTeamName(record.away_team) ?? 'Away team';
    const isHome = record.home_team_id === teamId;

    return {
        id: record.id,
        date: formatShortDate(record.date, locale),
        opponent: isHome ? awayTeamName : homeTeamName,
        competitionLabel: getCompetitionLabel(record.league_name),
        homeTeamName,
        awayTeamName,
        homeGoals: record.home_goals ?? 0,
        awayGoals: record.away_goals ?? 0,
        homeGoals1H: record.home_goals_1h ?? 0,
        awayGoals1H: record.away_goals_1h ?? 0,
        homeGoals2H: (record.home_goals ?? 0) - (record.home_goals_1h ?? 0),
        awayGoals2H: (record.away_goals ?? 0) - (record.away_goals_1h ?? 0),
        homeCorners: homeStats?.corners ?? 0,
        awayCorners: awayStats?.corners ?? 0,
        homeCorners1H: homeStats1H?.corners ?? 0,
        awayCorners1H: awayStats1H?.corners ?? 0,
        homeCorners2H: homeStats2H?.corners ?? 0,
        awayCorners2H: awayStats2H?.corners ?? 0,
        homeCards: (homeStats?.yellow_cards ?? 0) + (homeStats?.red_cards ?? 0),
        awayCards: (awayStats?.yellow_cards ?? 0) + (awayStats?.red_cards ?? 0),
        homeRedCards: homeStats?.red_cards ?? 0,
        awayRedCards: awayStats?.red_cards ?? 0,
        homeBookingPoints: homeStats?.booking_points ?? (homeStats?.yellow_cards ?? 0) * 10 + (homeStats?.red_cards ?? 0) * 25,
        awayBookingPoints: awayStats?.booking_points ?? (awayStats?.yellow_cards ?? 0) * 10 + (awayStats?.red_cards ?? 0) * 25,
        homeShots: homeStats?.total_shots ?? 0,
        awayShots: awayStats?.total_shots ?? 0,
        homeShotsOnTarget: homeStats?.shots_on_target ?? 0,
        awayShotsOnTarget: awayStats?.shots_on_target ?? 0,
        homeFouls: homeStats?.fouls ?? 0,
        awayFouls: awayStats?.fouls ?? 0,
        homeOffsides: homeStats?.offsides ?? 0,
        awayOffsides: awayStats?.offsides ?? 0,
        homeGoalKicks: homeStats?.goal_kicks ?? 0,
        awayGoalKicks: awayStats?.goal_kicks ?? 0,
        homeThrowIns: homeStats?.throw_ins ?? 0,
        awayThrowIns: awayStats?.throw_ins ?? 0,
        homeTackles: homeStats?.tackles ?? 0,
        awayTackles: awayStats?.tackles ?? 0,
        isHome,
    };
}

function summarizeTeamForm(matches: HistoricalMatch[]) {
    return matches.reduce(
        (summary, match) => {
            const teamGoals = match.isHome ? match.homeGoals : match.awayGoals;
            const opponentGoals = match.isHome ? match.awayGoals : match.homeGoals;

            if (teamGoals > opponentGoals) summary.wins += 1;
            else if (teamGoals === opponentGoals) summary.draws += 1;
            else summary.losses += 1;

            return summary;
        },
        { wins: 0, draws: 0, losses: 0 },
    );
}

function getTabDescription(tab: ComparisonTabId, t: (value: string) => string) {
    if (tab === 'recent-matches') return t('Recent matches explains the last 10 games, head-to-head record and trend signals for both teams.');
    if (tab === 'statistics') return t('Statistics compares season market hit rates for both teams using the selected scope.');
    if (tab === 'player-stats') return t('Player Stats compares player leaders for both teams in the selected league and scope.');
    if (tab === 'referee-stats') return t('Referee Stats compares the assigned referee with both teams using season averages and market tendencies.');
    if (tab === 'predictions') return t('Predictions will surface model signals and confidence once this module is ready.');
    return t('Odds will compare bookmaker pricing and market context once this module is ready.');
}

function getSectionEyebrow(tab: ComparisonTabId, t: (value: string) => string) {
    if (tab === 'recent-matches') return t('Recent form');
    if (tab === 'statistics') return t('Season context');
    if (tab === 'player-stats') return t('Player leaders');
    if (tab === 'referee-stats') return t('Referee context');
    if (tab === 'predictions') return t('Model view');
    return t('Market view');
}

function useUpcomingFixtures(dateWindow: string[]) {
    const [fixtures, setFixtures] = useState<UpcomingFixtureRecord[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const dateWindowKey = dateWindow.join('|');

    useEffect(() => {
        let cancelled = false;

        async function loadUpcomingFixtures() {
            if (dateWindow.length === 0) {
                setFixtures([]);
                setErrorMessage(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setErrorMessage(null);

            try {
                const data = await fetchUpcomingFixtures(dateWindow.length);

                if (cancelled) return;

                setFixtures(data as UpcomingFixtureRecord[]);
                setIsLoading(false);
            } catch (error) {
                if (cancelled) return;

                console.error('Failed to load upcoming fixtures', error);
                setFixtures([]);
                setErrorMessage('Upcoming fixtures could not be loaded.');
                setIsLoading(false);
            }
        }

        void loadUpcomingFixtures();

        return () => {
            cancelled = true;
        };
    }, [dateWindow, dateWindowKey]);

    return { errorMessage, fixtures, isLoading };
}

function useComparisonData(
    fixtureId: number | null,
    scope: ComparisonScope,
    enabled = true,
) {
    const [data, setData] = useState<ComparisonCoreResponse>(EMPTY_COMPARISON_DATA);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadComparisonPayload() {
            if (!enabled || !fixtureId) {
                setData(EMPTY_COMPARISON_DATA);
                setErrorMessage(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setErrorMessage(null);

            try {
                const response = await fetchJson<ComparisonCoreResponse>(
                    `/api/v1/comparison?fixtureId=${fixtureId}&scope=${scope}`,
                );

                if (cancelled) return;

                setData(response);
                setIsLoading(false);
            } catch (error) {
                if (cancelled) return;

                console.error('Failed to load comparison data', error);
                setData(EMPTY_COMPARISON_DATA);
                setErrorMessage('Comparison data could not be loaded.');
                setIsLoading(false);
            }
        }

        void loadComparisonPayload();

        return () => {
            cancelled = true;
        };
    }, [enabled, fixtureId, scope]);

    return { data, errorMessage, isLoading };
}

export default function ComparisonPage() {
    const { locale, t } = useLanguage();
    const [activeTab, setActiveTab] = useState<ComparisonTabId>('recent-matches');
    const [scope, setScope] = useState<ComparisonScope>('all');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
    const [appliedQueryFixtureId, setAppliedQueryFixtureId] = useState<number | null>(null);
    const [requestedFixtureId, setRequestedFixtureId] = useState<number | null>(null);
    const [homeTeamId, setHomeTeamId] = useState<number | null>(null);
    const [awayTeamId, setAwayTeamId] = useState<number | null>(null);
    const [selectedMarketGroupId, setSelectedMarketGroupId] = useState(DEFAULT_MARKET_GROUP.id);
    const [selectedMarketKey, setSelectedMarketKey] = useState(DEFAULT_MARKET_LINE.key);
    const [trendCategory, setTrendCategory] = useState<TrendCategoryId>('all');
    const [statisticsCategory, setStatisticsCategory] = useState<StatisticsCategoryId>('all');

    const upcomingDateWindow = useMemo(() => getDateWindowKeys(UPCOMING_DATE_WINDOW_DAYS), []);
    const { errorMessage: fixturesErrorMessage, fixtures, isLoading: isFixturesLoading } = useUpcomingFixtures(upcomingDateWindow);
    const showRecentMatches = activeTab === 'recent-matches';
    const showStatistics = activeTab === 'statistics';
    const showPlayerStats = activeTab === 'player-stats';
    const showRefereeStats = activeTab === 'referee-stats';

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const urlSearchParams = new URLSearchParams(window.location.search);
        const requestedMarketKey = urlSearchParams.get('marketKey');
        const requestedMarketLine = requestedMarketKey ? getMarketLineByKey(requestedMarketKey) : null;
        const nextRequestedFixtureId = Number(urlSearchParams.get('fixtureId') ?? urlSearchParams.get('fixture') ?? '');
        if ((!Number.isFinite(nextRequestedFixtureId) || nextRequestedFixtureId <= 0) && !requestedMarketLine) {
            return;
        }

        queueMicrotask(() => {
            if (Number.isFinite(nextRequestedFixtureId) && nextRequestedFixtureId > 0) {
                setRequestedFixtureId(nextRequestedFixtureId);
            }

            if (requestedMarketLine) {
                setSelectedMarketGroupId(getMarketGroupByKey(requestedMarketLine.key).id);
                setSelectedMarketKey(requestedMarketLine.key);
            }
        });
    }, []);

    const upcomingDates = useMemo(() => {
        return [...new Set(fixtures.map((fixture) => getDateKey(fixture.date)))];
    }, [fixtures]);

    const effectiveDate =
        (selectedDate && upcomingDates.includes(selectedDate) ? selectedDate : '') || upcomingDates[0] || '';

    const fixturesForDate = useMemo(() => {
        if (!effectiveDate) return [];
        return fixtures.filter((fixture) => getDateKey(fixture.date) === effectiveDate);
    }, [effectiveDate, fixtures]);

    const groupedFixtures = useMemo(() => {
        return fixturesForDate.reduce<Record<string, UpcomingFixtureRecord[]>>((groups, fixture) => {
            const leagueName = fixture.league_name ?? t('League');
            const key = `${fixture.league_id}:${leagueName}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(fixture);
            return groups;
        }, {});
    }, [fixturesForDate, t]);

    const selectedFixture = useMemo(() => {
        if (selectedFixtureId == null) return null;
        return fixturesForDate.find((fixture) => fixture.id === selectedFixtureId) ?? null;
    }, [fixturesForDate, selectedFixtureId]);

    const effectiveFixture =
        selectedFixture ?? (homeTeamId == null && awayTeamId == null ? fixturesForDate[0] ?? null : null);

    const effectiveFixtureId = effectiveFixture?.id ?? null;
    const effectiveHomeTeamId = homeTeamId ?? effectiveFixture?.home_team_id ?? null;
    const effectiveAwayTeamId = awayTeamId ?? effectiveFixture?.away_team_id ?? null;
    const effectiveLeagueId = effectiveFixture?.league_id ?? null;
    const effectiveLeagueName = effectiveFixture?.league_name ?? null;
    const effectiveSeason = effectiveFixture?.season ?? null;

    useEffect(() => {
        if (requestedFixtureId == null || !Number.isFinite(requestedFixtureId) || requestedFixtureId <= 0) {
            return;
        }

        if (appliedQueryFixtureId === requestedFixtureId) {
            return;
        }

        const requestedFixture = fixtures.find((fixture) => fixture.id === requestedFixtureId);
        if (!requestedFixture) {
            return;
        }

        queueMicrotask(() => {
            setSelectedDate(getDateKey(requestedFixture.date));
            setSelectedFixtureId(requestedFixture.id);
            setHomeTeamId(requestedFixture.home_team_id);
            setAwayTeamId(requestedFixture.away_team_id);
            setAppliedQueryFixtureId(requestedFixture.id);
        });
    }, [appliedQueryFixtureId, fixtures, requestedFixtureId]);
    const effectiveRefereeId = effectiveFixture?.referee_id ?? null;
    const effectiveRefereeName = effectiveFixture?.referee_name_raw ?? null;
    const homeTeam = effectiveFixture?.home_team_view ?? null;
    const awayTeam = effectiveFixture?.away_team_view ?? null;
    const needsComparisonData = showRecentMatches || showStatistics || showRefereeStats;
    const {
        data: comparisonData,
        errorMessage: comparisonErrorMessage,
        isLoading: isComparisonLoading,
    } = useComparisonData(effectiveFixtureId, scope, needsComparisonData);
    const homeMatches = useMemo(() => {
        if (!effectiveHomeTeamId) return [] as HistoricalMatch[];
        return comparisonData.homeMatches.map((item) => mapFixtureToHistoricalMatch(item, effectiveHomeTeamId, locale));
    }, [comparisonData.homeMatches, effectiveHomeTeamId, locale]);
    const awayMatches = useMemo(() => {
        if (!effectiveAwayTeamId) return [] as HistoricalMatch[];
        return comparisonData.awayMatches.map((item) => mapFixtureToHistoricalMatch(item, effectiveAwayTeamId, locale));
    }, [comparisonData.awayMatches, effectiveAwayTeamId, locale]);
    const headToHeadMatches = useMemo(() => {
        if (!effectiveHomeTeamId) return [] as HistoricalMatch[];
        return comparisonData.headToHeadMatches.map((item) => mapFixtureToHistoricalMatch(item, effectiveHomeTeamId, locale));
    }, [comparisonData.headToHeadMatches, effectiveHomeTeamId, locale]);
    const homeStatSummary = comparisonData.homeSummary;
    const awayStatSummary = comparisonData.awaySummary;
    const homeTrends = comparisonData.homeTrends;
    const awayTrends = comparisonData.awayTrends;
    const isHomeLoading = isComparisonLoading;
    const isAwayLoading = isComparisonLoading;
    const isHeadToHeadLoading = isComparisonLoading;
    const isHomeStatSummaryLoading = isComparisonLoading;
    const isAwayStatSummaryLoading = isComparisonLoading;
    const isHomeTrendsLoading = isComparisonLoading;
    const isAwayTrendsLoading = isComparisonLoading;

    const homeForm = useMemo(() => summarizeTeamForm(homeMatches), [homeMatches]);
    const awayForm = useMemo(() => summarizeTeamForm(awayMatches), [awayMatches]);
    const activeTabLabel = t(
        activeTab === 'recent-matches'
            ? 'Recent Matches'
            : activeTab === 'statistics'
              ? 'Statistics'
              : activeTab === 'player-stats'
                ? 'Player Stats'
                : activeTab === 'referee-stats'
                  ? 'Referee Stats'
                  : activeTab === 'predictions'
                    ? 'Predictions'
                    : 'Odds',
    );
    const activeTabDescription = getTabDescription(activeTab, t);
    const activeTabEyebrow = getSectionEyebrow(activeTab, t);
    const fixtureDateLabel = effectiveFixture ? formatFixtureDateTime(effectiveFixture.date, locale) : null;
    const competitionLabel = effectiveLeagueName ?? t('League');
    const scopeLabel = scope === 'all' ? t('All matches') : t('Home / Away');
    const homeTeamNameDisplay = homeTeam?.name ?? t('Home team');
    const awayTeamNameDisplay = awayTeam?.name ?? t('Away team');
    const homeTeamInitials = homeTeamNameDisplay.slice(0, 2);
    const awayTeamInitials = awayTeamNameDisplay.slice(0, 2);

    function handleDateChange(value: string) {
        const nextFixtures = fixtures.filter((fixture) => getDateKey(fixture.date) === value);
        const nextFixture = nextFixtures[0] ?? null;

        setSelectedDate(value);
        setSelectedFixtureId(nextFixture?.id ?? null);
        setHomeTeamId(nextFixture?.home_team_id ?? null);
        setAwayTeamId(nextFixture?.away_team_id ?? null);
    }

    function handleFixtureChange(value: number | null) {
        const nextFixture = fixturesForDate.find((fixture) => fixture.id === value) ?? null;

        setSelectedFixtureId(value);
        setHomeTeamId(nextFixture?.home_team_id ?? null);
        setAwayTeamId(nextFixture?.away_team_id ?? null);
    }

    function handleMarketGroupChange(value: string) {
        const nextGroup = getMarketGroup(value);
        setSelectedMarketGroupId(nextGroup.id);
        setSelectedMarketKey(nextGroup.lines[0]?.key ?? DEFAULT_MARKET_LINE.key);
    }

    return (
        <div className="comparison-page flex min-h-full flex-col overflow-x-hidden px-5 py-5 text-[var(--app-text)] md:px-7 md:py-7">
            <div className="mx-auto flex w-full max-w-[1640px] flex-col gap-6">
                <section className="flex flex-col gap-4">
                    <div className="overflow-hidden rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)]">
                        {effectiveFixture && homeTeam && awayTeam ? (
                            <div className="grid gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:px-6">
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel-muted)]">
                                            {homeTeam.logo_url ? (
                                                <Image alt={`${homeTeamNameDisplay} logo`} className="h-10 w-10 object-contain" height={40} src={homeTeam.logo_url} width={40} />
                                            ) : (
                                                <span className="text-lg font-semibold text-[var(--app-text-dim)]">{homeTeamInitials}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-lg font-semibold text-[var(--app-text)] md:text-xl">{homeTeamNameDisplay}</p>
                                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{t('Home')}</p>
                                        </div>
                                    </div>

                                    <div className="shrink-0 text-center">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--app-text-dim)]">{competitionLabel}</p>
                                        <p className="mt-1 text-sm font-semibold text-[var(--app-text)]">vs</p>
                                        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{scopeLabel}</p>
                                    </div>

                                    <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                                        <div className="min-w-0 text-right">
                                            <p className="truncate text-lg font-semibold text-[var(--app-text)] md:text-xl">{awayTeamNameDisplay}</p>
                                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{t('Away')}</p>
                                        </div>
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel-muted)]">
                                            {awayTeam.logo_url ? (
                                                <Image alt={`${awayTeamNameDisplay} logo`} className="h-10 w-10 object-contain" height={40} src={awayTeam.logo_url} width={40} />
                                            ) : (
                                                <span className="text-lg font-semibold text-[var(--app-text-dim)]">{awayTeamInitials}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-3 rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel-muted)] p-4">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-text-dim)]">{t('Kickoff')}</p>
                                        <p className="mt-1 text-sm font-semibold text-[var(--app-text)]">{fixtureDateLabel}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-text-dim)]">{activeTabEyebrow}</p>
                                        <p className="mt-1 text-base font-semibold text-[var(--app-text)]">{activeTabLabel}</p>
                                        <p className="mt-1 text-sm text-[var(--app-text-soft)]">{activeTabDescription}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="px-4 py-5 lg:px-6">
                                <StatePanel
                                    description={t('Select a date and fixture to unlock the full comparison.')}
                                    title={t('No fixture selected yet')}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
                        <div className="rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-text-dim)]">{t('Choose fixture')}</p>
                            <p className="mt-1 text-sm text-[var(--app-text-soft)]">{t('Pick the match first. The rest of the page updates automatically.')}</p>
                            <div className="mt-4">
                                <ComparisonToolbar
                                    groupedFixtures={groupedFixtures}
                                    isFixturesLoading={isFixturesLoading}
                                    isLoading={isFixturesLoading}
                                    onDateChange={handleDateChange}
                                    onFixtureChange={handleFixtureChange}
                                    selectedDate={effectiveDate}
                                    selectedFixtureId={effectiveFixtureId}
                                    upcomingDates={upcomingDates}
                                />
                            </div>
                        </div>

                        <div className="rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-text-dim)]">{t('Analysis scope')}</p>
                            <p className="mt-1 text-sm text-[var(--app-text-soft)]">{t('This changes how team history is sampled across the page.')}</p>
                            <div className="mt-4">
                                <ScopeToggle onChange={setScope} value={scope} />
                            </div>
                        </div>
                        </div>

                        {fixturesErrorMessage ? (
                            <div className="rounded-[5px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {t(fixturesErrorMessage)}
                            </div>
                        ) : null}

                        {comparisonErrorMessage && needsComparisonData ? (
                            <div className="rounded-[5px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {t(comparisonErrorMessage)}
                            </div>
                        ) : null}

                        <div className="rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)] p-2">
                        <TabsNav activeTab={activeTab} onChange={setActiveTab} />
                        <div className="border-t border-[var(--app-border)] px-2 pt-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-text-dim)]">{activeTabEyebrow}</p>
                            <p className="mt-1 text-sm text-[var(--app-text-soft)]">{activeTabDescription}</p>
                        </div>
                    </div>

                    {effectiveFixture && (showRecentMatches || showStatistics || showPlayerStats || showRefereeStats) ? (
                        <div className="grid gap-3 md:grid-cols-4">
                            <div className="rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-text-dim)]">{t('Home recent form')}</p>
                                <p className="mt-2 text-base font-semibold text-[var(--app-text)]">
                                    {homeForm.wins}-{homeForm.draws}-{homeForm.losses}
                                </p>
                                <p className="mt-1 text-xs text-[var(--app-text-soft)]">{t('Last 10')}</p>
                            </div>
                            <div className="rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-text-dim)]">{t('Away recent form')}</p>
                                <p className="mt-2 text-base font-semibold text-[var(--app-text)]">
                                    {awayForm.wins}-{awayForm.draws}-{awayForm.losses}
                                </p>
                                <p className="mt-1 text-xs text-[var(--app-text-soft)]">{t('Last 10')}</p>
                            </div>
                            <div className="rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-text-dim)]">{t('Head-to-head sample')}</p>
                                <p className="mt-2 text-base font-semibold text-[var(--app-text)]">{headToHeadMatches.length}</p>
                                <p className="mt-1 text-xs text-[var(--app-text-soft)]">{t('Matches in scope')}</p>
                            </div>
                            <div className="rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-text-dim)]">{t('Team scope')}</p>
                                <p className="mt-2 text-base font-semibold text-[var(--app-text)]">{scopeLabel}</p>
                                <p className="mt-1 text-xs text-[var(--app-text-soft)]">{t('Applied across this analysis view')}</p>
                            </div>
                        </div>
                    ) : null}

                    {showRecentMatches ? (
                        <div className="flex flex-col gap-4">
                            <div className="grid gap-4 xl:grid-cols-2">
                                <TeamPanel
                                    accent="left"
                                    emptyMessage={t('No matches found for this home-side view.')}
                                    isLoading={isHomeLoading}
                                    marketGroupId={selectedMarketGroupId}
                                    marketKey={selectedMarketKey}
                                    matches={homeMatches}
                                    onMarketGroupChange={handleMarketGroupChange}
                                    onMarketKeyChange={setSelectedMarketKey}
                                    teamLogoUrl={homeTeam?.logo_url ?? null}
                                    teamName={homeTeam?.name ?? t('Select home team')}
                                />

                                <TeamPanel
                                    accent="right"
                                    emptyMessage={t('No matches found for this away-side view.')}
                                    isLoading={isAwayLoading}
                                    marketGroupId={selectedMarketGroupId}
                                    marketKey={selectedMarketKey}
                                    matches={awayMatches}
                                    onMarketGroupChange={handleMarketGroupChange}
                                    onMarketKeyChange={setSelectedMarketKey}
                                    teamLogoUrl={awayTeam?.logo_url ?? null}
                                    teamName={awayTeam?.name ?? t('Select away team')}
                                />
                            </div>

                            <HeadToHeadPanel
                                awayTeamName={awayTeam?.name ?? t('Away team')}
                                data={headToHeadMatches}
                                emptyMessage={t('No head-to-head matches found for this setup.')}
                                homeTeamName={homeTeam?.name ?? t('Home team')}
                                isLoading={isHeadToHeadLoading}
                                marketGroupId={selectedMarketGroupId}
                                marketKey={selectedMarketKey}
                                onMarketGroupChange={handleMarketGroupChange}
                                onMarketKeyChange={setSelectedMarketKey}
                                scopeLabel={scope === 'all' ? t('All matches') : t('Home / Away')}
                            />

                            <StatisticsSummaryPanel
                                awaySummary={awayStatSummary}
                                awayTeamName={awayTeam?.name ?? t('Away team')}
                                homeSummary={homeStatSummary}
                                homeTeamName={homeTeam?.name ?? t('Home team')}
                                isLoading={isHomeStatSummaryLoading || isAwayStatSummaryLoading}
                            />

                            <div className="grid gap-4 xl:grid-cols-2">
                                <TrendPanel
                                    accent="left"
                                    category={trendCategory}
                                    emptyMessage={t('No home team trends qualified for this scope yet.')}
                                    isLoading={isHomeTrendsLoading}
                                    onCategoryChange={setTrendCategory}
                                    teamLogoUrl={homeTeam?.logo_url ?? null}
                                    teamName={homeTeam?.name ?? t('Select home team')}
                                    trends={homeTrends}
                                />

                                <TrendPanel
                                    accent="right"
                                    category={trendCategory}
                                    emptyMessage={t('No away team trends qualified for this scope yet.')}
                                    isLoading={isAwayTrendsLoading}
                                    onCategoryChange={setTrendCategory}
                                    teamLogoUrl={awayTeam?.logo_url ?? null}
                                    teamName={awayTeam?.name ?? t('Select away team')}
                                    trends={awayTrends}
                                />
                            </div>
                        </div>
                    ) : showStatistics ? (
                        <div className="flex flex-col gap-4">
                            <StatisticsMarketPanel
                                awayTeamName={awayTeam?.name ?? t('Away team')}
                                awayTrends={awayTrends}
                                category={statisticsCategory}
                                homeTeamName={homeTeam?.name ?? t('Home team')}
                                homeTrends={homeTrends}
                                isLoading={isHomeTrendsLoading || isAwayTrendsLoading}
                                onCategoryChange={setStatisticsCategory}
                                scope={scope}
                            />
                        </div>
                    ) : showPlayerStats ? (
                        <div className="flex flex-col gap-4">
                            <PlayerStatsPanel
                                awayTeamId={effectiveAwayTeamId}
                                awayTeamName={awayTeam?.name ?? t('Away team')}
                                homeTeamId={effectiveHomeTeamId}
                                homeTeamName={homeTeam?.name ?? t('Home team')}
                                leagueId={effectiveLeagueId}
                                leagueName={effectiveLeagueName}
                                scope={scope}
                                season={effectiveSeason}
                            />
                        </div>
                    ) : showRefereeStats ? (
                        <div className="flex flex-col gap-4">
                            <RefereeStatsPanel
                                awaySummary={awayStatSummary}
                                awayTeamName={awayTeam?.name ?? t('Away team')}
                                awayTrends={awayTrends}
                                homeSummary={homeStatSummary}
                                homeTeamName={homeTeam?.name ?? t('Home team')}
                                homeTrends={homeTrends}
                                isTeamDataLoading={
                                    isHomeStatSummaryLoading || isAwayStatSummaryLoading || isHomeTrendsLoading || isAwayTrendsLoading
                                }
                                leagueId={effectiveLeagueId}
                                refereeId={effectiveRefereeId}
                                refereeName={effectiveRefereeName}
                                scope={scope}
                                season={effectiveSeason}
                            />
                        </div>
                    ) : (
                        <div className="p-3">
                            <StatePanel
                                description={t('The current production view is focused on recent matches and head-to-head analysis.')}
                                title={t('This tab is not wired yet')}
                            />
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
