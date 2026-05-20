'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchJson } from '@/lib/fetch-json';
import { addDays, formatDateKey, getDateKey } from '@/lib/date';
import type { UpcomingFixtureView as FixtureView } from '@/lib/upcoming-fixtures';
import { buildTrendStreakSentence } from '../comparison/helpers';
import type { TeamMarketTrendRecord } from '../comparison/types';
import { useLanguage } from '../language-provider';
import {
  DEFAULT_MARKET_GROUP,
  DEFAULT_MARKET_LINE,
  getMarketGroup,
  MARKET_GROUPS,
} from '../market-catalog';

const STREAK_WINDOW_DAYS = 4;
const STREAK_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];

type ScopeFilter = 'all' | 'overall' | 'home' | 'away';
type DayFilter = 'all' | string;

type StreakServerRow = {
  fixture: FixtureView;
  teamName: string;
  trend: TeamMarketTrendRecord;
};

type StreakRow = {
  fixture: FixtureView;
  nextMatchText: string;
  statLine: string;
  teamName: string;
  trend: TeamMarketTrendRecord;
};

function getDayTabs(locale: string, t: (value: string) => string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [
    { id: 'all', label: t('All') },
    ...Array.from({ length: STREAK_WINDOW_DAYS }, (_, index) => {
      const date = addDays(today, index);
      if (index === 0) return { id: formatDateKey(date), label: t('Today') };
      if (index === 1) return { id: formatDateKey(date), label: t('Tomorrow') };
      return {
        id: formatDateKey(date),
        label: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date),
      };
    }),
  ];
}

