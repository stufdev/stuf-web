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
