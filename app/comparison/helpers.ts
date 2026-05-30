import { translateUiText, type AppLanguage } from '../i18n';
import { getMarketGroupByKey, getMarketLabelByKey } from '../market-catalog';
import type {
  HistoricalMatch,
  NameRelation,
  PlayerGoalSplitId,
  PlayerStatsCategoryId,
  StatisticsCategoryId,
  TeamMarketTrendRecord,
  TeamRelation,
  TrendCategoryId,
  TrendListItem,
} from './types';

export const TREND_CATEGORY_TABS: Array<{
  id: TrendCategoryId;
  label: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'result', label: 'Result' },
  { id: 'goals', label: 'Goals' },
  { id: 'btts', label: 'BTTS' },
  { id: 'half', label: 'Half' },
  { id: 'corners', label: 'Corners' },
  { id: 'booking_points', label: 'Booking Points' },
  { id: 'cards', label: 'Cards' },
  { id: 'shots', label: 'Shots' },
  { id: 'fouls', label: 'Fouls' },
  { id: 'offsides', label: 'Offsides' },
] as const;

export const STATISTICS_CATEGORY_TABS: Array<{
  id: StatisticsCategoryId;
  label: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'goals', label: 'Goals' },
  { id: 'goals_1h', label: 'Goals 1H' },
  { id: 'goals_2h', label: 'Goals 2H' },
  { id: 'btts', label: 'BTTS' },
  { id: 'corners', label: 'Corners' },
  { id: 'booking_points', label: 'Booking Points' },
  { id: 'cards', label: 'Cards' },
  { id: 'shots', label: 'Shots' },
  { id: 'fouls', label: 'Fouls' },
  { id: 'offsides', label: 'Offsides' },
] as const;

export const PLAYER_STATS_CATEGORY_TABS: Array<{
  id: PlayerStatsCategoryId;
  label: string;
}> = [
  { id: 'goals', label: 'Goals' },
  { id: 'assists', label: 'Assists' },
  { id: 'cards', label: 'Cards' },
  { id: 'shots', label: 'Shots' },
  { id: 'shots_on_target', label: 'Shots on target' },
  { id: 'fouls', label: 'Fouls' },
  { id: 'fouls_won', label: 'Fouls Won' },
  { id: 'tackles', label: 'Tackles' },
  { id: 'offsides', label: 'Offsides' },
] as const;

export const PLAYER_GOAL_SPLIT_TABS: Array<{
  id: PlayerGoalSplitId;
  label: string;
}> = [
  { id: 'goals', label: 'Goals' },
  { id: 'first_goals', label: '1st Goals' },
  { id: 'goals_1h', label: '1H Goals' },
  { id: 'goals_2h', label: '2H Goals' },
] as const;

export type StatisticsMarketRow = {
  marketKey: string;
  label: string;
  sortOrder: number;
  category: StatisticsCategoryId;
  home: TeamMarketTrendRecord | null;
  away: TeamMarketTrendRecord | null;
};

const MISSING_PLACEHOLDER = '—';

export function getRelationName(relation: NameRelation | NameRelation[] | null | undefined) {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0]?.name ?? null : relation.name;
}

export function getTeamName(relation: TeamRelation | TeamRelation[] | null | undefined) {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0]?.name ?? null : relation.name;
}

