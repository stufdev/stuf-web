export type MarketLine = {
  key: string;
  label: string;
};

export type MarketGroup = {
  id: string;
  label: string;
  lines: readonly MarketLine[];
};

export const MARKET_GROUPS: readonly MarketGroup[] = [
  {
    id: 'result',
    label: 'Result',
    lines: [
      { key: 'WIN', label: 'Win' },
      { key: 'DRAW', label: 'Draw' },
      { key: 'LOSS', label: 'Loss' },
      { key: 'UNBEATEN', label: 'Unbeaten' },
      { key: 'WINLESS', label: 'Winless' },
    ],
  },
  {
    id: 'btts',
    label: 'BTTS',
    lines: [{ key: 'BTTS_YES', label: 'BTTS' }],
  },
  {
    id: 'goals',
    label: 'Goals',
    lines: [
      { key: 'MATCH_OVER_1_5_GOALS', label: 'Over 1.5 Goals' },
      { key: 'MATCH_OVER_2_5_GOALS', label: 'Over 2.5 Goals' },
      { key: 'MATCH_OVER_3_5_GOALS', label: 'Over 3.5 Goals' },
      { key: 'MATCH_UNDER_2_5_GOALS', label: 'Under 2.5 Goals' },
      { key: 'MATCH_UNDER_3_5_GOALS', label: 'Under 3.5 Goals' },
      { key: 'TEAM_OVER_0_5_GOALS_FOR', label: 'Over 0.5 Team Goals For' },
      { key: 'TEAM_OVER_1_5_GOALS_FOR', label: 'Over 1.5 Team Goals For' },
      { key: 'TEAM_OVER_0_5_GOALS_AGAINST', label: 'Over 0.5 Team Goals Against' },
      { key: 'TEAM_OVER_1_5_GOALS_AGAINST', label: 'Over 1.5 Team Goals Against' },
    ],
  },
  {
    id: 'goals-1h',
    label: 'Goals 1H',
    lines: [
      { key: 'MATCH_OVER_0_5_1H_GOALS', label: 'Over 0.5 1st Half Goals' },
      { key: 'MATCH_OVER_1_5_1H_GOALS', label: 'Over 1.5 1st Half Goals' },
      { key: 'TEAM_OVER_0_5_1H_GOALS_FOR', label: 'Over 0.5 1st Half Goals For' },
      { key: 'TEAM_OVER_0_5_1H_GOALS_AGAINST', label: 'Over 0.5 1st Half Goals Against' },
    ],
  },
  {
    id: 'goals-2h',
    label: 'Goals 2H',
    lines: [
      { key: 'MATCH_OVER_0_5_2H_GOALS', label: 'Over 0.5 2nd Half Goals' },
      { key: 'MATCH_OVER_1_5_2H_GOALS', label: 'Over 1.5 2nd Half Goals' },
      { key: 'TEAM_OVER_0_5_2H_GOALS_FOR', label: 'Over 0.5 2nd Half Goals For' },
      { key: 'TEAM_OVER_0_5_2H_GOALS_AGAINST', label: 'Over 0.5 2nd Half Goals Against' },
    ],
  },
  {
    id: 'corners',
    label: 'Corners',
    lines: [
      { key: 'MATCH_OVER_8_5_CORNERS', label: 'Over 8.5 Match Corners' },
      { key: 'MATCH_OVER_9_5_CORNERS', label: 'Over 9.5 Match Corners' },
      { key: 'MATCH_OVER_10_5_CORNERS', label: 'Over 10.5 Match Corners' },
      { key: 'TEAM_OVER_2_5_CORNERS_FOR', label: 'Over 2.5 Team Corners For' },
      { key: 'TEAM_OVER_3_5_CORNERS_FOR', label: 'Over 3.5 Team Corners For' },
      { key: 'TEAM_OVER_4_5_CORNERS_FOR', label: 'Over 4.5 Team Corners For' },
      { key: 'TEAM_OVER_5_5_CORNERS_FOR', label: 'Over 5.5 Team Corners For' },
      { key: 'TEAM_OVER_2_5_CORNERS_AGAINST', label: 'Over 2.5 Team Corners Against' },
      { key: 'TEAM_OVER_3_5_CORNERS_AGAINST', label: 'Over 3.5 Team Corners Against' },
      { key: 'MOST_CORNERS', label: 'Most Corners' },
    ],
  },
  {
    id: 'booking-points',
    label: 'Booking Points',
    lines: [
      { key: 'MATCH_OVER_15_BOOKING_POINTS', label: 'Over 15 Booking Points' },
      { key: 'MATCH_OVER_25_BOOKING_POINTS', label: 'Over 25 Booking Points' },
      { key: 'MATCH_OVER_35_BOOKING_POINTS', label: 'Over 35 Booking Points' },
      { key: 'MATCH_OVER_45_BOOKING_POINTS', label: 'Over 45 Booking Points' },
      { key: 'MATCH_OVER_55_BOOKING_POINTS', label: 'Over 55 Booking Points' },
      { key: 'MATCH_OVER_65_BOOKING_POINTS', label: 'Over 65 Booking Points' },
      { key: 'TEAM_OVER_15_BOOKING_POINTS_FOR', label: 'Over 15 Team Booking Points For' },
      { key: 'TEAM_OVER_25_BOOKING_POINTS_FOR', label: 'Over 25 Team Booking Points For' },
      { key: 'TEAM_OVER_15_BOOKING_POINTS_AGAINST', label: 'Over 15 Team Booking Points Against' },
      { key: 'TEAM_OVER_25_BOOKING_POINTS_AGAINST', label: 'Over 25 Team Booking Points Against' },
      { key: 'EACH_TEAM_OVER_5_BOOKING_POINTS', label: 'Each Team Over 5 Booking Points' },
      { key: 'EACH_TEAM_OVER_15_BOOKING_POINTS', label: 'Each Team Over 15 Booking Points' },
      { key: 'EACH_TEAM_OVER_25_BOOKING_POINTS', label: 'Each Team Over 25 Booking Points' },
    ],
  },
  {
    id: 'cards',
    label: 'Cards',
    lines: [
      { key: 'MATCH_OVER_1_5_CARDS', label: 'Over 1.5 Total Cards' },
      { key: 'MATCH_OVER_2_5_CARDS', label: 'Over 2.5 Total Cards' },
      { key: 'MATCH_OVER_3_5_CARDS', label: 'Over 3.5 Total Cards' },
      { key: 'MATCH_OVER_4_5_CARDS', label: 'Over 4.5 Total Cards' },
      { key: 'MATCH_OVER_5_5_CARDS', label: 'Over 5.5 Total Cards' },
      { key: 'MATCH_OVER_6_5_CARDS', label: 'Over 6.5 Total Cards' },
      { key: 'TEAM_OVER_1_5_CARDS_FOR', label: 'Over 1.5 Team Cards For' },
      { key: 'TEAM_OVER_2_5_CARDS_FOR', label: 'Over 2.5 Team Cards For' },
      { key: 'OPPONENT_OVER_1_5_CARDS', label: 'Over 1.5 Team Cards Against' },
      { key: 'OPPONENT_OVER_2_5_CARDS', label: 'Over 2.5 Team Cards Against' },
      { key: 'EACH_TEAM_OVER_0_5_CARDS', label: 'Each Team Over 0.5 Cards' },
      { key: 'EACH_TEAM_OVER_1_5_CARDS', label: 'Each Team Over 1.5 Cards' },
      { key: 'EACH_TEAM_OVER_2_5_CARDS', label: 'Each Team Over 2.5 Cards' },
    ],
  },
  {
    id: 'shots',
    label: 'Shots',
    lines: [
      { key: 'TEAM_OVER_10_5_SHOTS_FOR', label: 'Over 10.5 Team Shots For' },
      { key: 'TEAM_OVER_3_5_SHOTS_ON_TARGET_FOR', label: 'Over 3.5 Team Shots On Target For' },
    ],
  },
  {
    id: 'fouls',
    label: 'Fouls',
    lines: [
      { key: 'MATCH_OVER_20_5_FOULS', label: 'Over 20.5 Match Fouls' },
      { key: 'TEAM_OVER_10_5_FOULS_COMMITTED', label: 'Over 10.5 Team Fouls Committed' },
    ],
  },
  {
    id: 'offsides',
    label: 'Offsides',
    lines: [
      { key: 'MATCH_OVER_2_5_OFFSIDES', label: 'Over 2.5 Match Offsides' },
      { key: 'TEAM_OVER_1_5_OFFSIDES_FOR', label: 'Over 1.5 Team Offsides For' },
    ],
  },
] as const;

