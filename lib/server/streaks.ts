import 'server-only';

import type { TeamMarketTrendRecord } from '@/app/comparison/types';
import type { UpcomingFixtureView } from '@/lib/upcoming-fixtures';
import { loadUpcomingFixtures } from './fixture-data';
import { getSupabaseAdmin } from './supabase-admin';

export type StreakServerRow = {
  fixture: UpcomingFixtureView;
  teamName: string;
  trend: TeamMarketTrendRecord;
};

function findNextFixture(trend: TeamMarketTrendRecord, fixtures: UpcomingFixtureView[]) {
  return fixtures.find((fixture) => {
    const isSameLeagueSeason = fixture.league_id === trend.league_id && fixture.season === trend.season;
    if (!isSameLeagueSeason) {
      return false;
    }

    if (trend.scope === 'home') {
      return fixture.home_team_id === trend.team_id;
    }

    if (trend.scope === 'away') {
      return fixture.away_team_id === trend.team_id;
    }

    return fixture.home_team_id === trend.team_id || fixture.away_team_id === trend.team_id;
  });
}

export async function loadStreakRows(days: number, marketKey: string, minimumStreak: number) {
  if (!marketKey) {
    return [] as StreakServerRow[];
  }

  const fixtures = await loadUpcomingFixtures(days);
  if (fixtures.length === 0) {
    return [];
  }

  const supabaseAdmin = getSupabaseAdmin();
  const teamIds = [...new Set(fixtures.flatMap((fixture) => [fixture.home_team_id, fixture.away_team_id]))];
  const leagueIds = [...new Set(fixtures.map((fixture) => fixture.league_id))];
  const seasons = [...new Set(fixtures.map((fixture) => fixture.season))];

  const { data, error } = await supabaseAdmin
    .from('team_season_market_stats')
    .select(`
      team_id,
      league_id,
      season,
      scope,
      category,
      market_key,
      sample,
      hits,
      percentage,
      current_streak,
      longest_streak,
      last_5_sample,
      last_5_hits,
      last_5_percentage,
      last_10_sample,
      last_10_hits,
      last_10_percentage,
      updated_at
    `)
    .in('team_id', teamIds)
    .in('league_id', leagueIds)
    .in('season', seasons)
    .in('scope', ['overall', 'home', 'away'])
    .eq('market_key', marketKey);

  if (error) {
    throw new Error(`Failed to load streak trends: ${error.message}`);
  }

  const upcomingByTeam = new Map<number, UpcomingFixtureView[]>();
  for (const fixture of fixtures) {
    const homeFixtures = upcomingByTeam.get(fixture.home_team_id) ?? [];
    homeFixtures.push(fixture);
    upcomingByTeam.set(fixture.home_team_id, homeFixtures);

    const awayFixtures = upcomingByTeam.get(fixture.away_team_id) ?? [];
    awayFixtures.push(fixture);
    upcomingByTeam.set(fixture.away_team_id, awayFixtures);
  }

  return ((data ?? []) as TeamMarketTrendRecord[])
    .filter((trend) => trend.current_streak >= minimumStreak)
    .map((trend) => {
      const teamFixtures = upcomingByTeam.get(trend.team_id) ?? [];
      const fixture = findNextFixture(trend, teamFixtures);
      if (!fixture) {
        return null;
      }

      const teamName =
        fixture.home_team_id === trend.team_id
          ? fixture.home_team_view?.name ?? `Team ${trend.team_id}`
          : fixture.away_team_view?.name ?? `Team ${trend.team_id}`;

      return {
        fixture,
        teamName,
        trend,
      } satisfies StreakServerRow;
    })
    .filter((row): row is StreakServerRow => !!row)
    .sort((left, right) => {
      if (right.trend.current_streak !== left.trend.current_streak) {
        return right.trend.current_streak - left.trend.current_streak;
      }

      if (right.trend.percentage !== left.trend.percentage) {
        return right.trend.percentage - left.trend.percentage;
      }

      if (right.trend.sample !== left.trend.sample) {
        return right.trend.sample - left.trend.sample;
      }

      return new Date(left.fixture.date).getTime() - new Date(right.fixture.date).getTime();
    });
}