function formatKickoff(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

function toFlagEmoji(countryCode: string | null) {
  if (!countryCode || countryCode.length !== 2) return null;
  return countryCode
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

function buildNextMatchText(
  fixture: FixtureView,
  teamId: number,
  language: 'en' | 'es',
) {
  const isHome = fixture.home_team_id === teamId;
  const opponentName = isHome
    ? fixture.away_team_view?.name ?? `Team ${fixture.away_team_id}`
    : fixture.home_team_view?.name ?? `Team ${fixture.home_team_id}`;

  if (language === 'es') {
    return isHome ? `Local vs ${opponentName}` : `Visitante vs ${opponentName}`;
  }

  return isHome ? `Home vs ${opponentName}` : `Away vs ${opponentName}`;
}

function scopeMatchesFilter(scopeFilter: ScopeFilter, scope: TeamMarketTrendRecord['scope']) {
  return scopeFilter === 'all' || scopeFilter === scope;
}

function percent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Math.round(Number(value))}%`;
}

export default function StreaksPage() {
  const { language, locale, t } = useLanguage();
  const [rows, setRows] = useState<StreakServerRow[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(DEFAULT_MARKET_GROUP.id);
  const [selectedMarketKey, setSelectedMarketKey] = useState(DEFAULT_MARKET_LINE.key);
  const [minimumStreak, setMinimumStreak] = useState(5);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedLeagueId, setSelectedLeagueId] = useState('all');
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayFilter>('all');
  const [loadingRows, setLoadingRows] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedGroup = getMarketGroup(selectedGroupId);
  const selectedLine = selectedGroup.lines.find((line) => line.key === selectedMarketKey) ?? selectedGroup.lines[0] ?? null;
  const selectedLineKey = selectedLine?.key ?? '';
  const selectedLineLabel = selectedLine?.label ?? '';
  const dayTabs = getDayTabs(locale, t);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      if (!selectedLineKey) {
        setRows([]);
        setErrorMessage(null);
        setLoadingRows(false);
        return;
      }

      setLoadingRows(true);
      setErrorMessage(null);

      try {
        const response = await fetchJson<StreakServerRow[]>(
          `/api/v1/streaks?days=${STREAK_WINDOW_DAYS}&marketKey=${encodeURIComponent(selectedLineKey)}&minimumStreak=${minimumStreak}`,
        );

        if (cancelled) return;
        setRows(response);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load streak rows', error);
        setErrorMessage('Streaks could not be loaded.');
        setRows([]);
      } finally {
        if (!cancelled) {
          setLoadingRows(false);
        }
      }
    }

    void loadRows();

    return () => {
      cancelled = true;
    };
  }, [minimumStreak, selectedLineKey]);

  const hydratedRows = rows.map((row) => ({
    fixture: row.fixture,
    nextMatchText: buildNextMatchText(row.fixture, row.trend.team_id, language),
    statLine: buildTrendStreakSentence({
      rawLabel: selectedLineLabel,
      translatedLabel: t(selectedLineLabel),
      scope: row.trend.scope,
      streak: row.trend.current_streak,
      language,
      subject: row.teamName,
    }),
    teamName: row.teamName,
    trend: row.trend,
  } satisfies StreakRow));

  const countries = [...new Map(hydratedRows.map((row) => [row.fixture.country_name ?? 'Unknown', row.fixture.country_name ?? 'Unknown'])).values()].sort();

  const leagues = (() => {
    const filteredByCountry =
      selectedCountry === 'all'
        ? hydratedRows
        : hydratedRows.filter((row) => (row.fixture.country_name ?? 'Unknown') === selectedCountry);

    return [...new Map(filteredByCountry.map((row) => [String(row.fixture.league_id), row.fixture.league_name ?? t('League')])).entries()].sort(
      (left, right) => left[1].localeCompare(right[1]),
    );
  })();

  const filteredRows = (() => {
    const searchValue = teamSearch.trim().toLowerCase();

    return hydratedRows.filter((row) => {
      const matchesCountry = selectedCountry === 'all' || (row.fixture.country_name ?? 'Unknown') === selectedCountry;
      const matchesLeague = selectedLeagueId === 'all' || String(row.fixture.league_id) === selectedLeagueId;
      const matchesTeam = !searchValue || row.teamName.toLowerCase().includes(searchValue);
      const matchesDay = selectedDay === 'all' || getDateKey(row.fixture.date) === selectedDay;
      const matchesScope = scopeMatchesFilter(scopeFilter, row.trend.scope);
      return matchesCountry && matchesLeague && matchesTeam && matchesDay && matchesScope;
    });
  })();

  function handleGroupChange(groupId: string) {
    const nextGroup = getMarketGroup(groupId);
    setSelectedGroupId(groupId);
    setSelectedMarketKey(nextGroup.lines[0]?.key ?? '');
  }

  function resetFilters() {
    setSelectedCountry('all');
    setSelectedLeagueId('all');
    setTeamSearch('');
    setSelectedDay('all');
    setScopeFilter('all');
    setMinimumStreak(5);
  }

  return (
    <main className="p-4 text-[var(--app-text)]">
      <div className="flex max-w-[1540px] flex-col gap-4">
        <section className="border border-[var(--app-border)] p-3">
          <h1 className="mb-3 text-lg font-semibold">{t('Streaks')}</h1>
          <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--app-border)] pb-3">
            <div>{`${t('Upcoming window')}: ${STREAK_WINDOW_DAYS}d`}</div>
            <div>{`${t('Statistic focus')}: ${t(selectedLine?.label ?? selectedGroup.label)}`}</div>
            <div>{`${t('Minimum match streak')}: ${minimumStreak}+`}</div>
            <div>{`${t('Rows')}: ${filteredRows.length}`}</div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Select Statistic Type')}</span>
              <select
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                onChange={(event) => handleGroupChange(event.target.value)}
                value={selectedGroupId}
              >
                {MARKET_GROUPS.map((group) => (
                  <option disabled={group.lines.length === 0} key={group.id} value={group.id}>
                    {t(group.label)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Select Line')}</span>
              <select
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                disabled={selectedGroup.lines.length === 0}
                onChange={(event) => setSelectedMarketKey(event.target.value)}
                value={selectedMarketKey}
              >
                {selectedGroup.lines.length ? (
                  selectedGroup.lines.map((line) => (
                    <option key={line.key} value={line.key}>
                      {t(line.label)}
                    </option>
                  ))
                ) : (
                  <option value="">{t('No market lines available yet')}</option>
                )}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Minimum match streak')}</span>
              <select
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                onChange={(event) => setMinimumStreak(Number(event.target.value))}
                value={String(minimumStreak)}
              >
                {STREAK_OPTIONS.map((option) => (
                  <option key={option} value={String(option)}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3">
            <label className="flex max-w-[280px] flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Scope')}</span>
              <select
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
                value={scopeFilter}
              >
                <option value="all">{t('All')}</option>
                <option value="overall">{t('Overall streaks')}</option>
                <option value="home">{t('Home streaks')}</option>
                <option value="away">{t('Away streaks')}</option>
              </select>
            </label>
          </div>
        </section>

        <section className="border border-[var(--app-border)] p-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Select Country')}</span>
              <select
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                onChange={(event) => setSelectedCountry(event.target.value)}
                value={selectedCountry}
              >
                <option value="all">{t('All')}</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Select League')}</span>
              <select
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                onChange={(event) => setSelectedLeagueId(event.target.value)}
                value={selectedLeagueId}
              >
                <option value="all">{t('All')}</option>
                {leagues.map(([leagueId, leagueName]) => (
                  <option key={leagueId} value={leagueId}>
                    {leagueName}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Search For Team')}</span>
              <input
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                onChange={(event) => setTeamSearch(event.target.value)}
                placeholder={t('Search...')}
                type="text"
                value={teamSearch}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Day')}</span>
              <select
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                onChange={(event) => setSelectedDay(event.target.value)}
                value={selectedDay}
              >
                {dayTabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </label>

            <button className="mt-auto h-10 rounded border border-[var(--app-input-border)] px-3" onClick={resetFilters} type="button">
              {t('Reset Search/Filter')}
            </button>
          </div>
        </section>

        {loadingRows && <div>{t('Loading trends...')}</div>}
        {errorMessage && <div>{t(errorMessage)}</div>}
        {!loadingRows && !selectedLine && <div>{t('No market lines available yet')}</div>}
        {!loadingRows && selectedLine && filteredRows.length === 0 && <div>{t('No streaks qualified for these filters.')}</div>}

        {!loadingRows && selectedLine && filteredRows.length > 0 && (
          <section className="border border-[var(--app-border)]">
            <div className="border-b border-[var(--app-border)] px-2 py-2 text-xs text-[var(--app-text-dim)]">{`${t('Rows')}: ${filteredRows.length}`}</div>
            <div className="overflow-x-auto">
              <table className="min-w-[980px] text-sm">
                <thead>
                  <tr className="text-left">
                    <th>{t('League')}</th>
                    <th>{t('Stat')}</th>
                    <th>{t('Next Match')}</th>
                    <th>{t('Date')}</th>
                    <th>{t('Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const flag = toFlagEmoji(row.fixture.country_code);
                    return (
                      <tr key={`${row.trend.team_id}:${row.trend.scope}:${row.fixture.id}`}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="text-lg leading-none">{flag ?? '|'}</span>
                            <div>
                              <div className="font-semibold text-[var(--app-text)]">{row.fixture.league_name ?? t('League')}</div>
                              <div className="text-xs text-[var(--app-text-dim)]">{row.fixture.country_name ?? '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="min-w-0">
                            <div className="font-semibold leading-6 text-[var(--app-text)]">{row.statLine}</div>
                            <div className="text-xs text-[var(--app-text-dim)]">{`${percent(row.trend.percentage)} | ${row.trend.hits}/${row.trend.sample}`}</div>
                          </div>
                        </td>
                        <td className="font-semibold text-[var(--app-text)]">{row.nextMatchText}</td>
                        <td className="text-[var(--app-text-soft)]">{formatKickoff(row.fixture.date, locale)}</td>
                        <td>
                          <Link className="underline" href={`/comparison?fixture=${row.fixture.id}`}>
                            {t('Open Comparison')}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
