import 'server-only';

// ──────────────────────────────────────────────────────────────────────────────
// P0 sample-confidence bands — single source of truth.
// See docs/ai/STUF_P0_SCOPE.md §6 and docs/ai/STUF_DECISION_LOG.md.
//
//   sample < 5   → hard-removed from rankings (noise; still reachable via evidence)
//   sample 5–9   → "Emerging / low sample" section only, never the main ranking
//   sample ≥ 10  → main ranking (the P0 main-ranking floor)
//   sample ≥ 15  → eligible for a higher-confidence marker
//
// The main-ranking floor is a product standard. A user control may only RAISE it
// (10 / 15 / 20), never lower it. It must never re-introduce the 5–9 or <5 bands
// into the main ranking.
// ──────────────────────────────────────────────────────────────────────────────

export const EMERGING_MIN_SAMPLE = 5;
export const MAIN_RANKING_MIN_SAMPLE = 10;
export const HIGH_CONFIDENCE_MIN_SAMPLE = 15;

/** Allowed raise-only main-ranking floor values for market screens. */
export const MAIN_FLOOR_OPTIONS = [10, 15, 20] as const;
export type MainFloorOption = (typeof MAIN_FLOOR_OPTIONS)[number];

/**
 * Clamp a requested floor to the allowed raise-only set. Anything below 10 (or
 * missing/invalid) becomes 10 — the user can never drop below the P0 floor.
 */
export function parseMainRankingFloor(raw: number | null | undefined): MainFloorOption {
  if (raw != null && raw >= 20) return 20;
  if (raw != null && raw >= 15) return 15;
  return 10;
}

/** True when a sample sits in the Emerging band (5–9), below the fixed main floor. */
export function isEmergingSample(sample: number): boolean {
  return sample >= EMERGING_MIN_SAMPLE && sample < MAIN_RANKING_MIN_SAMPLE;
}