export function getCompetitionLabel(leagueName?: string | null) {
  if (!leagueName) return 'N/A';

  const words = leagueName
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();

  return words
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function getCenterColumnLabel(statType: string, language: AppLanguage = 'en') {
  let label = 'Selected stat';

  if (['WIN', 'DRAW', 'LOSS', 'UNBEATEN', 'WINLESS', 'BTTS_YES'].includes(statType)) {
    label = 'Full time score';
  } else if (statType.includes('_1H_')) {
    label = '1st half goals';
  } else if (statType.includes('_2H_')) {
    label = '2nd half goals';
  } else {
    const group = getMarketGroupByKey(statType);
    if (group.id === 'corners') label = 'Corners';
    else if (group.id === 'shots') {
      label = statType.includes('SHOTS_ON_TARGET') ? 'Shots on target' : 'Total shots';
    } else if (group.id === 'fouls') {
      label = 'Fouls';
    } else if (group.id === 'offsides') {
      label = 'Offsides';
    } else if (group.id === 'booking-points') {
      label = 'Booking points';
    } else if (group.id === 'cards') {
      label = 'Cards';
    } else if (group.id === 'goals' || group.id === 'goals-1h' || group.id === 'goals-2h') {
      label = 'Goals';
    }
  }

  return translateUiText(language, label);
}

function formatPair(home: number | null, away: number | null) {
  if (home == null || away == null) return MISSING_PLACEHOLDER;
  return `${home}-${away}`;
}

export function getMatchDisplayValue(match: HistoricalMatch, statType: string) {
  if (statType.includes('_1H_')) {
    return formatPair(match.homeGoals1H, match.awayGoals1H);
  }

  if (statType.includes('_2H_')) {
    return formatPair(match.homeGoals2H, match.awayGoals2H);
  }

  if (statType.includes('CORNERS')) {
    return formatPair(match.homeCorners, match.awayCorners);
  }

  if (statType.includes('BOOKING_POINTS')) {
    return formatPair(match.homeBookingPoints, match.awayBookingPoints);
  }

  if (statType.includes('CARDS')) {
    return formatPair(match.homeCards, match.awayCards);
  }

  if (statType.includes('SHOTS_ON_TARGET')) {
    return formatPair(match.homeShotsOnTarget, match.awayShotsOnTarget);
  }

  if (statType.includes('SHOTS')) {
    return formatPair(match.homeShots, match.awayShots);
  }

  if (statType.includes('FOULS')) {
    return formatPair(match.homeFouls, match.awayFouls);
  }

  if (statType.includes('OFFSIDES')) {
    return formatPair(match.homeOffsides, match.awayOffsides);
  }

  return formatPair(match.homeGoals, match.awayGoals);
}

export function getMatchRowClass(hit: boolean | null) {
  return hit === true ? 'bg-emerald-500/10' : '';
}

export function getMatchValueClass(hit: boolean | null) {
  if (hit === true) return 'text-[#d7ffe6]';
  if (hit === false) return 'text-[var(--app-text)]';
  return 'text-[var(--app-text-dim)]';
}

export function getTrendScopeLabel(scope: 'overall' | 'home' | 'away', language: AppLanguage = 'en') {
  if (language === 'es') {
    if (scope === 'home') return 'partidos de liga como local';
    if (scope === 'away') return 'partidos de liga como visitante';
    return 'partidos de liga';
  }

  if (scope === 'home') return 'home league matches';
  if (scope === 'away') return 'away league matches';
  return 'league matches';
}

function isBttsLabel(rawLabel: string) {
  return rawLabel === 'BTTS' || rawLabel === 'BTTS Yes';
}

export function buildTrendStreakSentence({
  rawLabel,
  translatedLabel,
  scope,
  streak,
  language = 'en',
  subject,
}: {
  rawLabel: string;
  translatedLabel: string;
  scope: 'overall' | 'home' | 'away';
  streak: number;
  language?: AppLanguage;
  subject?: string;
}) {
  const scopeLabel = getTrendScopeLabel(scope, language);

  if (language === 'es') {
    if (subject) {
      if (rawLabel === 'Win') return `${subject} ha ganado en sus últimos ${streak} ${scopeLabel}`;
      if (rawLabel === 'Draw') return `${subject} ha empatado en sus últimos ${streak} ${scopeLabel}`;
      if (rawLabel === 'Loss') return `${subject} ha perdido en sus últimos ${streak} ${scopeLabel}`;
      if (rawLabel === 'Unbeaten') return `${subject} sigue invicto en sus últimos ${streak} ${scopeLabel}`;
      if (rawLabel === 'Winless') return `${subject} no ha ganado en sus últimos ${streak} ${scopeLabel}`;
      if (isBttsLabel(rawLabel)) return `${subject} ha tenido BTTS en sus últimos ${streak} ${scopeLabel}`;
      return `${subject} ha tenido ${translatedLabel} en sus últimos ${streak} ${scopeLabel}`;
    }

    if (rawLabel === 'Win') return `Ganó en los últimos ${streak} ${scopeLabel}`;
    if (rawLabel === 'Draw') return `Empató en los últimos ${streak} ${scopeLabel}`;
    if (rawLabel === 'Loss') return `Perdió en los últimos ${streak} ${scopeLabel}`;
    if (rawLabel === 'Unbeaten') return `Invicto en los últimos ${streak} ${scopeLabel}`;
    if (rawLabel === 'Winless') return `Sin ganar en los últimos ${streak} ${scopeLabel}`;
    if (isBttsLabel(rawLabel)) return `BTTS en los últimos ${streak} ${scopeLabel}`;
    return `${translatedLabel} en los últimos ${streak} ${scopeLabel}`;
  }

  if (subject) {
    if (rawLabel === 'Win') return `${subject} have won in their last ${streak} ${scopeLabel}`;
    if (rawLabel === 'Draw') return `${subject} have drawn in their last ${streak} ${scopeLabel}`;
    if (rawLabel === 'Loss') return `${subject} have lost in their last ${streak} ${scopeLabel}`;
    if (rawLabel === 'Unbeaten') return `${subject} have been unbeaten in their last ${streak} ${scopeLabel}`;
    if (rawLabel === 'Winless') return `${subject} have been winless in their last ${streak} ${scopeLabel}`;
    if (isBttsLabel(rawLabel)) return `${subject} have had BTTS in their last ${streak} ${scopeLabel}`;
    return `${subject} have had ${translatedLabel} in their last ${streak} ${scopeLabel}`;
  }

  if (rawLabel === 'Win') return `Won in the last ${streak} ${scopeLabel}`;
  if (rawLabel === 'Draw') return `Drawn in the last ${streak} ${scopeLabel}`;
  if (rawLabel === 'Loss') return `Lost in the last ${streak} ${scopeLabel}`;
  if (rawLabel === 'Unbeaten') return `Unbeaten in the last ${streak} ${scopeLabel}`;
  if (rawLabel === 'Winless') return `Winless in the last ${streak} ${scopeLabel}`;
  if (isBttsLabel(rawLabel)) return `BTTS in the last ${streak} ${scopeLabel}`;
  return `${translatedLabel} in the last ${streak} ${scopeLabel}`;
}

export function buildTrendFrequencySentence({
  rawLabel,
  translatedLabel,
  scope,
  hits,
  sample,
  language = 'en',
  subject,
}: {
  rawLabel: string;
  translatedLabel: string;
  scope: 'overall' | 'home' | 'away';
  hits: number;
  sample: number;
  language?: AppLanguage;
  subject?: string;
}) {
  const scopeLabel = getTrendScopeLabel(scope, language);

  if (language === 'es') {
    if (subject) {
      if (isBttsLabel(rawLabel)) return `${subject} ha tenido BTTS en ${hits}/${sample} ${scopeLabel}`;
      return `${subject} ha tenido ${translatedLabel} en ${hits}/${sample} ${scopeLabel}`;
    }

    if (isBttsLabel(rawLabel)) return `BTTS en ${hits}/${sample} ${scopeLabel}`;
    return `${translatedLabel} en ${hits}/${sample} ${scopeLabel}`;
  }

  if (subject) {
    if (isBttsLabel(rawLabel)) return `${subject} have had BTTS in ${hits}/${sample} ${scopeLabel}`;
    return `${subject} have had ${translatedLabel} in ${hits}/${sample} ${scopeLabel}`;
  }

  if (isBttsLabel(rawLabel)) return `BTTS in ${hits}/${sample} ${scopeLabel}`;
  return `${translatedLabel} in ${hits}/${sample} ${scopeLabel}`;
}

export function getMarketDefinitionLabel(trend: TeamMarketTrendRecord) {
  const relation = trend.market_definition;
  const fallbackLabel = getMarketLabelByKey(
    trend.market_key,
    trend.market_key.replaceAll('_', ' ').toLowerCase(),
  );
  if (!relation) return fallbackLabel;
  return Array.isArray(relation) ? relation[0]?.label ?? fallbackLabel : relation.label ?? fallbackLabel;
}

export function getMarketDefinitionDisplayOrder(trend: TeamMarketTrendRecord) {
  const relation = trend.market_definition;
  if (!relation) return Number.MAX_SAFE_INTEGER;
  return Array.isArray(relation)
    ? relation[0]?.display_order ?? Number.MAX_SAFE_INTEGER
    : relation.display_order ?? Number.MAX_SAFE_INTEGER;
}

export function getMarketDefinitionPeriod(trend: TeamMarketTrendRecord) {
  const relation = trend.market_definition;
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0]?.period ?? null : relation.period ?? null;
}

