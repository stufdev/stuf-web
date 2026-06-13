'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { getDateKey, getDateWindowKeys } from '@/lib/date';
import { fetchJson } from '@/lib/fetch-json';
import { fetchRecentFixtures, fetchUpcomingFixtures } from '@/lib/upcoming-fixtures';
import { StatePanel } from '../components/state-panel';
import { useLanguage } from '../language-provider';
import { useFixtureMode } from '../fixture-mode-provider';
import { FixtureModeToggle } from '../_components/fixture-mode-toggle';
import { ComparisonToolbar } from './_components/comparison-toolbar';
import { HeadToHeadPanel } from './_components/head-to-head-panel';
import { OddsPanel } from './_components/odds-panel';
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
import type {
    ComparisonScope,
    ComparisonCoreResponse,
    HistoricalMatch,
    StatisticsCategoryId,
    TrendCategoryId,
    UpcomingFixtureRecord,
} from './types';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const UPCOMING_DATE_WINDOW_DAYS = 14; // Wide enough for WC 2026 off-season gaps
const EMPTY_COMPARISON_DATA: ComparisonCoreResponse = {
    awayMatches: [],
    awaySummary: null,
    awayTrends: [],
    headToHeadMatches: [],
    homeMatches: [],
    homeSummary: null,
    homeTrends: [],
};

function formatFixtureDateTime(isoDate: string, locale: string) {
    return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(isoDate));
}

