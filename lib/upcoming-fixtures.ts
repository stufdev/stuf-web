import { fetchJson } from '@/lib/fetch-json';

export const UPCOMING_STATUSES = ['NS', 'TBD'] as const;

export type FixtureTeamRelation = {
  id: number;
  name: string | null;
  logo_url: string | null;
};

export type UpcomingFixtureRecord = {
  id: number;
  date: string;
  status_short: string | null;
  home_team_id: number;
  away_team_id: number;
  league_id: number;
  season: number;
  referee_id?: number | null;
  referee_name_raw?: string | null;
  home_team: FixtureTeamRelation | FixtureTeamRelation[] | null;
  away_team: FixtureTeamRelation | FixtureTeamRelation[] | null;
};

export type FixtureLeagueContext = {
  id: number;
  name: string | null;
  country_code: string | null;
  country_name: string | null;
};

export type UpcomingFixtureView = UpcomingFixtureRecord & {
  home_team_view: FixtureTeamRelation | null;
  away_team_view: FixtureTeamRelation | null;
  league_name: string | null;
  country_code: string | null;
  country_name: string | null;
};

export async function fetchUpcomingFixtures(windowDays: number) {
  return fetchJson<UpcomingFixtureView[]>(`/api/v1/upcoming-fixtures?days=${windowDays}`);
}