export function getStatisticsCategoryId(trend: TeamMarketTrendRecord): StatisticsCategoryId | null {
  if (trend.category === 'goals') return 'goals';
  if (trend.category === 'btts') return 'btts';
  if (trend.category === 'goals_1h') return 'goals_1h';
  if (trend.category === 'goals_2h') return 'goals_2h';
  if (trend.category === 'corners') return 'corners';
  if (trend.category === 'booking_points') return 'booking_points';
  if (trend.category === 'cards') return 'cards';
  if (trend.category === 'shots') return 'shots';
  if (trend.category === 'fouls') return 'fouls';
  if (trend.category === 'offsides') return 'offsides';

  if (trend.category !== 'half') return null;

  const period = getMarketDefinitionPeriod(trend);
  const marketKey = trend.market_key.toUpperCase();

  if (period === '1H' || marketKey.includes('_1H_')) return 'goals_1h';
  if (period === '2H' || marketKey.includes('_2H_')) return 'goals_2h';

  return null;
}

export function getStatisticsMarketLabel(trend: TeamMarketTrendRecord, language: AppLanguage = 'en') {
  const label = getMarketDefinitionLabel(trend);

  const normalized = label
    .replace(/^Each Team Over 0\.5 /, 'Each Team 1+ ')
    .replace(/^Each Team Over 1\.5 /, 'Each Team 2+ ')
    .replace(/^Each Team Over 2\.5 /, 'Each Team 3+ ')
    .replace(/^Each Team Over 3\.5 /, 'Each Team 4+ ')
    .replace(/^Opponent Over ([0-9.]+) Cards$/, 'Over $1 Team Cards Against')
    .replace(/^Opponent Over ([0-9.]+) Booking Points$/, 'Over $1 Team Booking Points Against')
    .replace(/ 1st Half Goals Total$/, ' 1st Half Goals')
    .replace(/ 2nd Half Goals Total$/, ' 2nd Half Goals');

  return translateUiText(language, normalized);
}

