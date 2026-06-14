'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, CalendarDays, Clock3, Goal, Sparkles, Send, SlidersHorizontal } from 'lucide-react';
import { getDateKey, getDateWindowKeys } from '@/lib/date';
import { fetchJson } from '@/lib/fetch-json';
import { fetchRecentFixtures, fetchUpcomingFixtures } from '@/lib/upcoming-fixtures';
import { StatePanel } from '../components/state-panel';
import { useLanguage } from '../language-provider';
import { useFixtureMode } from '../fixture-mode-provider';
import { FixtureModeToggle } from '../_components/fixture-mode-toggle';
import { HeadToHeadPanel } from './_components/head-to-head-panel';
import { OddsPanel } from './_components/odds-panel';
import { PlayerStatsPanel } from './_components/player-stats-panel';
import { RefereeStatsPanel } from './_components/referee-stats-panel';
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
    MARKET_GROUPS,
} from '../market-catalog';
import type {
    ComparisonScope,
    ComparisonCoreResponse,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

type TeamIdentityProps = {
    align: 'left' | 'right';
    initials: string;
    logoUrl: string | null;
    name: string;
    sideLabel: string;
};

type ComparisonAlertProps = {
    message: string;
    title: string;
};

function TeamIdentity({ align, initials, logoUrl, name, sideLabel }: TeamIdentityProps) {
    const isRight = align === 'right';

    return (
        <div
            className={cn(
                'flex min-w-0 flex-col items-center gap-1.5 text-center',
                isRight ? 'sm:flex-row-reverse sm:text-right' : 'sm:flex-row sm:text-left',
            )}
        >
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-border/70 bg-muted/15 sm:size-10">
                {logoUrl ? (
                    <Image alt={`${name} logo`} className="size-6 object-contain sm:size-7" height={28} src={logoUrl} width={28} />
                ) : (
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground sm:text-[12px]">{initials}</span>
                )}
            </div>
            <div className="min-w-0 space-y-0 sm:space-y-1">
                <p className="line-clamp-2 text-[12px] font-semibold leading-tight tracking-tight text-foreground sm:truncate sm:text-[15px] sm:leading-normal">{name}</p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px]">{sideLabel}</p>
            </div>
        </div>
    );
}

