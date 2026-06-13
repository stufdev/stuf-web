'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/lib/fetch-json';
import { useLanguage } from '../../language-provider';
import { getTeamName } from '../helpers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  ComparisonScope,
  MarketDefinitionRelation,
  TeamMarketTrendRecord,
  TeamRelation,
  TeamStatAveragesRecord,
} from '../types';

type RefereeStatsPanelProps = {
  awaySummary: TeamStatAveragesRecord | null;
  awayTeamName: string;
  awayTrends: TeamMarketTrendRecord[];
  homeSummary: TeamStatAveragesRecord | null;
  homeTeamName: string;
  homeTrends: TeamMarketTrendRecord[];
  isTeamDataLoading?: boolean;
  leagueId: number | null;
  refereeId: number | null;
  refereeName: string | null;
  scope: ComparisonScope;
  season: number | null;
};

type RefereeRecord = {
  id: number;
  name: string;
};

type RefereeFixtureFactRecord = {
  fixture_id: number;
  referee_id: number;
  league_id: number;
  season: number;
  played_at: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_cards: number | null;
  away_cards: number | null;
  total_cards: number | null;
  home_booking_points: number | null;
  away_booking_points: number | null;
  total_booking_points: number | null;
  total_yellow_cards: number | null;
  total_red_cards: number | null;
  total_fouls: number | null;
  penalties: number | null;
};

type RefereeMarketStatsRecord = {
  referee_id: number;
  league_id: number;
  season: number;
  category: 'booking_points' | 'cards';
  market_key: string;
  sample: number;
  hits: number;
  percentage: number;
  current_streak: number;
  longest_streak: number;
  updated_at: string;
  market_definition?: MarketDefinitionRelation | MarketDefinitionRelation[] | null;
};

type RefereeFixtureRecord = {
  id: number;
  date: string;
  league_id: number;
  season: number;
  status_short: string | null;
  home_team_id: number;
  away_team_id: number;
  home_goals: number | null;
  away_goals: number | null;
  home_team: TeamRelation | TeamRelation[] | null;
  away_team: TeamRelation | TeamRelation[] | null;
};

type RecentRefereeFixture = RefereeFixtureRecord & {
  fact: RefereeFixtureFactRecord | null;
  leagueName: string;
};

type ComparisonRefereeStatsResponse = {
  currentFacts: RefereeFixtureFactRecord[];
  marketStats: RefereeMarketStatsRecord[];
  recentFixtures: RecentRefereeFixture[];
  referee: RefereeRecord | null;
};

type HighlightOption = {
  id: string;
  label: string;
  predicate: (fact: RefereeFixtureFactRecord | null) => boolean;
};

const REFEREE_MARKET_GROUPS = [
  {
    title: 'Total Match Booking Points',
    markets: [
      ['MATCH_OVER_15_BOOKING_POINTS', 'Over 15'],
      ['MATCH_OVER_25_BOOKING_POINTS', 'Over 25'],
      ['MATCH_OVER_35_BOOKING_POINTS', 'Over 35'],
      ['MATCH_OVER_45_BOOKING_POINTS', 'Over 45'],
      ['MATCH_OVER_55_BOOKING_POINTS', 'Over 55'],
      ['MATCH_OVER_65_BOOKING_POINTS', 'Over 65'],
    ],
  },
  {
    title: 'Each Team Booking Points',
    markets: [
      ['EACH_TEAM_OVER_5_BOOKING_POINTS', 'Over 5'],
      ['EACH_TEAM_OVER_15_BOOKING_POINTS', 'Over 15'],
      ['EACH_TEAM_OVER_25_BOOKING_POINTS', 'Over 25'],
    ],
  },
  {
    title: 'Total Match Cards',
    markets: [
      ['MATCH_OVER_1_5_CARDS', 'Over 1.5'],
      ['MATCH_OVER_2_5_CARDS', 'Over 2.5'],
      ['MATCH_OVER_3_5_CARDS', 'Over 3.5'],
      ['MATCH_OVER_4_5_CARDS', 'Over 4.5'],
      ['MATCH_OVER_5_5_CARDS', 'Over 5.5'],
      ['MATCH_OVER_6_5_CARDS', 'Over 6.5'],
    ],
  },
  {
    title: 'Each Team Cards',
    markets: [
      ['EACH_TEAM_OVER_0_5_CARDS', 'Over 0.5'],
      ['EACH_TEAM_OVER_1_5_CARDS', 'Over 1.5'],
      ['EACH_TEAM_OVER_2_5_CARDS', 'Over 2.5'],
    ],
  },
] as const;

