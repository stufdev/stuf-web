import 'server-only';

export const STREAK_INFORMATIVENESS_CONFIG = {
  minContextTeams: 6,
  highBaseline: 0.95,
  lowBaseline: 0.05,
  stdMin: 0.03,
  stdPercentile: 0.1,
  zCap: 4,
  strongZMin: 1.25,
  watchZMin: 0.6,
  reliableSampleMin: 10,
  maxStreakForNormalization: 20,
  maxSampleForReliability: 30,
  weights: {
    z: 3,
    streak: 1,
    sample: 0.5,
  },
  lowInformationPenalty: 8,
} as const;

export type StreakSignalBand = 'strong' | 'watch' | 'low_info' | 'neutral';

export type StreakInformativenessInput = {
  teamId: number;
  leagueId: number;
  season: number;
  scope: string;
  marketKey: string;
  sample: number;
  hits: number;
};

export type StreakContextMetrics = {
  leagueMarketAvg: number | null;
  leagueMarketStd: number | null;
  contextTeams: number;
  stdLowPercentile: number | null;
};

export type StreakSignalMetrics = StreakContextMetrics & {
  teamHitRate: number | null;
  zScore: number | null;
  signalValue: number;
  isLowInformation: boolean;
  signalBand: StreakSignalBand;
};

function contextKey(row: Pick<StreakInformativenessInput, 'leagueId' | 'season' | 'scope' | 'marketKey'>) {
  return `${row.leagueId}:${row.season}:${row.scope}:${row.marketKey}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hitRate(row: Pick<StreakInformativenessInput, 'hits' | 'sample'>) {
  if (row.sample <= 0) return null;
  return row.hits / row.sample;
}

function percentileCont(values: number[], percentile: number) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];

  const position = (sorted.length - 1) * clamp(percentile, 0, 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const weight = position - lowerIndex;
  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex];

  return lower + (upper - lower) * weight;
}

function populationStd(values: number[], average: number) {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function buildStreakContextMetrics(rows: StreakInformativenessInput[]) {
  const ratesByContext = new Map<string, number[]>();

  for (const row of rows) {
    const rate = hitRate(row);
    if (rate === null) continue;
    const key = contextKey(row);
    const rates = ratesByContext.get(key) ?? [];
    rates.push(rate);
    ratesByContext.set(key, rates);
  }

  const metricsByContext = new Map<string, StreakContextMetrics>();
  const eligibleStdValues: number[] = [];

  for (const [key, rates] of ratesByContext.entries()) {
    const average = rates.reduce((sum, value) => sum + value, 0) / rates.length;
    const std = populationStd(rates, average);
    const metrics: StreakContextMetrics = {
      leagueMarketAvg: average,
      leagueMarketStd: std,
      contextTeams: rates.length,
      stdLowPercentile: null,
    };
    metricsByContext.set(key, metrics);

    if (rates.length >= STREAK_INFORMATIVENESS_CONFIG.minContextTeams) {
      eligibleStdValues.push(std);
    }
  }

  const stdLowPercentile = percentileCont(
    eligibleStdValues,
    STREAK_INFORMATIVENESS_CONFIG.stdPercentile,
  );

  for (const metrics of metricsByContext.values()) {
    metrics.stdLowPercentile = stdLowPercentile;
  }

  return metricsByContext;
}

export function deriveStreakSignalMetrics(
  row: StreakInformativenessInput,
  contextMetrics: StreakContextMetrics | undefined,
  streakLength: number,
  options: { applyLowInformationPenalty: boolean },
): StreakSignalMetrics {
  const teamHitRate = hitRate(row);
  const fallbackContext: StreakContextMetrics = {
    leagueMarketAvg: null,
    leagueMarketStd: null,
    contextTeams: 0,
    stdLowPercentile: null,
  };
  const context = contextMetrics ?? fallbackContext;
  const leagueMarketAvg = context.leagueMarketAvg;
  const leagueMarketStd = context.leagueMarketStd;
  const hasStableContext = (
    context.contextTeams >= STREAK_INFORMATIVENESS_CONFIG.minContextTeams &&
    leagueMarketAvg !== null &&
    leagueMarketStd !== null &&
    teamHitRate !== null
  );
  const canComputeZ = hasStableContext && leagueMarketStd !== null && leagueMarketStd > 0;
  const zScore = canComputeZ
    ? (teamHitRate - leagueMarketAvg!) / leagueMarketStd!
    : null;
  const isExtremeBaseline = hasStableContext && (
    leagueMarketAvg! >= STREAK_INFORMATIVENESS_CONFIG.highBaseline ||
    leagueMarketAvg! <= STREAK_INFORMATIVENESS_CONFIG.lowBaseline
  );
  const isLowDispersion = hasStableContext && context.stdLowPercentile !== null && (
    leagueMarketStd! < STREAK_INFORMATIVENESS_CONFIG.stdMin &&
    leagueMarketStd! <= context.stdLowPercentile
  );
  const isLowInformation = hasStableContext && (isExtremeBaseline || isLowDispersion || leagueMarketStd === 0);
  const positiveZ = clamp(zScore ?? 0, 0, STREAK_INFORMATIVENESS_CONFIG.zCap);
  const normalizedStreak = clamp(
    streakLength / STREAK_INFORMATIVENESS_CONFIG.maxStreakForNormalization,
    0,
    1,
  );
  const sampleReliability = clamp(
    row.sample / STREAK_INFORMATIVENESS_CONFIG.maxSampleForReliability,
    0,
    1,
  );
  const lowInformationPenalty = isLowInformation && options.applyLowInformationPenalty
    ? STREAK_INFORMATIVENESS_CONFIG.lowInformationPenalty
    : 0;
  const signalValue = (
    STREAK_INFORMATIVENESS_CONFIG.weights.z * positiveZ +
    STREAK_INFORMATIVENESS_CONFIG.weights.streak * normalizedStreak +
    STREAK_INFORMATIVENESS_CONFIG.weights.sample * sampleReliability -
    lowInformationPenalty
  );

  let signalBand: StreakSignalBand = 'neutral';
  if (isLowInformation) {
    signalBand = 'low_info';
  } else if ((zScore ?? 0) >= STREAK_INFORMATIVENESS_CONFIG.strongZMin && row.sample >= STREAK_INFORMATIVENESS_CONFIG.reliableSampleMin) {
    signalBand = 'strong';
  } else if ((zScore ?? 0) >= STREAK_INFORMATIVENESS_CONFIG.watchZMin || row.sample < STREAK_INFORMATIVENESS_CONFIG.reliableSampleMin) {
    signalBand = 'watch';
  }

  return {
    teamHitRate,
    leagueMarketAvg: context.leagueMarketAvg,
    leagueMarketStd: context.leagueMarketStd,
    contextTeams: context.contextTeams,
    stdLowPercentile: context.stdLowPercentile,
    zScore,
    signalValue,
    isLowInformation,
    signalBand,
  };
}

export function streakContextKey(row: Pick<StreakInformativenessInput, 'leagueId' | 'season' | 'scope' | 'marketKey'>) {
  return contextKey(row);
}
