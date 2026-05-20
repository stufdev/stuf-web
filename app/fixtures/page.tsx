'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchJson } from '@/lib/fetch-json';
import { getDateKey } from '@/lib/date';
import type { UpcomingFixtureView as FixtureView } from '@/lib/upcoming-fixtures';
import { useLanguage } from '../language-provider';
import {
  DEFAULT_MARKET_GROUP,
  DEFAULT_MARKET_LINE,
  getMarketGroup,
  MARKET_GROUPS,
} from '../market-catalog';

const FIXTURE_WINDOW_DAYS = 6;
const THRESHOLDS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
const MINIMUM_SAMPLE_OPTIONS = [0, 5, 8, 10];

type WindowOption = 'all' | '5' | '6' | '8' | '10';
type GroupMode = 'date' | 'league';

type StatValue = {
  hits: number;
  percentage: number | null;
  sample: number;
};

type RowStats = {
  awayAll: StatValue | null;
  awayAway: StatValue | null;
  homeAll: StatValue | null;
  homeHome: StatValue | null;
};

type SignalRating = {
  label: 'Strong' | 'Watch' | 'Thin';
  matchedCells: number;
  sample: number;
  score: number;
};

type FixtureBoardEntry = {
  fixture: FixtureView;
  signal: SignalRating;
  stats: RowStats;
};

