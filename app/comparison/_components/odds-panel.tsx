'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/lib/fetch-json';
import { getMarketGroupByKey, getMarketLineByKey } from '../../market-catalog';
import { useLanguage } from '../../language-provider';
import { StatePanel } from '../../components/state-panel';

// Pure presentation over fixture_market_decision_cards. Status, price source
// and freshness were resolved by the serving-layer builder — nothing is
// recomputed here. null price = missing data and renders as '-', never 0.

type OddsPanelProps = {
  awayTeamName: string;
  fixtureId: number | null;
  homeTeamName: string;
};

type DecisionCardRecord = {
  marketKey: string;
  selection: string;
  line: number | null;
  decisionStatus: string;
  priceSourceQuality: 'reference' | 'conditional' | null;
  referenceBookmaker: string | null;
  referencePrice: number | null;
  referenceCapturedAt: string | null;
  mappingConfidence: 'exact' | 'inferred' | null;
  snapshotCount: number;
  latestSnapshotAt: string | null;
  signalBand: 'strong' | 'watch' | 'context' | 'low_info' | null;
  builtAt: string;
};

type DecisionCardsResponse = {
  cards: DecisionCardRecord[];
};

const SELECTION_LABELS: Record<string, string> = {
  home: 'Home',
  away: 'Away',
  draw: 'Draw',
  over: 'Over',
  under: 'Under',
  yes: 'Yes',
  no: 'No',
  win: 'Win',
  loss: 'Loss',
};

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

const SOURCE_LABELS: Record<string, string> = {
  reference: 'Reference',
  conditional: 'Coverage',
};

function statusTone(status: string) {
  if (status === 'positive_edge' || status === 'edge_candidate') {
    return 'text-[var(--app-success-text)]';
  }
  if (status === 'priced_no_model' || status === 'model_ready_no_edge') {
    return 'text-[var(--app-text)]';
  }
  return 'text-[var(--app-text-dim)]';
}

function formatCapturedAt(isoDate: string | null, locale: string) {
  if (!isoDate) return '-';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoDate));
}

function CardRow({ card, locale, t }: { card: DecisionCardRecord; locale: string; t: (text: string) => string }) {
  const marketLabel = getMarketLineByKey(card.marketKey)?.label ?? card.marketKey;
  const selectionLabel = SELECTION_LABELS[card.selection] ?? card.selection;
  const statusLabel = DECISION_STATUS_LABELS[card.decisionStatus] ?? card.decisionStatus;
  const sourceLabel = card.priceSourceQuality ? SOURCE_LABELS[card.priceSourceQuality] : null;
  const isStale = card.decisionStatus === 'stale_price';

  return (
    <div className="grid items-center gap-2 border-b border-[var(--app-border)] px-3 py-2 last:border-b-0 md:grid-cols-[minmax(200px,1.4fr)_90px_90px_minmax(110px,1fr)_110px_minmax(120px,1fr)_130px]">
      <div className="text-[12px] font-medium text-[var(--app-text)]">{t(marketLabel)}</div>
      <div className="text-[12px] text-[var(--app-text-soft)]">{t(selectionLabel)}</div>
      <div className={`text-[13px] font-semibold ${card.referencePrice === null ? 'text-[var(--app-text-dim)]' : isStale ? 'text-[var(--app-text-dim)] line-through' : 'text-[var(--app-text)]'}`}>
        {card.referencePrice === null ? '-' : card.referencePrice.toFixed(2)}
      </div>
      <div className="text-[12px] text-[var(--app-text-soft)]">{card.referenceBookmaker ?? '-'}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--app-text-dim)]">
        {sourceLabel ? t(sourceLabel) : '-'}
      </div>
      <div className={`text-[12px] font-semibold ${statusTone(card.decisionStatus)}`}>{t(statusLabel)}</div>
      <div className="text-[11px] text-[var(--app-text-dim)]">{formatCapturedAt(card.referenceCapturedAt, locale)}</div>
    </div>
  );
}

export function OddsPanel({ awayTeamName, fixtureId, homeTeamName }: OddsPanelProps) {
  const { locale, t } = useLanguage();
  const [cards, setCards] = useState<DecisionCardRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCards() {
      if (!fixtureId) {
        setCards([]);
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetchJson<DecisionCardsResponse>(
          `/api/v1/comparison/decision-cards?fixtureId=${fixtureId}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setCards(response.cards);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Failed to load decision cards', error);
        setCards([]);
        setErrorMessage('Decision cards could not be loaded.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadCards();
    return () => controller.abort();
  }, [fixtureId]);

  const groupedCards = useMemo(() => {
    const groups = new Map<string, { label: string; cards: DecisionCardRecord[] }>();
    for (const card of cards) {
      const isCatalogKey = getMarketLineByKey(card.marketKey) !== null;
      const group = isCatalogKey ? getMarketGroupByKey(card.marketKey) : null;
      const groupId = group?.id ?? 'other';
      const groupLabel = group?.label ?? 'Other markets';
      const existing = groups.get(groupId) ?? { label: groupLabel, cards: [] };
      existing.cards.push(card);
      groups.set(groupId, existing);
    }
    return [...groups.entries()].map(([id, value]) => ({ id, ...value }));
  }, [cards]);

  const pricedCount = useMemo(
    () => cards.filter((card) => card.referencePrice !== null).length,
    [cards],
  );

  if (!fixtureId) {
    return (
      <StatePanel
        description={t('Select a fixture to see its market prices and decision state.')}
        title={t('No fixture selected yet')}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex flex-col gap-1 border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--app-text)]">
          {`${homeTeamName} ${t('vs')} ${awayTeamName}`}
        </h2>
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--app-text-dim)]">
          {`${t('Pre-match')} · ${pricedCount} ${t('priced markets')}`}
        </p>
      </div>

      {errorMessage ? (
        <div className="flex h-32 items-center justify-center px-4 text-center text-[12px] text-[var(--app-text-dim)]">
          {t(errorMessage)}
        </div>
      ) : isLoading ? (
        <div className="flex h-32 items-center justify-center px-4 text-center text-[12px] text-[var(--app-text-dim)]">
          {t('Loading market prices...')}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex h-32 items-center justify-center px-4 text-center text-[12px] text-[var(--app-text-dim)]">
          {t('No decision cards exist for this fixture yet. The odds pipeline has not captured prices for it.')}
        </div>
      ) : (
        <div>
          <div className="hidden border-b border-[var(--app-border)] bg-[var(--app-canvas)] px-3 py-1.5 text-[12px] font-semibold text-[var(--app-text-dim)] md:grid md:grid-cols-[minmax(200px,1.4fr)_90px_90px_minmax(110px,1fr)_110px_minmax(120px,1fr)_130px]">
            <div>{t('Market')}</div>
            <div>{t('Selection')}</div>
            <div>{t('Price')}</div>
            <div>{t('Bookmaker')}</div>
            <div>{t('Source')}</div>
            <div>{t('Status')}</div>
            <div>{t('Captured')}</div>
          </div>

          {groupedCards.map((group) => (
            <div key={group.id}>
              <div className="border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">
                {t(group.label)}
              </div>
              {group.cards.map((card) => (
                <CardRow
                  card={card}
                  key={`${card.marketKey}:${card.selection}:${card.line ?? ''}`}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