function ComparisonNotice({ message, title }: ComparisonAlertProps) {
    return (
        <Alert className="border-destructive/20" variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
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
    const [showFiltersMobile, setShowFiltersMobile] = useState(false);

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
    const showStreaks = activeTab === 'streaks';
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
    const needsComparisonData = showRecentMatches || showStatistics || showStreaks || showRefereeStats;
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

    const fixtureDateLabel = effectiveFixture ? formatFixtureDateTime(effectiveFixture.date, locale) : null;
    const competitionLabel = effectiveLeagueName ?? t('League');
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
        <div className="comparison-page flex min-h-full flex-col overflow-x-hidden px-4 py-4 [font-family:var(--font-ui)] md:px-6 md:py-6">
            <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
                <section className="flex flex-col gap-2">
                    <div className="overflow-hidden rounded-[6px] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]">
                        <div className="px-4 py-3 sm:px-5 sm:py-3.5">
                            {effectiveFixture && homeTeam && awayTeam ? (
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2">
                                    <TeamIdentity
                                        align="left"
                                        initials={homeTeamInitials}
                                        logoUrl={homeTeam.logo_url ?? null}
                                        name={homeTeamNameDisplay}
                                        sideLabel={t('Home')}
                                    />
                                    <div className="flex flex-col items-center px-1 text-center sm:px-5">
                                        <span className="text-[12px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/55">{t('vs')}</span>
                                        <span className="mt-1 line-clamp-2 text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:whitespace-nowrap sm:text-[10px]">{competitionLabel}</span>
                                        {fixtureDateLabel ? (
                                            <span className="whitespace-nowrap text-[11px] leading-4 text-muted-foreground/80">{fixtureDateLabel}</span>
                                        ) : null}
                                    </div>
                                    <TeamIdentity
                                        align="right"
                                        initials={awayTeamInitials}
                                        logoUrl={awayTeam.logo_url ?? null}
                                        name={awayTeamNameDisplay}
                                        sideLabel={t('Away')}
                                    />
                                </div>
                            ) : (
                                <div className="flex min-h-[108px] items-center rounded-[6px] border border-dashed border-border/70 bg-background/60 px-4">
                                    <div className="space-y-1">
                                        <p className="text-base font-semibold tracking-tight text-foreground">{t('No fixture selected')}</p>
                                        <p className="text-sm text-muted-foreground">{t('Choose a date and match to load the workspace.')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[6px] border border-border/60 bg-background">
                        <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5 xl:hidden">
                            <h2 className="text-sm font-semibold text-foreground">{t('Global Filters')}</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2 border-border/60 bg-muted/50 text-xs font-medium"
                                onClick={() => setShowFiltersMobile((prev) => !prev)}
                            >
                                <SlidersHorizontal className="size-3.5" />
                                {t('Filtros')}
                            </Button>
                        </div>
                        <div
                            className={cn(
                                'grid gap-2 px-4 py-2.5 xl:grid-cols-4',
                                showFiltersMobile ? 'grid' : 'hidden xl:grid',
                            )}
                        >

                            <div className="flex h-11 items-center overflow-hidden rounded-[6px] border border-border/60 bg-muted/[0.08]">
                                <span className="flex h-full shrink-0 items-center px-3">
                                    <CalendarDays className="size-3.5 text-muted-foreground" />
                                </span>
                                <Select
                                    disabled={isFixturesLoading || upcomingDates.length === 0}
                                    onValueChange={handleDateChange}
                                    value={effectiveDate}
                                >
                                    <SelectTrigger className="h-11 flex-1 rounded-none border-0 bg-transparent px-3 shadow-none">
                                        <SelectValue placeholder={t('Select date')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isFixturesLoading ? (
                                            <SelectItem disabled value="loading">
                                                {t('Loading...')}
                                            </SelectItem>
                                        ) : upcomingDates.length === 0 ? (
                                            <SelectItem disabled value="none">
                                                {t('No dates')}
                                            </SelectItem>
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

                            <div className="flex h-11 items-center overflow-hidden rounded-[6px] border border-border/60 bg-muted/[0.08]">
                                <span className="flex h-full shrink-0 items-center px-3">
                                    <Goal className="size-3.5 text-muted-foreground" />
                                </span>
                                <Select
                                    disabled={isFixturesLoading || Object.keys(groupedFixtures).length === 0}
                                    onValueChange={(val) => handleFixtureChange(val ? Number(val) : null)}
                                    value={effectiveFixtureId?.toString() ?? ''}
                                >
                                    <SelectTrigger className="h-11 flex-1 rounded-none border-0 bg-transparent px-3 shadow-none">
                                        <SelectValue placeholder={t('Select fixture')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isFixturesLoading ? (
                                            <SelectItem disabled value="loading">
                                                {t('Loading fixtures...')}
                                            </SelectItem>
                                        ) : Object.keys(groupedFixtures).length === 0 ? (
                                            <SelectItem disabled value="none">
                                                {t('No fixtures for this date')}
                                            </SelectItem>
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
                                                                    {time} - {fixture.home_team_view?.name ?? fixture.home_team_id} vs{' '}
                                                                    {fixture.away_team_view?.name ?? fixture.away_team_id}
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

                            <div className="flex h-11 items-center overflow-hidden rounded-[6px] border border-border/60 bg-muted/[0.08]">
                                <span className="shrink-0 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    {t('Scope')}
                                </span>
                                <Tabs className="flex-1" onValueChange={(val) => setScope(val as ComparisonScope)} value={scope}>
                                    <TabsList className="grid h-11 w-full grid-cols-2 rounded-none border-0 bg-transparent p-0.5">
                                        <TabsTrigger
                                            className="rounded-[4px] text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground data-[state=active]:bg-zinc-950 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-zinc-950"
                                            value="all"
                                        >
                                            {t('All')}
                                        </TabsTrigger>
                                        <TabsTrigger
                                            className="rounded-[4px] text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground data-[state=active]:bg-zinc-950 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-zinc-950"
                                            value="split"
                                        >
                                            {t('H/A')}
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            <div className="flex h-11 items-center overflow-hidden rounded-[6px] border border-border/60 bg-muted/[0.08]">
                                <span className="flex h-full shrink-0 items-center px-3">
                                    <Clock3 className="size-3.5 text-muted-foreground" />
                                </span>
                                <FixtureModeToggle
                                    className="h-11 rounded-none border-0 bg-transparent p-0.5"
                                    itemClassName="rounded-[4px]"
                                />
                            </div>
                        </div>


                    </div>

                    <div className="overflow-hidden rounded-[6px] border border-border/60 bg-background px-3 py-2">
                        <div className="overflow-x-auto">
                            <TabsNav activeTab={activeTab} onChange={setActiveTab} />
                        </div>
                    </div>

                    {fixturesErrorMessage ? (
                        <ComparisonNotice
                            message={t(fixturesErrorMessage)}
                            title={t('Fixtures could not be loaded')}
                        />
                    ) : null}

                    {comparisonErrorMessage && needsComparisonData ? (
                        <ComparisonNotice
                            message={t(comparisonErrorMessage)}
                            title={t('Comparison data could not be loaded')}
                        />
                    ) : null}

                    {showRecentMatches ? (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-[6px] border border-border/60 bg-muted/10 px-4 py-2.5">
                                <div className="flex h-10 items-center overflow-hidden rounded-[6px] border border-border/60 bg-background">
                                    <span className="flex h-full shrink-0 items-center px-3">
                                        <BarChart3 className="size-3.5 text-muted-foreground" />
                                    </span>
                                    <Select value={selectedMarketGroupId} onValueChange={handleMarketGroupChange}>
                                        <SelectTrigger className="h-10 flex-1 rounded-none border-0 bg-transparent px-3 shadow-none">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MARKET_GROUPS.map((group) => (
                                                <SelectItem key={group.id} value={group.id}>
                                                    {t(group.label)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex h-10 items-center overflow-hidden rounded-[6px] border border-border/60 bg-background">
                                    <span className="flex h-full shrink-0 items-center px-3">
                                        <Sparkles className="size-3.5 text-muted-foreground" />
                                    </span>
                                    <Select value={selectedMarketKey} onValueChange={setSelectedMarketKey}>
                                        <SelectTrigger className="h-10 flex-1 rounded-none border-0 bg-transparent px-3 shadow-none">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getMarketGroup(selectedMarketGroupId).lines.map((line) => (
                                                <SelectItem key={line.key} value={line.key}>
                                                    {t(line.label)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {/* Unified: Home | Away tables + H2H in one bordered container */}
                            <div className="overflow-hidden rounded-[6px] border border-border/60">
                                <div className="grid md:grid-cols-2">
                                    <TeamPanel
                                        accent="left"
                                        className="rounded-none border-0 border-b border-border/60 md:border-b-0 md:border-r md:border-border/60"
                                        emptyMessage={t('No matches found for this home-side view.')}
                                        isLoading={isHomeLoading}
                                        marketKey={selectedMarketKey}
                                        matches={homeMatches}
                                        teamLogoUrl={homeTeam?.logo_url ?? null}
                                        teamName={homeTeam?.name ?? t('Select home team')}
                                    />
                                    <TeamPanel
                                        accent="right"
                                        className="rounded-none border-0"
                                        emptyMessage={t('No matches found for this away-side view.')}
                                        isLoading={isAwayLoading}
                                        marketKey={selectedMarketKey}
                                        matches={awayMatches}
                                        teamLogoUrl={awayTeam?.logo_url ?? null}
                                        teamName={awayTeam?.name ?? t('Select away team')}
                                    />
                                </div>
                                <HeadToHeadPanel
                                    awayTeamName={awayTeam?.name ?? t('Away team')}
                                    className="rounded-none border-0 border-t border-border/60"
                                    data={headToHeadMatches}
                                    emptyMessage={t('No head-to-head matches found for this setup.')}
                                    homeTeamName={homeTeam?.name ?? t('Home team')}
                                    isLoading={isHeadToHeadLoading}
                                    marketKey={selectedMarketKey}
                                    scopeLabel={scope === 'all' ? t('All matches') : t('Home / Away')}
                                />
                            </div>

                            {/* Averages — centered, constrained width */}
                            <div className="mx-auto w-full max-w-3xl">
                                <StatisticsSummaryPanel
                                    awaySummary={awayStatSummary}
                                    awayTeamName={awayTeam?.name ?? t('Away team')}
                                    homeSummary={homeStatSummary}
                                    homeTeamName={homeTeam?.name ?? t('Home team')}
                                    isLoading={isHomeStatSummaryLoading || isAwayStatSummaryLoading}
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
                    ) : showStreaks ? (
                        <div className="grid gap-4 md:grid-cols-2">
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
                        <div className="flex flex-col items-center justify-center rounded-md border border-border/70 bg-muted/10 py-12 px-4 text-center shadow-sm">
                            <Send className="mb-4 size-10 text-foreground" />
                            <h2 className="mb-2 text-xl font-bold text-foreground">{t('Predictions')}</h2>
                            <p className="mb-6 max-w-sm text-[13px] text-muted-foreground">
                                {t('Contact us to get daily predictions and signals.')}
                            </p>
                            <Button asChild size="default" className="font-bold">
                                <a href="https://t.me/rasermoney" rel="noopener noreferrer" target="_blank">
                                    {t('Contact @rasermoney')}
                                </a>
                            </Button>
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
