import 'server-only';

import { getSupabaseAdmin } from './supabase-admin';

// Read model over fixture_market_decision_cards (migration 020). The builder
// (normalize_odds_snapshots.py) already resolved price source, freshness and
// decision status — this loader is presentation-only mapping, no scoring.

export type DecisionStatus =
  | 'stat_signal_only'
  | 'no_odds_available'
  | 'priced_no_model'
  | 'stale_price'
  | 'insufficient_data'
  | 'model_ready_no_edge'
  | 'edge_candidate'
  | 'positive_edge';

export type PriceSourceQuality = 'reference' | 'conditional' | null;

export type DecisionCardView = {
  marketKey: string;
  selection: string;
  line: number | null;
  decisionStatus: DecisionStatus;
  priceSourceQuality: PriceSourceQuality;
  referenceBookmaker: string | null;
  referencePrice: number | null;
  referenceCapturedAt: string | null;
  mappingConfidence: 'exact' | 'inferred' | null;
  snapshotCount: number;
  latestSnapshotAt: string | null;
  signalBand: 'strong' | 'watch' | 'context' | 'low_info' | null;
  builtAt: string;
};

type DecisionCardRow = {
  built_at: string;
  decision_status: DecisionStatus;
  fixture_id: number;
  latest_snapshot_at: string | null;
  line: number | string | null;
  mapping_confidence: 'exact' | 'inferred' | null;
  market_key: string;
  price_source_quality: PriceSourceQuality;
  reference_bookmaker: string | null;
  reference_captured_at: string | null;
  reference_price: number | string | null;
  selection: string;
  signal_band: 'strong' | 'watch' | 'context' | 'low_info' | null;
  snapshot_count: number;
};

const CARD_COLUMNS =
  'fixture_id, market_key, selection, line, decision_status, price_source_quality, ' +
  'reference_bookmaker, reference_price, reference_captured_at, mapping_confidence, ' +
  'snapshot_count, latest_snapshot_at, signal_band, built_at';

function toView(row: DecisionCardRow): DecisionCardView {
  return {
    marketKey: row.market_key,
    selection: row.selection,
    line: row.line == null ? null : Number(row.line),
    decisionStatus: row.decision_status,
    priceSourceQuality: row.price_source_quality ?? null,
    referenceBookmaker: row.reference_bookmaker,
    referencePrice: row.reference_price == null ? null : Number(row.reference_price),
    referenceCapturedAt: row.reference_captured_at,
    mappingConfidence: row.mapping_confidence,
    snapshotCount: Number(row.snapshot_count ?? 0),
    latestSnapshotAt: row.latest_snapshot_at,
    signalBand: row.signal_band,
    builtAt: row.built_at,
  };
}

function sortCards(a: DecisionCardView, b: DecisionCardView) {
  return (
    a.marketKey.localeCompare(b.marketKey) ||
    (a.line ?? -1) - (b.line ?? -1) ||
    a.selection.localeCompare(b.selection)
  );
}

/** All prematch decision cards for one fixture — Comparison Odds tab. */
export async function loadDecisionCardsForFixture(fixtureId: number) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('fixture_market_decision_cards')
    .select(CARD_COLUMNS)
    .eq('fixture_id', fixtureId)
    .eq('market_scope', 'prematch');

  if (error) {
    throw new Error(`Failed to load decision cards: ${error.message}`);
  }

  return ((data ?? []) as unknown as DecisionCardRow[]).map(toView).sort(sortCards);
}

/**
 * Prematch decision cards for one market across many fixtures — Fixtures Board
 * price badges. Fixtures without cards are simply absent from the map: missing
 * data stays missing, it is never coerced to a default.
 */
export async function loadDecisionCardsByFixture(fixtureIds: number[], marketKey: string) {
  const cardsByFixture = new Map<number, DecisionCardView[]>();
  if (fixtureIds.length === 0 || !marketKey) {
    return cardsByFixture;
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('fixture_market_decision_cards')
    .select(CARD_COLUMNS)
    .in('fixture_id', fixtureIds)
    .eq('market_scope', 'prematch')
    .eq('market_key', marketKey);

  if (error) {
    throw new Error(`Failed to load decision cards: ${error.message}`);
  }

  for (const row of (data ?? []) as unknown as DecisionCardRow[]) {
    const cards = cardsByFixture.get(row.fixture_id) ?? [];
    cards.push(toView(row));
    cardsByFixture.set(row.fixture_id, cards);
  }

  cardsByFixture.forEach((cards) => cards.sort(sortCards));
  return cardsByFixture;
}
