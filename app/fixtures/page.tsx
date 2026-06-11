'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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

// Default window widened to 14 days: during off-season the 5 club leagues have
// no upcoming fixtures, while the World Cup starts June 11 — a 6-day window
// from June 1 misses it entirely. 14 days ensures upcoming WC fixtures are
// visible by default. When club leagues resume, this can be narrowed or made
// adaptive. The user can still select 3/6/9/14 manually.
const FIXTURE_WINDOW_DAYS = 14;

const THRESHOLDS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
const MINIMUM_SAMPLE_OPTIONS = [0, 5, 8, 10];
const MINIMUM_ODDS_OPTIONS = [0, 1.3, 1.5, 1.7, 2, 2.5, 3];

type ViewMode = 'intelligence' | 'scanner';
type WindowOption = 'all' | '5' | '6' | '8' | '10';
type GroupMode = 'date' | 'league';

// ──────────────────────────────────────────────────────────────────────────────
// Shared formatting helpers
// ──────────────────────────────────────────────────────────────────────────────

function percent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Math.round(Number(value))}%`;
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

// ──────────────────────────────────────────────────────────────────────────────
// Match Intelligence view (default) — reads the materialized fixture_signals
// read model via /api/v1/fixtures/signals. No scoring happens here; the builder
// already ranked and banded every signal. This view is presentation only.
// ──────────────────────────────────────────────────────────────────────────────

type SignalBand = 'tendency' | 'strong' | 'watch' | 'context' | 'low_info';
type SignalSourceType = 'team_market' | 'streak_informativeness' | 'referee_context' | 'player_prop';

type FixtureSignal = {
  signalKey: string;
  sourceType: SignalSourceType;
  label: string;
  headline: string;
  sample: number | null;
  hitRate: number | null;
  signalBand: SignalBand;
  signalRank: number;
  scope: 'overall' | 'home' | 'away' | null;
  sourcePayload: Record<string, unknown>;
};

type FixtureSignalCard = {
  fixtureId: number;
  leagueId: number;
  season: number;
  playedAt: string;
  homeTeamName: string;
  homeTeamLogoUrl: string | null;
  awayTeamName: string;
  awayTeamLogoUrl: string | null;
  leagueName: string;
  leagueLogoUrl: string | null;
  topBand: SignalBand;
  topStrength: number;
  signals: FixtureSignal[];
};

type FixtureSignalLeagueOption = {
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
};

type FixtureSignalsResponse = {
  filters: { leagueId: number | 'all'; season: number; windowDays: number };
  options: { defaultSeason: number; leagues: FixtureSignalLeagueOption[] };
  result: { cards: FixtureSignalCard[] };
};

function sourceTag(sourceType: SignalSourceType, t: (text: string) => string) {
  switch (sourceType) {
    case 'team_market':
      return t('Market');
    case 'referee_context':
      return t('Referee');
    case 'player_prop':
      return t('Player');
    case 'streak_informativeness':
      return t('Streak');
    default:
      return sourceType;
  }
}

function SignalChip({ signal }: { signal: FixtureSignal }) {
  const { t } = useLanguage();
  const amplified = signal.sourcePayload?.referee_amplified === true;

  return (
    <li className="flex flex-col gap-1 rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] px-2 py-1.5 text-[var(--app-text-soft)]">
      <div className="flex items-center gap-2">
        <span className="rounded-sm border border-[var(--app-border)] px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-dim)]">
          {sourceTag(signal.sourceType, t)}
        </span>
        {amplified ? (
          <span className="rounded-sm border border-[var(--app-border)] px-1 text-[10px] text-[var(--app-text-dim)]">
            {t('Referee context')}
          </span>
        ) : null}
        {signal.sample !== null ? (
          <span className="ml-auto text-xs text-[var(--app-text-dim)]">
            {signal.hitRate !== null ? `${percent(signal.hitRate)} · ` : ''}
            {`${signal.sample} ${t('matches')}`}
          </span>
        ) : null}
      </div>
      <div className="text-sm text-[var(--app-text)]">{signal.headline}</div>
    </li>
  );
}

function IntelligenceCard({ card }: { card: FixtureSignalCard }) {
  const { locale, t } = useLanguage();

  return (
    <article className="flex flex-col gap-3 border border-[var(--app-border)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-[var(--app-text)]">
            {card.homeTeamName} <span className="text-[var(--app-text-dim)]">{t('vs')}</span> {card.awayTeamName}
          </div>
          <div className="mt-0.5 text-xs text-[var(--app-text-dim)]">
            {`${formatKickoff(card.playedAt, locale)} · ${card.leagueName}`}
          </div>
        </div>
        <Link
          className="rounded border border-[var(--app-border)] px-3 py-1 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-panel-muted)]"
          href={`/comparison?fixture=${card.fixtureId}`}
          prefetch={false}
        >
          {t('Open Comparison')}
        </Link>
      </div>

      {card.signals.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {card.signals.map((signal) => (
            <SignalChip key={signal.signalKey} signal={signal} />
          ))}
        </ul>
      ) : (
        <div className="text-xs text-[var(--app-text-dim)]">{t('No signals for this fixture yet.')}</div>
      )}
    </article>
  );
}

function IntelligenceView() {
  const { locale, t } = useLanguage();
  const [cards, setCards] = useState<FixtureSignalCard[]>([]);
  const [leagueOptions, setLeagueOptions] = useState<FixtureSignalLeagueOption[]>([]);
  const [leagueId, setLeagueId] = useState<'all' | number>('all');
  const [windowDays, setWindowDays] = useState(FIXTURE_WINDOW_DAYS);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function loadSignals() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams();
        params.set('days', String(windowDays));
        if (leagueId !== 'all') params.set('leagueId', String(leagueId));

        const payload = await fetchJson<FixtureSignalsResponse>(
          `/api/v1/fixtures/signals?${params.toString()}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setCards(payload.result.cards);
        setLeagueOptions(payload.options.leagues);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Failed to load fixture signals', error);
        setErrorMessage('Fixture signals could not be loaded.');
        setCards([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadSignals();
    return () => controller.abort();
  }, [leagueId, windowDays]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, FixtureSignalCard[]>();
    for (const card of cards) {
      const key = getDateKey(card.playedAt);
      const group = groups.get(key) ?? [];
      group.push(card);
      groups.set(key, group);
    }
    return [...groups.entries()].map(([key, value]) => ({ key, cards: value }));
  }, [cards]);

  const uniqueLeagues = useMemo(() => {
    const seen = new Map<number, FixtureSignalLeagueOption>();
    for (const option of leagueOptions) {
      if (!seen.has(option.leagueId)) seen.set(option.leagueId, option);
    }
    return [...seen.values()];
  }, [leagueOptions]);

  return (
    <div className="flex flex-col gap-4">
      <section className="border border-[var(--app-border)] p-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--app-border)] pb-3">
          <span className="text-sm text-[var(--app-text-soft)]">
            {`${cards.length} ${t('fixtures')}`}
          </span>
          <span className="ml-auto text-xs text-[var(--app-text-dim)]">{t('Match Intelligence')}</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('League')}</span>
            <select
              className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
              onChange={(event) => setLeagueId(event.target.value === 'all' ? 'all' : Number(event.target.value))}
              value={leagueId === 'all' ? 'all' : String(leagueId)}
            >
              <option value="all">{t('All leagues')}</option>
              {uniqueLeagues.map((option) => (
                <option key={option.leagueId} value={String(option.leagueId)}>
                  {option.leagueName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Window')}</span>
            <select
              className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
              onChange={(event) => setWindowDays(Number(event.target.value))}
              value={String(windowDays)}
            >
              {[3, 6, 9, 14].map((item) => (
                <option key={item} value={String(item)}>
                  {`${item}d`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading && <div>{t('Loading fixtures...')}</div>}
      {errorMessage && <div>{t(errorMessage)}</div>}
      {!loading && !errorMessage && groupedByDate.length === 0 && (
        <div>{t('No fixtures found for these filters.')}</div>
      )}

      {groupedByDate.map(({ key, cards: dateCards }) => (
        <section className="border border-[var(--app-border)]" key={key}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--app-border)] px-2 py-2">
            <h2 className="text-sm font-semibold text-[var(--app-text)]">
              {formatSectionDate(dateCards[0].playedAt, locale)}
            </h2>
            <span className="text-xs text-[var(--app-text-dim)]">
              {`${dateCards.length} ${t('fixtures')}`}
            </span>
          </div>
          <div className="grid gap-3 p-2 lg:grid-cols-2">
            {dateCards.map((card) => (
              <IntelligenceCard card={card} key={card.fixtureId} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Market deep-dive scanner (legacy single-market board, kept behind a toggle).
// ──────────────────────────────────────────────────────────────────────────────

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
  matchedCells: number;
  sample: number;
};

// Decision card slice for the selected market (serving layer
// fixture_market_decision_cards — status and price already resolved upstream).
type BoardDecisionCard = {
  selection: string;
  line: number | null;
  decisionStatus: string;
  priceSourceQuality: 'reference' | 'conditional' | null;
  referenceBookmaker: string | null;
  referencePrice: number | null;
  referenceCapturedAt: string | null;
};

type FixtureBoardEntry = {
  fixture: FixtureView;
  signal: SignalRating;
  stats: RowStats;
  decisionCards: BoardDecisionCard[];
};

function sampleText(value: StatValue | null | undefined) {
  if (!value?.sample) return '-';
  return `${value.hits}/${value.sample}`;
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

function MetaInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs font-semibold text-[var(--app-text-dim)]">{label}</span>
      <span className="text-sm text-[var(--app-text)]">{value}</span>
    </div>
  );
}

function StatCell({ value, threshold }: { value: StatValue | null; threshold: number }) {
  const isHot = valueMeetsThreshold(value, threshold);

  // A cell turns green when the team's historical hit-rate for the selected
  // market meets the chosen threshold — a scannable "threshold met" marker
  // (descriptive hit-rate, not a prediction).
  return (
    <div className={`min-w-[74px] rounded px-1.5 py-0.5 ${isHot ? 'bg-[var(--app-success-soft)]' : ''}`}>
      <div className={isHot ? 'font-semibold text-[var(--app-success-text)]' : 'text-[var(--app-text-soft)]'}>
        {value?.sample ? percent(value.percentage) : '-'}
      </div>
      <div className="text-xs text-[var(--app-text-dim)]">{sampleText(value)}</div>
    </div>
  );
}

function SignalCell({ signal }: { signal: SignalRating }) {
  const isAligned = signal.matchedCells >= 2;

  // Plain factual count: how many of the 4 cells cleared the threshold.
  return (
    <div className="min-w-[56px] text-center">
      <div className={isAligned ? 'font-semibold text-[var(--app-success-text)]' : 'text-[var(--app-text-soft)]'}>
        {`${signal.matchedCells}/4`}
      </div>
    </div>
  );
}

// ── Decision card price badges ────────────────────────────────────────────────
// Cards with selection home/win belong next to the home team; away/loss next to
// the away team; everything else (over/under/yes/no/draw) is match-level and
// renders in the KO cell, adamchoi-style. No price = no badge — never a fake 0.

function cardSide(selection: string): 'home' | 'away' | 'match' {
  if (selection === 'home' || selection === 'win') return 'home';
  if (selection === 'away' || selection === 'loss') return 'away';
  return 'match';
}

const DECISION_STATUS_LABELS: Record<string, string> = {
  stat_signal_only: 'Signal only',
  no_odds_available: 'No odds',
  priced_no_model: 'Priced',
  stale_price: 'Stale price',
  insufficient_data: 'Low data',
  model_ready_no_edge: 'No edge',
  edge_candidate: 'Edge candidate',
  positive_edge: 'Positive edge',
};

function decisionStatusLabel(status: string) {
  return DECISION_STATUS_LABELS[status] ?? status;
}

function PriceBadge({ card }: { card: BoardDecisionCard }) {
  const { t } = useLanguage();
  if (card.referencePrice === null) return null;

  const isReference = card.priceSourceQuality === 'reference';
  const isStale = card.decisionStatus === 'stale_price';
  const title = `${t(decisionStatusLabel(card.decisionStatus))}${card.referenceBookmaker ? ` · ${card.referenceBookmaker}` : ''}`;

  return (
    <span
      className={`inline-flex flex-col items-center rounded border px-1.5 py-0.5 leading-tight ${
        isReference && !isStale
          ? 'border-[var(--app-accent)] text-[var(--app-text)]'
          : 'border-[var(--app-border)] text-[var(--app-text-soft)]'
      }`}
      title={title}
    >
      <span className={`text-xs font-semibold ${isStale ? 'line-through' : ''}`}>
        {card.referencePrice.toFixed(2)}
      </span>
      {card.referenceBookmaker ? (
        <span className="text-[9px] uppercase tracking-wide text-[var(--app-text-dim)]">
          {card.referenceBookmaker}
        </span>
      ) : null}
    </span>
  );
}

function PriceBadgeGroup({ cards }: { cards: BoardDecisionCard[] }) {
  const priced = cards.filter((card) => card.referencePrice !== null);
  if (priced.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
      {priced.map((card) => (
        <PriceBadge card={card} key={`${card.selection}:${card.line ?? ''}`} />
      ))}
    </div>
  );
}

function FixturesTableRow({ entry, threshold }: { entry: FixtureBoardEntry; threshold: number }) {
  const { decisionCards, fixture, signal, stats } = entry;
  const { locale, t } = useLanguage();

  const homeCards = decisionCards.filter((card) => cardSide(card.selection) === 'home');
  const awayCards = decisionCards.filter((card) => cardSide(card.selection) === 'away');
  const matchCards = decisionCards.filter((card) => cardSide(card.selection) === 'match');

  // Reference layout: each team's stats sit next to that team —
  // [home split][home all] HOME TEAM | KO + match price | AWAY TEAM [away all][away split].
  // Team-scoped prices (selection home/away) render under their own team.
  return (
    <tr>
      <td><StatCell threshold={threshold} value={stats.homeHome} /></td>
      <td><StatCell threshold={threshold} value={stats.homeAll} /></td>

      <td>
        <div className="min-w-[150px] text-right font-semibold text-[var(--app-text)]">
          {fixture.home_team_view?.name ?? `Team ${fixture.home_team_id}`}
          <PriceBadgeGroup cards={homeCards} />
        </div>
      </td>

      <td>
        <div className="min-w-[64px] text-center">
          <div className="font-semibold text-[var(--app-text)]">{formatKickoff(fixture.date, locale)}</div>
          <div className="text-xs text-[var(--app-text-dim)]">{formatShortDate(fixture.date, locale)}</div>
          <PriceBadgeGroup cards={matchCards} />
        </div>
      </td>

      <td>
        <div className="min-w-[150px] font-semibold text-[var(--app-text)]">
          {fixture.away_team_view?.name ?? `Team ${fixture.away_team_id}`}
          <PriceBadgeGroup cards={awayCards} />
        </div>
      </td>

      <td><StatCell threshold={threshold} value={stats.awayAll} /></td>
      <td><StatCell threshold={threshold} value={stats.awayAway} /></td>

      <td><SignalCell signal={signal} /></td>

      <td>
        <Link className="underline" href={`/comparison?fixture=${fixture.id}`} prefetch={false}>
          {t('Open')}
        </Link>
      </td>
    </tr>
  );
}

function TableHeaderCell({ label, sublabel }: { label: string; sublabel?: string }) {
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
              <TableHeaderCell label={t('Home')} sublabel={t('Home split')} />
              <TableHeaderCell label={t('Home')} sublabel={t('Overall')} />
              <TableHeaderCell label={t('Home Team')} />
              <TableHeaderCell label={t('KO')} sublabel={t('Time')} />
              <TableHeaderCell label={t('Away Team')} />
              <TableHeaderCell label={t('Away')} sublabel={t('Overall')} />
              <TableHeaderCell label={t('Away')} sublabel={t('Away split')} />
              <TableHeaderCell label={t('Cells')} sublabel={t('Cleared')} />
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

function ScannerView() {
  const { locale, t } = useLanguage();
  const [entries, setEntries] = useState<FixtureBoardEntry[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(DEFAULT_MARKET_GROUP.id);
  const [selectedMarketKey, setSelectedMarketKey] = useState(DEFAULT_MARKET_LINE.key);
  const [threshold, setThreshold] = useState(60);
  const [windowOption, setWindowOption] = useState<WindowOption>('all');
  const [minimumSample, setMinimumSample] = useState(0);
  const [minimumOdds, setMinimumOdds] = useState(0);
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
        if (minimumSample !== 0 && entry.signal.sample < minimumSample) return false;
        // Min odds: keep fixtures where at least one decision card price clears
        // the floor. Fixtures without any priced card drop when the filter is on.
        if (minimumOdds > 0) {
          return entry.decisionCards.some(
            (card) => card.referencePrice !== null && card.referencePrice >= minimumOdds,
          );
        }
        return true;
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


  function handleGroupChange(groupId: string) {
    const nextGroup = getMarketGroup(groupId);
    setSelectedGroupId(groupId);
    setSelectedMarketKey(nextGroup.lines[0]?.key ?? '');
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="border border-[var(--app-border)] p-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--app-border)] pb-3">
          <MetaInline label={t('Window')} value={`${FIXTURE_WINDOW_DAYS}d`} />
          <MetaInline label={t('Fixtures')} value={String(entries.length)} />
          <MetaInline label={t('Shown')} value={String(boardEntries.length)} />
          <div className="ml-auto text-xs text-[var(--app-text-dim)]">
            {selectedLine ? t(selectedLine.label) : t(selectedGroup.label)}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
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
            <span className="text-xs font-semibold text-[var(--app-text-dim)]">{t('Minimum odds')}</span>
            <select
              className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2"
              onChange={(event) => setMinimumOdds(Number(event.target.value))}
              value={String(minimumOdds)}
            >
              {MINIMUM_ODDS_OPTIONS.map((item) => (
                <option key={item} value={String(item)}>
                  {item === 0 ? t('Any odds') : `${item.toFixed(2)}+`}
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

          <div className="ml-auto text-xs text-[var(--app-text-dim)]">
            {t('Current season only')}
          </div>
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
              <h2 className="text-base font-semibold text-[var(--app-text)]">
                {t('Upcoming fixtures')}
              </h2>
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
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page shell: Match Intelligence is the default entry point; the legacy
// single-market scanner stays reachable via the deep-dive toggle.
// ──────────────────────────────────────────────────────────────────────────────

export default function FixturesPage() {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('intelligence');

  return (
    <main className="p-4 text-[var(--app-text)]">
      <div className="flex max-w-[1680px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">{t('Fixtures')}</h1>
          <div className="flex items-center gap-1 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] p-0.5">
            {(['intelligence', 'scanner'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                  viewMode === mode
                    ? 'bg-[var(--app-accent)] text-white'
                    : 'text-[var(--app-text-soft)] hover:bg-[var(--app-panel-muted)]'
                }`}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'intelligence' ? t('Match Intelligence') : t('Market deep-dive')}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'intelligence' ? <IntelligenceView /> : <ScannerView />}
      </div>
    </main>
  );
}