function percent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Math.round(Number(value))}%`;
}

function sampleText(value: StatValue | null | undefined) {
  if (!value?.sample) return '-';
  return `${value.hits}/${value.sample}`;
}

function formatSectionDate(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(isoDate));
}

function formatShortDate(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(isoDate));
}

function formatKickoff(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoDate));
}

function valueMeetsThreshold(value: StatValue | null, threshold: number) {
  return value?.percentage !== null && value?.percentage !== undefined && value.percentage >= threshold;
}

function rowMeetsThreshold(stats: RowStats, threshold: number) {
  return (
    valueMeetsThreshold(stats.homeHome, threshold) ||
    valueMeetsThreshold(stats.homeAll, threshold) ||
    valueMeetsThreshold(stats.awayAll, threshold) ||
    valueMeetsThreshold(stats.awayAway, threshold)
  );
}

function averageSignalScore(entries: FixtureBoardEntry[]) {
  if (entries.length === 0) return null;
  return Math.round(entries.reduce((total, entry) => total + entry.signal.score, 0) / entries.length);
}

function MetaInline({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs font-semibold text-[var(--app-text-dim)]">{label}</span>
      <span className="text-sm text-[var(--app-text)]">{value}</span>
    </div>
  );
}

function StatCell({
  value,
  threshold,
}: {
  value: StatValue | null;
  threshold: number;
}) {
  const isHot = valueMeetsThreshold(value, threshold);

  return (
    <div className="min-w-[74px]">
      <div className={`${isHot ? 'font-semibold text-[var(--app-text)]' : 'text-[var(--app-text-soft)]'}`}>
        {value?.sample ? percent(value.percentage) : '-'}
      </div>
      <div className="text-xs text-[var(--app-text-dim)]">{sampleText(value)}</div>
    </div>
  );
}

function SignalCell({ signal }: { signal: SignalRating }) {
  const { t } = useLanguage();

  return (
    <div className="min-w-[96px]">
      <div className="font-semibold text-[var(--app-text)]">{t(signal.label)}</div>
      <div>{signal.score}</div>
      <div className="text-xs text-[var(--app-text-dim)]">{`${signal.matchedCells}/4 · ${signal.sample}`}</div>
    </div>
  );
}

function FixturesTableRow({
  entry,
  threshold,
}: {
  entry: FixtureBoardEntry;
  threshold: number;
}) {
  const { fixture, signal, stats } = entry;
  const { locale, t } = useLanguage();
  const rowTone = signal.label === 'Strong' ? 'bg-[var(--app-accent-soft)]' : '';

  return (
    <tr className={rowTone}>
      <td>
        <div className="min-w-[78px]">
          <div className="font-semibold text-[var(--app-text)]">{formatKickoff(fixture.date, locale)}</div>
          <div className="text-xs text-[var(--app-text-dim)]">{formatShortDate(fixture.date, locale)}</div>
        </div>
      </td>

      <td>
        <div className="min-w-[240px]">
          <div>
            <div className="font-semibold text-[var(--app-text)]">{fixture.home_team_view?.name ?? `Team ${fixture.home_team_id}`}</div>
            <div className="text-[var(--app-text-soft)]">{fixture.away_team_view?.name ?? `Team ${fixture.away_team_id}`}</div>
          </div>
          <div className="mt-1 text-xs text-[var(--app-text-dim)]">
            {fixture.league_name ?? `${t('League')} ${fixture.league_id}`}
          </div>
        </div>
      </td>

      <td>
        <StatCell threshold={threshold} value={stats.homeHome} />
      </td>

      <td>
        <StatCell threshold={threshold} value={stats.homeAll} />
      </td>

      <td>
        <StatCell threshold={threshold} value={stats.awayAll} />
      </td>

      <td>
        <StatCell threshold={threshold} value={stats.awayAway} />
      </td>

      <td>
        <SignalCell signal={signal} />
      </td>

      <td>
        <Link className="underline" href={`/comparison?fixture=${fixture.id}`}>
          {t('Open')}
        </Link>
      </td>
    </tr>
  );
}

function TableHeaderCell({
  label,
  sublabel,
}: {
  label: string;
  sublabel?: string;
}) {
  return (
    <th className="text-left">
      <div>
        <div className="font-semibold text-[var(--app-text)]">{label}</div>
        {sublabel ? <div className="text-xs text-[var(--app-text-dim)]">{sublabel}</div> : null}
      </div>
    </th>
  );
}

function FixturesSectionTable({
  entries,
  threshold,
  title,
}: {
  entries: FixtureBoardEntry[];
  threshold: number;
  title: string;
}) {
  const { t } = useLanguage();

  return (
    <section className="border border-[var(--app-border)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--app-border)] px-2 py-2">
        <h2 className="text-sm font-semibold text-[var(--app-text)]">{title}</h2>
        <span className="text-xs text-[var(--app-text-dim)]">
          {entries.length} {t('fixtures')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1080px]">
          <thead>
            <tr>
              <TableHeaderCell label={t('KO')} sublabel={t('Time')} />
              <TableHeaderCell label={t('Match')} sublabel={t('Teams')} />
              <TableHeaderCell label={t('Home')} sublabel={t('Home split')} />
              <TableHeaderCell label={t('Home')} sublabel={t('Overall')} />
              <TableHeaderCell label={t('Away')} sublabel={t('Overall')} />
              <TableHeaderCell label={t('Away')} sublabel={t('Away split')} />
              <TableHeaderCell label={t('Signal')} sublabel={t('Score')} />
              <TableHeaderCell label={t('Open')} />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <FixturesTableRow entry={entry} key={entry.fixture.id} threshold={threshold} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function FixturesPage() {
  const { locale, t } = useLanguage();
  const [entries, setEntries] = useState<FixtureBoardEntry[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(DEFAULT_MARKET_GROUP.id);
  const [selectedMarketKey, setSelectedMarketKey] = useState(DEFAULT_MARKET_LINE.key);
  const [threshold, setThreshold] = useState(60);
  const [windowOption, setWindowOption] = useState<WindowOption>('all');
  const [minimumSample, setMinimumSample] = useState(0);
  const [groupMode, setGroupMode] = useState<GroupMode>('date');
  const [hideBelowThreshold, setHideBelowThreshold] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedGroup = getMarketGroup(selectedGroupId);
  const selectedLine = selectedGroup.lines.find((line) => line.key === selectedMarketKey) ?? selectedGroup.lines[0] ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadBoard() {
      if (!selectedLine) {
        setEntries([]);
        setErrorMessage(null);
        setLoadingBoard(false);
        return;
      }

      setLoadingBoard(true);
      setErrorMessage(null);

      try {
        const nextEntries = await fetchJson<FixtureBoardEntry[]>(
          `/api/v1/fixtures-board?days=${FIXTURE_WINDOW_DAYS}&marketKey=${encodeURIComponent(selectedLine.key)}&window=${windowOption}&threshold=${threshold}`,
        );

        if (cancelled) return;
        setEntries(nextEntries);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load fixtures scanner data', error);
        setErrorMessage('Fixtures board could not be loaded.');
        setEntries([]);
      } finally {
        if (!cancelled) {
          setLoadingBoard(false);
        }
      }
    }

    void loadBoard();

    return () => {
      cancelled = true;
    };
  }, [selectedLine, threshold, windowOption]);

  const boardEntries = selectedLine
    ? entries.filter((entry) => {
        if (hideBelowThreshold && !rowMeetsThreshold(entry.stats, threshold)) return false;
        return minimumSample === 0 || entry.signal.sample >= minimumSample;
      })
    : [];

  const groupedBoardEntries = (() => {
    const groupedMap = new Map<string, FixtureBoardEntry[]>();

    for (const entry of boardEntries) {
      const key = groupMode === 'date' ? getDateKey(entry.fixture.date) : String(entry.fixture.league_id);
      const group = groupedMap.get(key) ?? [];
      group.push(entry);
      groupedMap.set(key, group);
    }

    return [...groupedMap.entries()].map(([key, groupedEntries]) => ({ entries: groupedEntries, key }));
  })();

  const strongSignals = boardEntries.filter((entry) => entry.signal.label === 'Strong').length;
  const averageSignal = averageSignalScore(boardEntries);

  function handleGroupChange(groupId: string) {
    const nextGroup = getMarketGroup(groupId);
    setSelectedGroupId(groupId);
    setSelectedMarketKey(nextGroup.lines[0]?.key ?? '');
  }

  return (
    <main className="p-4 text-[var(--app-text)]">
      <div className="flex max-w-[1680px] flex-col gap-4">
        <section className="border border-[var(--app-border)] p-3">
          <h1 className="mb-3 text-lg font-semibold">{t('Fixtures')}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--app-border)] pb-3">
            <MetaInline label={t('Window')} value={`${FIXTURE_WINDOW_DAYS}d`} />
            <MetaInline label={t('Fixtures')} value={String(entries.length)} />
            <MetaInline label={t('Shown')} value={String(boardEntries.length)} />
            <MetaInline label={t('Strong')} value={String(strongSignals)} />
            <MetaInline label={t('Average signal')} value={averageSignal === null ? '-' : `${averageSignal}`} />
            <div className="ml-auto text-xs text-[var(--app-text-dim)]">
              {selectedLine ? t(selectedLine.label) : t(selectedGroup.label)}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Market')}</span>
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
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Line')}</span>
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
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Threshold')}</span>
              <select
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                onChange={(event) => setThreshold(Number(event.target.value))}
                value={String(threshold)}
              >
                {THRESHOLDS.map((item) => (
                  <option key={item} value={String(item)}>
                    {`+${item}%`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Minimum sample')}</span>
              <select
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                onChange={(event) => setMinimumSample(Number(event.target.value))}
                value={String(minimumSample)}
              >
                {MINIMUM_SAMPLE_OPTIONS.map((item) => (
                  <option key={item} value={String(item)}>
                    {item === 0 ? t('Any sample') : `${item}+ ${t('matches')}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Window size')}</span>
              <select
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                onChange={(event) => setWindowOption(event.target.value as WindowOption)}
                value={windowOption}
              >
                <option value="all">{t('All previous matches')}</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="8">8</option>
                <option value="10">10</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Group by')}</span>
              <select
                className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
                onChange={(event) => setGroupMode(event.target.value as GroupMode)}
                value={groupMode}
              >
                <option value="date">{t('Date')}</option>
                <option value="league">{t('League')}</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--app-border)] pt-3">
            <label className="flex items-center gap-3 text-sm text-[var(--app-text-soft)]">
              <input
                checked={hideBelowThreshold}
                className="h-4 w-4"
                onChange={(event) => setHideBelowThreshold(event.target.checked)}
                type="checkbox"
              />
              {t('Hide fixtures below threshold')}
            </label>

            <div className="ml-auto text-xs text-[var(--app-text-dim)]">{t('Current season only')}</div>
          </div>
        </section>

        {loadingBoard && <div>{t('Loading fixtures...')}</div>}
        {errorMessage && <div>{t(errorMessage)}</div>}
        {!loadingBoard && !selectedLine && <div>{t('No market lines available yet')}</div>}
        {!loadingBoard && selectedLine && groupedBoardEntries.length === 0 && <div>{t('No fixtures found for these filters.')}</div>}

        {selectedLine && groupedBoardEntries.length > 0 && (
          <section className="border border-[var(--app-border)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] px-2 py-2">
              <div>
                <h2 className="text-base font-semibold text-[var(--app-text)]">{t('Upcoming fixtures')}</h2>
              </div>
              <div className="text-xs text-[var(--app-text-dim)]">
                {`${threshold}% · ${windowOption === 'all' ? t('Season') : `${windowOption} ${t('matches')}`}`}
              </div>
            </div>

            <div className="grid gap-4 p-2">
              {groupedBoardEntries.map(({ key, entries: groupedEntries }) => {
                const title =
                  groupMode === 'date'
                    ? formatSectionDate(groupedEntries[0].fixture.date, locale)
                    : groupedEntries[0].fixture.league_name ?? `${t('League')} ${key}`;

                const sortedEntries = [...groupedEntries].sort((left, right) => {
                  return (
                    right.signal.score - left.signal.score ||
                    right.signal.matchedCells - left.signal.matchedCells ||
                    right.signal.sample - left.signal.sample ||
                    new Date(left.fixture.date).getTime() - new Date(right.fixture.date).getTime()
                  );
                });

                return (
                  <FixturesSectionTable
                    entries={sortedEntries}
                    key={`${groupMode}:${key}`}
                    threshold={threshold}
                    title={title}
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
