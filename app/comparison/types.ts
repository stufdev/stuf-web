export type NameRelation = { name: string };
export type TeamOption = { id: number; name: string; logo_url: string | null };
export type TeamRelation = { id: number; name: string; logo_url?: string | null };

export type UpcomingFixtureRecord = {
  id: number;
  date: string;
  status_short?: string | null;
  home_team_id: number;
  away_team_id: number;
  league_id: number;
  season: number;
  referee_id: number | null;
  referee_name_raw: string | null;
  league_name?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  home_team: NameRelation | NameRelation[] | null;
  away_team: NameRelation | NameRelation[] | null;
  home_team_view?: TeamRelation | null;
  away_team_view?: TeamRelation | null;
};

export type HistoricalMatch = {
  id: number;
  date: string;
  playedAt: string;
  competitionLabel: string;
  homeTeamName: string;
  awayTeamName: string;
  isHome: boolean;
  result: 'win' | 'draw' | 'loss' | null;
  dataQuality: 'ok' | 'partial' | 'missing_stats';

  homeGoals: number | null;
  awayGoals: number | null;
  homeGoals1H: number | null;
  awayGoals1H: number | null;
  homeGoals2H: number | null;
  awayGoals2H: number | null;

  homeCorners: number | null;
  awayCorners: number | null;
  homeCorners1H: number | null;
  awayCorners1H: number | null;
  homeCorners2H: number | null;
  awayCorners2H: number | null;

  homeCards: number | null;
  awayCards: number | null;
  homeRedCards: number | null;
  awayRedCards: number | null;

  homeBookingPoints: number | null;
  awayBookingPoints: number | null;

  homeShots: number | null;
  awayShots: number | null;
  homeShotsOnTarget: number | null;
  awayShotsOnTarget: number | null;

  homeFouls: number | null;
  awayFouls: number | null;

  homeOffsides: number | null;
  awayOffsides: number | null;

  hit: boolean | null;
};

export type ComparisonScope = 'all' | 'split';

export type TrendCategoryId =
  | 'all'
  | 'result'
  | 'goals'
  | 'goals_1h'
  | 'goals_2h'
  | 'btts'
  | 'half'
  | 'corners'
  | 'booking_points'
  | 'cards'
  | 'shots'
  | 'fouls'
  | 'offsides';

export type StatisticsCategoryId =
  | 'all'
  | 'booking_points'
  | 'btts'
  | 'cards'
  | 'corners'
  | 'goals'
  | 'goals_1h'
  | 'goals_2h'
  | 'shots'
  | 'fouls'
  | 'offsides';

export type PlayerStatsCategoryId =
  | 'goals'
  | 'assists'
  | 'cards'
  | 'shots'
  | 'shots_on_target'
  | 'fouls'
  | 'fouls_won'
  | 'tackles'
  | 'offsides';

export type PlayerGoalSplitId = 'goals' | 'first_goals' | 'goals_1h' | 'goals_2h';

export type MarketDefinitionRelation = {
  label: string;
  display_order: number | null;
  period?: string | null;
};

export type TeamMarketTrendRecord = {
  team_id: number;
  league_id: number;
  season: number;
  scope: 'overall' | 'home' | 'away';
  category: Exclude<TrendCategoryId, 'all'>;
  market_key: string;
  sample: number;
  hits: number;
  percentage: number;
  current_streak: number;
  longest_streak: number;
  last_5_sample: number | null;
  last_5_hits: number | null;
  last_5_percentage: number | null;
  last_10_sample: number | null;
  last_10_hits: number | null;
  last_10_percentage: number | null;
  updated_at: string;
  market_definition?: MarketDefinitionRelation | MarketDefinitionRelation[] | null;
};

export type TrendListItem = {
  id: string;
  text: string;
  category: Exclude<TrendCategoryId, 'all'>;
  marketKey: string;
  sortOrder: number;
  emphasis: 'streak' | 'frequency';
  isHot: boolean;
};

export type TeamStatAveragesRecord = {
  team_id: number;
  league_id: number;
  season: number;
  scope: 'overall' | 'home' | 'away';
  matches_played: number;
  avg_goals_total: number | null;
  avg_goals_for: number | null;
  avg_goals_against: number | null;
  avg_1h_goals_total: number | null;
  avg_1h_goals_for: number | null;
  avg_1h_goals_against: number | null;
  avg_2h_goals_total: number | null;
  avg_2h_goals_for: number | null;
  avg_2h_goals_against: number | null;
  avg_corners_total: number | null;
  avg_corners_for: number | null;
  avg_corners_against: number | null;
  avg_1h_corners_total: number | null;
  avg_1h_corners_for: number | null;
  avg_1h_corners_against: number | null;
  avg_2h_corners_total: number | null;
  avg_2h_corners_for: number | null;
  avg_2h_corners_against: number | null;
  avg_booking_points_total: number | null;
  avg_booking_points_for: number | null;
  avg_booking_points_against: number | null;
  avg_cards_total: number | null;
  avg_cards_for: number | null;
  avg_cards_against: number | null;
  avg_fouls_total: number | null;
  avg_fouls_committed: number | null;
  avg_fouls_won: number | null;
  avg_offsides_total: number | null;
  avg_offsides_for: number | null;
  avg_offsides_against: number | null;
  avg_total_shots_for: number | null;
  avg_total_shots_against: number | null;
  avg_shots_on_target_for: number | null;
  avg_shots_on_target_against: number | null;
  avg_goal_kicks_total: number | null;
  avg_goal_kicks_for: number | null;
  avg_goal_kicks_against: number | null;
  avg_throw_ins_total: number | null;
  avg_throw_ins_for: number | null;
  avg_throw_ins_against: number | null;
  avg_tackles_total: number | null;
  avg_tackles_for: number | null;
  avg_tackles_against: number | null;
  updated_at: string;
};

export type ComparisonCoreResponse = {
  awayMatches: HistoricalMatch[];
  awaySummary: TeamStatAveragesRecord | null;
  awayTrends: TeamMarketTrendRecord[];
  headToHeadMatches: HistoricalMatch[];
  homeMatches: HistoricalMatch[];
  homeSummary: TeamStatAveragesRecord | null;
  homeTrends: TeamMarketTrendRecord[];
};

export type PlayerFixtureStatRecord = {
  fixture_id: number;
  player_id: number;
  team_id: number;
  league_id: number;
  season: number;
  played_at: string;
  is_home: boolean;
  position: string | null;
  minutes: number;
  substitute: boolean | null;
  goals: number;
  assists: number;
  total_shots: number;
  shots_on_target: number;
  tackles: number;
  fouls_committed: number;
  fouls_drawn: number;
  offsides: number;
  yellow_cards: number;
  red_cards: number;
};

export type PlayerGoalEventRecord = {
  fixture_id: number;
  team_id: number | null;
  player_id: number | null;
  elapsed: number | null;
  extra_time: number | null;
  type: string | null;
  detail: string | null;
  created_at: string;
};

export type PlayerFixtureContextRecord = {
  id: number;
  date: string;
  home_team_id: number;
  away_team_id: number;
  home_goals: number | null;
  away_goals: number | null;
};
