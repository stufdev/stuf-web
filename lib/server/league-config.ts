import 'server-only';

import { getSupabaseAdmin } from './supabase-admin';

export type SupportedLeagueFeature = 'comparison' | 'fixtures' | 'streaks';

type SupportedLeagueRow = {
  league_id: number | string | null;
};

const FEATURE_COLUMNS: Record<
  SupportedLeagueFeature,
  'enabled_for_comparison' | 'enabled_for_fixtures' | 'enabled_for_streaks'
> = {
  comparison: 'enabled_for_comparison',
  fixtures: 'enabled_for_fixtures',
  streaks: 'enabled_for_streaks',
};

export async function getSupportedLeagueIds(feature: SupportedLeagueFeature) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('supported_leagues')
    .select('league_id')
    .eq('is_active', true)
    .eq(FEATURE_COLUMNS[feature], true)
    .order('display_order', { ascending: true })
    .order('league_id', { ascending: true });

  if (error) {
    throw new Error(`Failed to load supported leagues for ${feature}: ${error.message}`);
  }

  const leagueIds = [...new Set(
    ((data ?? []) as SupportedLeagueRow[])
      .map((row) => Number(row.league_id))
      .filter((value) => Number.isInteger(value) && value > 0),
  )];

  if (leagueIds.length === 0) {
    throw new Error('No supported leagues configured.');
  }

  return leagueIds;
}

export type SupportedLeagueSeason = { leagueId: number; season: number };

type SupportedLeagueSeasonRow = {
  league_id: number | string | null;
  season: number | string | null;
};

/**
 * Returns one (leagueId, season) pair per supported league for a feature, using
 * the most recent (current) configured season per league. This is the single
 * source of truth for "which season is current" — callers must use it to filter
 * season-keyed tables explicitly instead of relying on the DB happening to hold
 * only one season. Critical once a second season exists (e.g. World Cup 2026
 * alongside the 2025 club season): without it, season-keyed reads mix seasons.
 */
export async function getSupportedLeagueSeasons(
  feature: SupportedLeagueFeature,
): Promise<SupportedLeagueSeason[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('supported_leagues')
    .select('league_id, season')
    .eq('is_active', true)
    .eq(FEATURE_COLUMNS[feature], true)
    .order('display_order', { ascending: true })
    .order('league_id', { ascending: true })
    .order('season', { ascending: false });

  if (error) {
    throw new Error(`Failed to load supported league seasons for ${feature}: ${error.message}`);
  }

  // First row per league wins — ordering puts the most recent season first.
  const currentByLeague = new Map<number, number>();
  for (const row of (data ?? []) as SupportedLeagueSeasonRow[]) {
    const leagueId = Number(row.league_id);
    const season = Number(row.season);
    if (!Number.isInteger(leagueId) || leagueId <= 0 || !Number.isInteger(season)) continue;
    if (!currentByLeague.has(leagueId)) {
      currentByLeague.set(leagueId, season);
    }
  }

  const pairs = [...currentByLeague.entries()].map(([leagueId, season]) => ({ leagueId, season }));
  if (pairs.length === 0) {
    throw new Error(`No supported leagues configured for ${feature}.`);
  }

  return pairs;
}