function summarizeTeamForm(matches: HistoricalMatch[]) {
    return matches.reduce(
        (summary, match) => {
            if (match.result === 'win') summary.wins += 1;
            else if (match.result === 'draw') summary.draws += 1;
            else if (match.result === 'loss') summary.losses += 1;
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
    return t('Odds shows bookmaker prices and the decision state of every tracked market for this fixture.');
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

/** Loads recently-completed fixtures (FT/AET/PEN) once on mount for Season Review mode. */
function useRecentFixtures(windowDays: number) {
    const [fixtures, setFixtures] = useState<UpcomingFixtureRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setIsLoading(true);
            try {
                const data = await fetchRecentFixtures(windowDays);
                if (cancelled) return;
                setFixtures(data as UpcomingFixtureRecord[]);
            } catch (error) {
                if (cancelled) return;
                console.error('Failed to load recent fixtures', error);
                setFixtures([]);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        void load();
        return () => { cancelled = true; };
    // windowDays is a constant — run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { fixtures, isLoading };
}

function useComparisonData(
    fixtureId: number | null,
    scope: ComparisonScope,
    marketKey: string | null,
    enabled = true,
) {
    const [data, setData] = useState<ComparisonCoreResponse>(EMPTY_COMPARISON_DATA);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        async function loadComparisonPayload() {
            if (!enabled || !fixtureId) {
                setData(EMPTY_COMPARISON_DATA);
                setErrorMessage(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setErrorMessage(null);

            const params = new URLSearchParams({
                fixtureId: String(fixtureId),
                scope,
            });
            if (marketKey) params.set('marketKey', marketKey);

            try {
                const response = await fetchJson<ComparisonCoreResponse>(
                    `/api/v1/comparison?${params.toString()}`,
                    { signal: controller.signal },
                );
                if (controller.signal.aborted) return;
                setData(response);
                setIsLoading(false);
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error('Failed to load comparison data', error);
                setData(EMPTY_COMPARISON_DATA);
                setErrorMessage('Comparison data could not be loaded.');
                setIsLoading(false);
            }
        }

        void loadComparisonPayload();

        return () => {
            controller.abort();
        };
    }, [enabled, fixtureId, scope, marketKey]);

    return { data, errorMessage, isLoading };
}

export default function ComparisonPage() {
    const { locale, t } = useLanguage();
    const { fixtureMode } = useFixtureMode();
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
    const { errorMessage: fixturesErrorMessage, fixtures: upcomingFixtures, isLoading: isUpcomingLoading } = useUpcomingFixtures(upcomingDateWindow);
    const { fixtures: recentFixtures, isLoading: isRecentLoading } = useRecentFixtures(30);

    // Use global fixture mode: upcoming = next 14 days (ascending), recent = last 30 days (descending).
    const fixtures = useMemo(() => {
        const source = fixtureMode === 'upcoming' ? upcomingFixtures : recentFixtures;
        const sorted = [...source];
        if (fixtureMode === 'upcoming') {
            sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else {
            sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        return sorted;
    }, [fixtureMode, upcomingFixtures, recentFixtures]);

    const isFixturesLoading = fixtureMode === 'upcoming' ? isUpcomingLoading : isRecentLoading;
    const showRecentMatches = activeTab === 'recent-matches';
    const showPredictions = activeTab === 'predictions';
    const showStatistics = activeTab === 'statistics';
    const showPlayerStats = activeTab === 'player-stats';
    const showRefereeStats = activeTab === 'referee-stats';
    const showOdds = activeTab === 'odds';

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

    // No explicit reset needed when fixtureMode changes: `fixtures` recomputes from the
    // new mode's pool, so `effectiveDate` falls back to upcomingDates[0] and `effectiveFixture`
    // resolves to null when the previously-selected fixture is absent from the new date.
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
    } = useComparisonData(effectiveFixtureId, scope, selectedMarketKey, needsComparisonData);
    const homeMatches = comparisonData.homeMatches;
    const awayMatches = comparisonData.awayMatches;
    const headToHeadMatches = comparisonData.headToHeadMatches;
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
                    {/* ── Premium Header Bar ── */}
                    <div className="overflow-hidden rounded-[5px] border border-border/60 bg-background">
                        <div className="flex flex-col divide-y divide-border/50 lg:flex-row lg:divide-x lg:divide-y-0">

                            {/* LEFT — Compact matchup */}
                            <div className="flex min-w-0 flex-1 items-center gap-0 px-5 py-4">
                                {effectiveFixture && homeTeam && awayTeam ? (
                                    <>
                                        {/* Home team */}
                                        <div className="flex min-w-0 flex-1 items-center gap-4">
                                            <div className="flex shrink-0">
                                                {homeTeam.logo_url ? (
                                                    <Image
                                                        alt=""
                                                        className="size-14 object-contain drop-shadow-sm"
                                                        height={56}
                                                        src={homeTeam.logo_url}
                                                        width={56}
                                                    />
                                                ) : (
                                                    <div className="flex size-14 items-center justify-center rounded-full bg-muted/20 border border-border/50">
                                                        <span className="text-lg font-bold text-muted-foreground">{homeTeamInitials}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-base font-bold leading-5 text-foreground">{homeTeamNameDisplay}</p>
                                                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{t('Home')}</p>
                                            </div>
                                        </div>

                                        {/* VS badge & Info */}
                                        <div className="mx-6 flex shrink-0 flex-col items-center justify-center gap-1">
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{competitionLabel}</p>
                                            <div className="flex items-center justify-center py-0.5">
                                                <span className="text-xl font-black italic tracking-widest text-muted-foreground/30">VS</span>
                                            </div>
                                            {fixtureDateLabel ? (
                                                <p className="max-w-[160px] text-center text-[11px] font-semibold tracking-wide text-muted-foreground">{fixtureDateLabel}</p>
                                            ) : null}
                                        </div>

                                        {/* Away team */}
                                        <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
                                            <div className="min-w-0 text-right">
                                                <p className="truncate text-base font-bold leading-5 text-foreground">{awayTeamNameDisplay}</p>
                                                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{t('Away')}</p>
                                            </div>
                                            <div className="flex shrink-0">
                                                {awayTeam.logo_url ? (
                                                    <Image
                                                        alt=""
                                                        className="size-14 object-contain drop-shadow-sm"
                                                        height={56}
                                                        src={awayTeam.logo_url}
                                                        width={56}
                                                    />
                                                ) : (
                                                    <div className="flex size-14 items-center justify-center rounded-full bg-muted/20 border border-border/50">
                                                        <span className="text-lg font-bold text-muted-foreground">{awayTeamInitials}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10">
                                            <span className="text-xs font-semibold text-muted-foreground/40">H</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <p className="text-base font-bold text-foreground">{t('No fixture selected')}</p>
                                            <p className="text-xs font-medium text-muted-foreground">{t('Pick a date and match →')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT — Filters panel */}
                            <div className="grid w-full grid-cols-2 gap-4 bg-muted/10 px-5 py-4 sm:flex sm:flex-wrap sm:items-end lg:w-auto lg:min-w-[540px] lg:max-w-[640px]">
                                {/* Label row */}
                                <div className="col-span-2 w-full mb-1 sm:col-span-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">{t('Fixture filters')}</p>
                                </div>

                                {/* Date select */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('Date')}</label>
                                    <Select
                                        disabled={isFixturesLoading || upcomingDates.length === 0}
                                        onValueChange={handleDateChange}
                                        value={effectiveDate}
                                    >
                                        <SelectTrigger className="h-9 w-[160px] bg-background">
                                            <SelectValue placeholder={t('Select date')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isFixturesLoading ? (
                                                <SelectItem value="loading" disabled>{t('Loading...')}</SelectItem>
                                            ) : upcomingDates.length === 0 ? (
                                                <SelectItem value="none" disabled>{t('No dates')}</SelectItem>
                                            ) : (
                                                upcomingDates.map((dateStr) => (
                                                    <SelectItem key={dateStr} value={dateStr}>
                                                        {new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale, {
                                                            weekday: 'short',
                                                            day: '2-digit',
                                                            month: 'short',
                                                        })}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Fixture select */}
                                <div className="flex flex-col gap-1.5 flex-1 min-w-[240px]">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                        {t('Fixture')}{Object.values(groupedFixtures).reduce((n, f) => n + f.length, 0) > 0 ? ` · ${Object.values(groupedFixtures).reduce((n, f) => n + f.length, 0)}` : ''}
                                    </label>
                                    <Select
                                        disabled={isFixturesLoading || Object.keys(groupedFixtures).length === 0}
                                        onValueChange={(val) => handleFixtureChange(val ? Number(val) : null)}
                                        value={effectiveFixtureId?.toString() ?? ''}
                                    >
                                        <SelectTrigger className="h-9 w-full bg-background">
                                            <SelectValue placeholder={t('Select fixture')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isFixturesLoading ? (
                                                <SelectItem value="loading" disabled>{t('Loading fixtures...')}</SelectItem>
                                            ) : Object.keys(groupedFixtures).length === 0 ? (
                                                <SelectItem value="none" disabled>{t('No fixtures for this date')}</SelectItem>
                                            ) : (
                                                Object.entries(groupedFixtures).map(([groupKey, groupFixtures]) => {
                                                    const label = groupKey.split(':').slice(1).join(':');
                                                    return (
                                                        <SelectGroup key={groupKey}>
                                                            <SelectLabel>{label}</SelectLabel>
                                                            {groupFixtures.map((fixture) => {
                                                                const time = new Date(fixture.date).toLocaleTimeString(locale, {
                                                                    hour: '2-digit',
                                                                    hour12: false,
                                                                    minute: '2-digit',
                                                                });
                                                                return (
                                                                    <SelectItem key={fixture.id} value={fixture.id.toString()}>
                                                                        {time} — {fixture.home_team_view?.name ?? fixture.home_team_id} vs {fixture.away_team_view?.name ?? fixture.away_team_id}
                                                                    </SelectItem>
                                                                );
                                                            })}
                                                        </SelectGroup>
                                                    );
                                                })
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Scope toggle */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('Scope')}</label>
                                    <Tabs value={scope} onValueChange={(val) => setScope(val as ComparisonScope)} className="h-9">
                                        <TabsList className="h-full bg-background border border-border/60 p-0.5">
                                            <TabsTrigger value="all" className="text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-foreground data-[state=active]:text-background">{t('All')}</TabsTrigger>
                                            <TabsTrigger value="split" className="text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-foreground data-[state=active]:text-background">{t('H/A')}</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>

                                {/* Mode toggle */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('Mode')}</label>
                                    <FixtureModeToggle />
                                </div>
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

                        <div className="rounded-[5px] border border-border/50 bg-background/50 p-2 backdrop-blur-sm">
                            <TabsNav activeTab={activeTab} onChange={setActiveTab} />
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
                    ) : showPredictions ? (
                        <div className="flex flex-col items-center justify-center rounded-[5px] border border-border/50 bg-background/40 py-24 text-center backdrop-blur-sm">
                            <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
                                <svg className="size-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-foreground">{t('AI Predictions Engine')}</h3>
                            <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-muted-foreground">
                                {t('Join our Telegram channel for early access to our proprietary match prediction models and betting signals.')}
                            </p>
                            <a
                                href="https://t.me/rasermoney"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-[15px] font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:scale-[1.02]"
                            >
                                {t('Join @rasermoney on Telegram')}
                            </a>
                        </div>
                    ) : showOdds ? (
                        <div className="flex flex-col gap-4">
                            <OddsPanel
                                awayTeamName={awayTeam?.name ?? t('Away team')}
                                fixtureId={effectiveFixtureId}
                                homeTeamName={homeTeam?.name ?? t('Home team')}
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