const HIGHLIGHT_OPTIONS: HighlightOption[] = [
  { id: 'none', label: 'None', predicate: () => false },
  { id: 'bp15', label: 'Over 15 Total Booking Points', predicate: (fact) => over(fact?.total_booking_points, 15) },
  { id: 'bp25', label: 'Over 25 Total Booking Points', predicate: (fact) => over(fact?.total_booking_points, 25) },
  { id: 'bp35', label: 'Over 35 Total Booking Points', predicate: (fact) => over(fact?.total_booking_points, 35) },
  { id: 'bp45', label: 'Over 45 Total Booking Points', predicate: (fact) => over(fact?.total_booking_points, 45) },
  { id: 'bp55', label: 'Over 55 Total Booking Points', predicate: (fact) => over(fact?.total_booking_points, 55) },
  { id: 'bp65', label: 'Over 65 Total Booking Points', predicate: (fact) => over(fact?.total_booking_points, 65) },
  {
    id: 'each-bp5',
    label: 'Each Team Over 5 Booking Points',
    predicate: (fact) => over(fact?.home_booking_points, 5) && over(fact?.away_booking_points, 5),
  },
  {
    id: 'each-bp15',
    label: 'Each Team Over 15 Booking Points',
    predicate: (fact) => over(fact?.home_booking_points, 15) && over(fact?.away_booking_points, 15),
  },
  {
    id: 'each-bp25',
    label: 'Each Team Over 25 Booking Points',
    predicate: (fact) => over(fact?.home_booking_points, 25) && over(fact?.away_booking_points, 25),
  },
  { id: 'cards15', label: 'Over 1.5 Total Cards', predicate: (fact) => over(fact?.total_cards, 1.5) },
  { id: 'cards25', label: 'Over 2.5 Total Cards', predicate: (fact) => over(fact?.total_cards, 2.5) },
  { id: 'cards35', label: 'Over 3.5 Total Cards', predicate: (fact) => over(fact?.total_cards, 3.5) },
  { id: 'cards45', label: 'Over 4.5 Total Cards', predicate: (fact) => over(fact?.total_cards, 4.5) },
  { id: 'cards55', label: 'Over 5.5 Total Cards', predicate: (fact) => over(fact?.total_cards, 5.5) },
  { id: 'cards65', label: 'Over 6.5 Total Cards', predicate: (fact) => over(fact?.total_cards, 6.5) },
  {
    id: 'each-cards05',
    label: 'Each Team Over 0.5 Cards',
    predicate: (fact) => over(fact?.home_cards, 0.5) && over(fact?.away_cards, 0.5),
  },
  {
    id: 'each-cards15',
    label: 'Each Team Over 1.5 Cards',
    predicate: (fact) => over(fact?.home_cards, 1.5) && over(fact?.away_cards, 1.5),
  },
  {
    id: 'each-cards25',
    label: 'Each Team Over 2.5 Cards',
    predicate: (fact) => over(fact?.home_cards, 2.5) && over(fact?.away_cards, 2.5),
  },
];

function over(value: number | null | undefined, line: number) {
  return value != null && value > line;
}

function average(values: Array<number | null | undefined>) {
  const numericValues = values.filter((value): value is number => value != null);
  if (numericValues.length === 0) return null;
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function formatDecimal(value: number | null | undefined, decimals = 1) {
  if (value == null || Number.isNaN(value)) return '';
  return value.toFixed(decimals);
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '-';
  return `${Math.round(value)}%`;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(value))
    .replace(',', '');
}

function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
  }).format(new Date(value));
}