export const DEFAULT_MARKET_GROUP =
  MARKET_GROUPS.find((group) => group.id === 'goals') ?? MARKET_GROUPS[0];

export const DEFAULT_MARKET_LINE =
  DEFAULT_MARKET_GROUP.lines.find((line) => line.key === 'MATCH_OVER_2_5_GOALS') ??
  DEFAULT_MARKET_GROUP.lines[0];

const MARKET_GROUP_MAP = new Map(MARKET_GROUPS.map((group) => [group.id, group]));
const MARKET_LINE_MAP = new Map(
  MARKET_GROUPS.flatMap((group) => group.lines.map((line) => [line.key, line] as const)),
);

export function getMarketGroup(groupId: string) {
  return MARKET_GROUP_MAP.get(groupId) ?? DEFAULT_MARKET_GROUP;
}

export function getMarketGroupByKey(marketKey: string) {
  for (const group of MARKET_GROUPS) {
    if (group.lines.some((line) => line.key === marketKey)) {
      return group;
    }
  }
  return DEFAULT_MARKET_GROUP;
}

export function getMarketLineByKey(marketKey: string) {
  return MARKET_LINE_MAP.get(marketKey) ?? null;
}

export function getMarketLabelByKey(marketKey: string, fallback?: string) {
  return getMarketLineByKey(marketKey)?.label ?? fallback ?? marketKey;
}