export function buildStatisticsRows(
  homeTrends: TeamMarketTrendRecord[],
  awayTrends: TeamMarketTrendRecord[],
  category: StatisticsCategoryId,
  language: AppLanguage = 'en',
): StatisticsMarketRow[] {
  const rows = new Map<string, StatisticsMarketRow>();

  const addTrend = (trend: TeamMarketTrendRecord, side: 'home' | 'away') => {
    const statisticsCategory = getStatisticsCategoryId(trend);
    if (!statisticsCategory) return;
    if (category !== 'all' && statisticsCategory !== category) return;

    const key = trend.market_key;
    const existing = rows.get(key);
    const nextRow: StatisticsMarketRow = {
      marketKey: key,
      label: getStatisticsMarketLabel(trend, language),
      sortOrder: getMarketDefinitionDisplayOrder(trend),
      category: statisticsCategory,
      home: side === 'home' ? trend : existing?.home ?? null,
      away: side === 'away' ? trend : existing?.away ?? null,
    };

    if (existing) {
      nextRow.home = side === 'home' ? trend : existing.home;
      nextRow.away = side === 'away' ? trend : existing.away;
    }

    rows.set(key, nextRow);
  };

  homeTrends.forEach((trend) => addTrend(trend, 'home'));
  awayTrends.forEach((trend) => addTrend(trend, 'away'));

  return [...rows.values()].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.label.localeCompare(right.label);
  });
}

export function buildTrendList(
  trends: TeamMarketTrendRecord[],
  category: TrendCategoryId,
  language: AppLanguage = 'en',
): TrendListItem[] {
  const filtered = category === 'all' ? trends : trends.filter((trend) => trend.category === category);
  const lines: TrendListItem[] = [];

  filtered
    .slice()
    .sort((left, right) => {
      const leftOrder = getMarketDefinitionDisplayOrder(left);
      const rightOrder = getMarketDefinitionDisplayOrder(right);
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return getMarketDefinitionLabel(left).localeCompare(getMarketDefinitionLabel(right));
    })
    .forEach((trend) => {
      const rawLabel = getMarketDefinitionLabel(trend);
      const label = translateUiText(language, rawLabel);
      const sortOrder = getMarketDefinitionDisplayOrder(trend);
      const last10Hits = trend.last_10_hits ?? 0;
      const last10Sample = trend.last_10_sample ?? 0;

      if (trend.current_streak >= 3) {
        lines.push({
          id: `${trend.market_key}-streak`,
          text: buildTrendStreakSentence({
            rawLabel,
            translatedLabel: label,
            scope: trend.scope,
            streak: trend.current_streak,
            language,
          }),
          category: trend.category,
          marketKey: trend.market_key,
          sortOrder,
          emphasis: 'streak',
          isHot: true,
        });
      }

      if (last10Sample >= 7 && last10Hits >= 7) {
        lines.push({
          id: `${trend.market_key}-frequency`,
          text: buildTrendFrequencySentence({
            rawLabel,
            translatedLabel: label,
            scope: trend.scope,
            hits: last10Hits,
            sample: last10Sample,
            language,
          }),
          category: trend.category,
          marketKey: trend.market_key,
          sortOrder,
          emphasis: 'frequency',
          isHot: trend.current_streak >= 3,
        });
      }
    });

  return lines.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    if (left.emphasis !== right.emphasis) return left.emphasis === 'streak' ? -1 : 1;
    return left.text.localeCompare(right.text);
  });
}