function getScopedTeamLabel(teamName: string, side: string, scope: ComparisonScope) {
  if (scope === 'all') return teamName;
  return `${teamName} (${side})`;
}

function getScopeLabel(scope: ComparisonScope) {
  return scope === 'all' ? 'All team matches' : 'Home/Away team matches';
}

function byMarketKey<T extends { market_key: string }>(records: T[]) {
  return Object.fromEntries(records.map((record) => [record.market_key, record])) as Record<string, T>;
}

function getDefinition(record: RefereeMarketStatsRecord | TeamMarketTrendRecord | null) {
  const relation = record?.market_definition;
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function MarketValueCell({ record }: { record: RefereeMarketStatsRecord | TeamMarketTrendRecord | null }) {
  const { language } = useLanguage();

  if (!record || record.sample <= 0) {
    return <span className="text-[12px] font-bold text-muted-foreground">-</span>;
  }

  const width = `${Math.max(0, Math.min(100, record.percentage))}%`;
  const streak =
    record.current_streak >= 3
      ? language === 'es'
        ? `${record.current_streak} partidos seguidos`
        : `${record.current_streak} match streak`
      : null;

  return (
    <div className="min-w-[120px]">
      <div className="relative h-6 overflow-hidden rounded-[4px] border border-border/50 bg-background/50">
        <div className="absolute inset-y-0 left-0 bg-primary" style={{ width }} />
        <span className={`relative z-10 flex h-full items-center px-2 text-[11px] font-bold ${record.percentage >= 50 ? 'text-primary-foreground' : 'text-foreground'}`}>
          {formatPercent(record.percentage)}
        </span>
      </div>
      {streak ? <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{streak}</p> : null}
    </div>
  );
}

function AverageValueCell({ value, maxValue }: { value: number | null; maxValue: number | null }) {
  if (value == null) return <TableCell className="border-l border-border/50 px-2 py-1.5" />;

  const isMax = maxValue != null && value === maxValue;
  return (
      <TableCell
      className={`border-l border-border/50 px-2 py-1.5 text-center text-[12px] tabular-nums ${isMax ? 'bg-emerald-500/10 font-bold text-foreground' : 'font-semibold text-muted-foreground'
        }`}
      >
        {formatDecimal(value)}
    </TableCell>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <TableRow className="border-t border-border/50 hover:bg-transparent">
      <TableCell
        className="bg-muted/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground"
        colSpan={4}
      >
        {label}
      </TableCell>
    </TableRow>
  );
}

function MatchCountRow({ refereeMatches, homeMatches, awayMatches }: { refereeMatches: number; homeMatches: number | null; awayMatches: number | null }) {
  const { t } = useLanguage();

    return (
      <TableRow className="border-border/50 hover:bg-transparent">
      <TableCell className="bg-muted/10 px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-widest text-foreground">
          {t('Matches')}
        </TableCell>
      <TableCell className="border-l border-border/50 px-2 py-1.5 text-center text-[12px] font-bold tabular-nums text-muted-foreground">
          {refereeMatches || '-'}
        </TableCell>
      <TableCell className="border-l border-border/50 px-2 py-1.5 text-center text-[12px] font-bold tabular-nums text-muted-foreground">
          {homeMatches ?? '-'}
        </TableCell>
      <TableCell className="border-l border-border/50 px-2 py-1.5 text-center text-[12px] font-bold tabular-nums text-muted-foreground">
          {awayMatches ?? '-'}
        </TableCell>
      </TableRow>
  );
}

function AverageDataRow({ label, values }: { label: string; values: [number | null, number | null, number | null] }) {
  const maxValue = values.filter((value): value is number => value != null).reduce<number | null>(
    (max, value) => (max == null || value > max ? value : max),
    null,
  );

  return (
    <TableRow className="border-border/50 hover:bg-muted/30">
      <TableCell className="px-3 py-1.5 text-left text-[11px] font-bold text-muted-foreground">
        {label}
      </TableCell>
      {values.map((value, index) => (
        <AverageValueCell key={`${label}-${index}`} maxValue={maxValue} value={value} />
      ))}
    </TableRow>
  );
}

function RefereeAverageSummary({
  awaySummary,
  awayTeamName,
  currentFacts,
  homeSummary,
  homeTeamName,
  refereeName,
  scope,
}: {
  awaySummary: TeamStatAveragesRecord | null;
  awayTeamName: string;
  currentFacts: RefereeFixtureFactRecord[];
  homeSummary: TeamStatAveragesRecord | null;
  homeTeamName: string;
  refereeName: string;
  scope: ComparisonScope;
}) {
  const { t } = useLanguage();
  const refereeAvgBooking = average(currentFacts.map((fact) => fact.total_booking_points));
  const refereeAvgCards = average(currentFacts.map((fact) => fact.total_cards));

  return (
    <section className="flex flex-col">
      <div className="border-b border-border/50 bg-muted/10 px-4 py-2 text-center">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('Season average stats in league')}</h3>
      </div>

      <div className="flex justify-center px-4 py-4">
        <div className="rounded-md bg-muted/20 border border-border/50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {t(getScopeLabel(scope))}
        </div>
      </div>

      <div className="overflow-x-auto p-4 pt-0">
        <div className="rounded-md border border-border/50 bg-background shadow-sm">
        <Table className="min-w-[560px]">
          <TableHeader className="bg-muted/20">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="h-8 px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground" />
              <TableHead className="border-l border-border/50 h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                {t('Referee')} ({refereeName})
              </TableHead>
              <TableHead className="border-l border-border/50 h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                {getScopedTeamLabel(homeTeamName, t('Home').toLowerCase(), scope)}
              </TableHead>
              <TableHead className="border-l border-border/50 h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                {getScopedTeamLabel(awayTeamName, t('Away').toLowerCase(), scope)}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <MatchCountRow
              awayMatches={awaySummary?.matches_played ?? null}
              homeMatches={homeSummary?.matches_played ?? null}
              refereeMatches={currentFacts.length}
            />
            <SectionRow label={t('Avg Match Booking Points')} />
            <AverageDataRow
              label={t('Total')}
              values={[refereeAvgBooking, homeSummary?.avg_booking_points_total ?? null, awaySummary?.avg_booking_points_total ?? null]}
            />
            <AverageDataRow
              label={t('For')}
              values={[null, homeSummary?.avg_booking_points_for ?? null, awaySummary?.avg_booking_points_for ?? null]}
            />
            <AverageDataRow
              label={t('Against')}
              values={[null, homeSummary?.avg_booking_points_against ?? null, awaySummary?.avg_booking_points_against ?? null]}
            />
            <SectionRow label={t('Avg Match Cards')} />
            <AverageDataRow
              label={t('Total')}
              values={[refereeAvgCards, homeSummary?.avg_cards_total ?? null, awaySummary?.avg_cards_total ?? null]}
            />
            <AverageDataRow label={t('For')} values={[null, homeSummary?.avg_cards_for ?? null, awaySummary?.avg_cards_for ?? null]} />
            <AverageDataRow label={t('Against')} values={[null, homeSummary?.avg_cards_against ?? null, awaySummary?.avg_cards_against ?? null]} />
          </TableBody>
        </Table>
        </div>
      </div>
    </section>
  );
}

