// stat_signal_only categories served by the generic market scanner.
// These have no statistic/line dimension — the market key IS the selection.
// Bespoke categories (corners, goals, shots, offsides, cards) keep their own scanners.

export const GENERIC_MARKET_CATEGORIES: Record<string, { label: string; description: string }> = {
  result: {
    label: 'Result',
    description: 'Win, draw, loss, unbeaten and winless team trends.',
  },
  half_result: {
    label: 'Half Result',
    description: 'First-half and second-half result trends per team.',
  },
  btts: {
    label: 'BTTS',
    description: 'Both teams to score trends — full match, by half and both halves.',
  },
  booking_points: {
    label: 'Booking Points',
    description: 'Booking points trends (yellow = 10, red = 25) per match and per team.',
  },
  fouls: {
    label: 'Fouls',
    description: 'Match and team fouls committed trends.',
  },
};

export function isGenericMarketCategory(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(GENERIC_MARKET_CATEGORIES, value);
}