function RefereeMarketComparison({
  awayTeamName,
  awayTrends,
  homeTeamName,
  homeTrends,
  marketStats,
  refereeName,
  scope,
}: {
  awayTeamName: string;
  awayTrends: TeamMarketTrendRecord[];
  homeTeamName: string;
  homeTrends: TeamMarketTrendRecord[];
  marketStats: RefereeMarketStatsRecord[];
  refereeName: string;
  scope: ComparisonScope;
}) {
  const { t } = useLanguage();
  const refereeByKey = useMemo(() => byMarketKey(marketStats), [marketStats]);
  const homeByKey = useMemo(() => byMarketKey(homeTrends), [homeTrends]);
  const awayByKey = useMemo(() => byMarketKey(awayTrends), [awayTrends]);

  return (
    <section className="flex flex-col">
      <div className="border-b border-border/50 bg-muted/10 px-4 py-2 text-center">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('Compare Referee and Team season market statistics')}</h3>
      </div>

      <div className="flex flex-col gap-2 px-4 py-4">
        <div className="mx-auto rounded-md bg-muted/20 border border-border/50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {t(getScopeLabel(scope))}
        </div>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('* streak text = current match streak')}</p>
      </div>

      <div className="overflow-x-auto px-4 pb-4">
        <div className="rounded-md border border-border/50 bg-background shadow-sm">
        <Table className="min-w-[780px]">
          <TableHeader className="bg-muted/20">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="h-8 px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground" />
              <TableHead className="border-l border-border/50 h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                {t('Referee')} ({refereeName})
              </TableHead>
              <TableHead className="border-l border-border/50 h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                {getScopedTeamLabel(homeTeamName, t('Home').toLowerCase(), scope)}
              </TableHead>
              <TableHead className="border-l border-border/50 h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-foreground">
                {getScopedTeamLabel(awayTeamName, t('Away').toLowerCase(), scope)}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <MatchCountRow
              awayMatches={awayTrends[0]?.sample ?? null}
              homeMatches={homeTrends[0]?.sample ?? null}
              refereeMatches={marketStats[0]?.sample ?? 0}
            />
            {REFEREE_MARKET_GROUPS.map((group) => (
              <Fragment key={group.title}>
                <SectionRow key={`${group.title}-section`} label={t(group.title)} />
                {group.markets.map(([marketKey, fallbackLabel]) => {
                  const refereeRecord = refereeByKey[marketKey] ?? null;
                  const label = getDefinition(refereeRecord)?.label ?? fallbackLabel;
                  return (
                    <TableRow key={marketKey} className="border-border/50 hover:bg-muted/30">
                      <TableCell className="px-3 py-1.5 text-left text-[11px] font-bold text-muted-foreground">
                        {t(label.replace(' Booking Points', '').replace(' Total Cards', ''))}
                      </TableCell>
                      <TableCell className="border-l border-border/50 px-2 py-1.5">
                        <MarketValueCell record={refereeRecord} />
                      </TableCell>
                      <TableCell className="border-l border-border/50 px-2 py-1.5">
                        <MarketValueCell record={homeByKey[marketKey] ?? null} />
                      </TableCell>
                      <TableCell className="border-l border-border/50 px-2 py-1.5">
                        <MarketValueCell record={awayByKey[marketKey] ?? null} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </section>
  );
}

function RefereeRecentFixtures({ fixtures, refereeName }: { fixtures: RecentRefereeFixture[]; refereeName: string }) {
  const { locale, t } = useLanguage();
  const [highlightId, setHighlightId] = useState('none');
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | 'all'>('all');
  const [expanded, setExpanded] = useState(false);

  const competitionTabs = useMemo(() => {
    const leagues = new Map<number, string>();
    fixtures.forEach((fixture) => leagues.set(fixture.league_id, fixture.leagueName));
    return [...leagues.entries()].map(([id, label]) => ({ id, label }));
  }, [fixtures]);

  const activeLeagueId =
    selectedLeagueId !== 'all' && competitionTabs.some((tab) => tab.id === selectedLeagueId) ? selectedLeagueId : 'all';
  const activeHighlight = HIGHLIGHT_OPTIONS.find((option) => option.id === highlightId) ?? HIGHLIGHT_OPTIONS[0];
  const filteredFixtures = activeLeagueId === 'all'
    ? fixtures
    : fixtures.filter((fixture) => fixture.league_id === activeLeagueId);
  const visibleFixtures = expanded ? filteredFixtures : filteredFixtures.slice(0, 10);

  return (
    <section className="overflow-hidden rounded-md border border-border/60 bg-background shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/50 bg-muted/20 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-[14px] font-bold uppercase tracking-widest text-foreground">{refereeName} {t('Recent Fixtures')}</h3>
        <Select value={highlightId} onValueChange={setHighlightId}>
          <SelectTrigger className="w-full lg:w-[280px] h-9 bg-background">
            <SelectValue placeholder={t('Select market to highlight')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('None (Clear highlight)')}</SelectItem>
            {HIGHLIGHT_OPTIONS.filter((option) => option.id !== 'none').map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {t(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-b border-border/50 px-2 py-1.5">
        <Tabs value={String(activeLeagueId)} onValueChange={(v) => setSelectedLeagueId(v === 'all' ? 'all' : Number(v))} className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="flex h-10 w-max justify-start bg-transparent p-1">
              <TabsTrigger
                value="all"
                className="text-[12px] font-medium tracking-wide data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm px-3 h-full rounded-sm transition-all"
              >
                {t('All competitions')}
              </TabsTrigger>
              {competitionTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={String(tab.id)}
                  className="text-[12px] font-medium tracking-wide data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm px-3 h-full rounded-sm transition-all"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader className="bg-muted/10">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="h-8 px-3 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Date')}</TableHead>
              <TableHead className="h-8 px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Competition')}</TableHead>
              <TableHead className="h-8 px-3 py-1 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Home')}</TableHead>
              <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Fixture')}</TableHead>
              <TableHead className="h-8 px-3 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Away')}</TableHead>
              <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Booking Points')}</TableHead>
              <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Total Points')}</TableHead>
              <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Fouls')}</TableHead>
              <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Yellows')}</TableHead>
              <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Reds')}</TableHead>
              <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Pens')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleFixtures.map((fixture) => {
              const fact = fixture.fact;
              const isHighlighted = activeHighlight.predicate(fact);
              const isFinal = ['FT', 'AET', 'PEN'].includes(fixture.status_short ?? '');
              const scoreOrTime = isFinal && fixture.home_goals != null && fixture.away_goals != null
                  ? `${fixture.home_goals} - ${fixture.away_goals}`
                  : formatTime(fixture.date, locale);
              return (
                <TableRow
                  className={`border-border/50 transition-colors ${isHighlighted ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'hover:bg-muted/30'}`}
                  key={fixture.id}
                >
                  <TableCell className="px-3 py-1.5 text-[11px] font-medium tabular-nums text-muted-foreground whitespace-nowrap">{formatDate(fixture.date, locale)}</TableCell>
                  <TableCell className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{fixture.leagueName}</TableCell>
                  <TableCell className="px-3 py-1.5 text-right text-[13px] font-semibold text-foreground">{getTeamName(fixture.home_team) ?? t('Home team')}</TableCell>
                  <TableCell className="px-2 py-1.5 text-center">
                    <span className="inline-flex min-w-[54px] justify-center rounded-md border border-border/60 bg-muted/20 px-2 py-0.5 font-bold tabular-nums text-[12px] text-foreground shadow-sm">
                      {scoreOrTime}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-[13px] font-semibold text-foreground">{getTeamName(fixture.away_team) ?? t('Away team')}</TableCell>
                  <TableCell className="px-2 py-1.5 text-center text-[12px] font-bold tabular-nums text-muted-foreground">
                    {fact ? `${fact.home_booking_points ?? 0} - ${fact.away_booking_points ?? 0}` : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-center text-[12px] font-bold tabular-nums text-muted-foreground">{fact?.total_booking_points ?? '-'}</TableCell>
                  <TableCell className="px-2 py-1.5 text-center text-[12px] font-bold tabular-nums text-muted-foreground">{fact?.total_fouls ?? '-'}</TableCell>
                  <TableCell className="px-2 py-1.5 text-center">
                    {fact?.total_yellow_cards != null ? (
                      <span className="inline-flex min-w-6 justify-center rounded-md bg-[#ffd34d] px-1 py-0.5 text-[11px] font-bold text-[#281700] shadow-sm">
                        {fact.total_yellow_cards}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-center">
                    {fact?.total_red_cards ? (
                      <span className="inline-flex min-w-6 justify-center rounded-md bg-[#d52f33] px-1 py-0.5 text-[11px] font-bold text-white shadow-sm">
                        {fact.total_red_cards}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-center text-[12px] font-bold tabular-nums text-muted-foreground">{fact?.penalties ?? '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filteredFixtures.length > 10 ? (
        <div className="flex justify-center border-t border-border/50 px-4 py-3">
          <button
            className="rounded-md border border-border/60 bg-muted/20 px-4 py-2 text-[12px] font-semibold text-foreground transition-colors hover:border-border hover:bg-muted/40"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
             {expanded ? t('Show less Fixtures') : t('Show more Fixtures')}
           </button>
        </div>
      ) : null}
    </section>
  );
}

export function RefereeStatsPanel({
  awaySummary,
  awayTeamName,
  awayTrends,
  homeSummary,
  homeTeamName,
  homeTrends,
  isTeamDataLoading = false,
  leagueId,
  refereeId,
  refereeName,
  scope,
  season,
}: RefereeStatsPanelProps) {
  const { t } = useLanguage();
  const [referee, setReferee] = useState<RefereeRecord | null>(null);
  const [currentFacts, setCurrentFacts] = useState<RefereeFixtureFactRecord[]>([]);
  const [marketStats, setMarketStats] = useState<RefereeMarketStatsRecord[]>([]);
  const [recentFixtures, setRecentFixtures] = useState<RecentRefereeFixture[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRefereeStats() {
      if (!refereeId || !leagueId || !season) {
        setReferee(null);
        setCurrentFacts([]);
        setMarketStats([]);
        setRecentFixtures([]);
        setWarning(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetchJson<ComparisonRefereeStatsResponse>(
          `/api/v1/comparison/referee-stats?refereeId=${refereeId}&leagueId=${leagueId}&season=${season}`,
        );

        if (cancelled) return;

        setReferee(response.referee);
        setCurrentFacts(response.currentFacts);
        setMarketStats(response.marketStats);
        setRecentFixtures(response.recentFixtures);
        setWarning(null);
        setIsLoading(false);
      } catch (error) {
        if (cancelled) return;

        console.error('Failed to load referee stats', error);
        setReferee(null);
        setCurrentFacts([]);
        setMarketStats([]);
        setRecentFixtures([]);
        setWarning('Referee stats could not be loaded.');
        setIsLoading(false);
      }
    }

    void loadRefereeStats();

    return () => {
      cancelled = true;
    };
  }, [leagueId, refereeId, season]);

  const displayRefereeName = referee?.name ?? refereeName ?? t('Referee');

  if (!refereeId) {
    return (
      <section className="overflow-hidden rounded-md border border-border/60 bg-background shadow-sm">
        <div className="flex flex-col gap-1 border-b border-border/50 bg-muted/20 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-[15px] font-bold text-foreground">{t('Referee Stats')}</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Referee not available yet')}</p>
        </div>
        <div className="px-4 py-12 text-center text-[12px] font-medium text-muted-foreground">
          {t('API-Football has not assigned a referee to this fixture yet. This panel will unlock automatically once the fixture has a canonical referee.')}
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-md border border-border/60 bg-background shadow-sm">
        <div className="flex flex-col gap-1 border-b border-border/50 bg-muted/20 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-[15px] font-bold text-foreground">{t('Referee Stats')}</h2>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{displayRefereeName}</p>
        </div>

        {warning ? (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] font-medium text-amber-500">
            {t(warning)}
          </div>
        ) : null}

        {isLoading || isTeamDataLoading ? (
          <div className="flex h-40 items-center justify-center px-4 text-center text-[13px] font-medium text-muted-foreground">
            {t('Loading referee stats...')}
          </div>
        ) : (
          <div className="grid divide-y divide-border/50 xl:grid-cols-2 xl:divide-x xl:divide-y-0">
            <RefereeAverageSummary
              awaySummary={awaySummary}
              awayTeamName={awayTeamName}
              currentFacts={currentFacts}
              homeSummary={homeSummary}
              homeTeamName={homeTeamName}
              refereeName={displayRefereeName}
              scope={scope}
            />

            <RefereeMarketComparison
              awayTeamName={awayTeamName}
              awayTrends={awayTrends}
              homeTeamName={homeTeamName}
              homeTrends={homeTrends}
              marketStats={marketStats}
              refereeName={displayRefereeName}
              scope={scope}
            />
          </div>
        )}
      </section>

      <RefereeRecentFixtures fixtures={recentFixtures} refereeName={displayRefereeName} />
    </section>
  );
}
