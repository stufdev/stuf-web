import 'server-only';

import { readFileSync } from 'node:fs';
import path from 'node:path';

const TARGET_LEAGUES_CONFIG_PATH = path.resolve(process.cwd(), '..', 'config', 'target-leagues.json');

let cachedDefaultTargetLeagues: number[] | null = null;

function loadDefaultTargetLeagues() {
  if (cachedDefaultTargetLeagues) {
    return [...cachedDefaultTargetLeagues];
  }

  const rawConfig = readFileSync(TARGET_LEAGUES_CONFIG_PATH, 'utf-8');
  const parsedConfig = JSON.parse(rawConfig) as { default_target_leagues?: unknown };
  const rawLeagues = parsedConfig.default_target_leagues;

  if (!Array.isArray(rawLeagues)) {
    throw new Error(
      `Invalid target league config at ${TARGET_LEAGUES_CONFIG_PATH}. Expected a 'default_target_leagues' array.`,
    );
  }

  const leagues = rawLeagues
    .map((value) => Number(value))
    .filter((value, index, values) => Number.isInteger(value) && value > 0 && values.indexOf(value) === index);

  if (leagues.length === 0) {
    throw new Error(`Target league config at ${TARGET_LEAGUES_CONFIG_PATH} does not contain any valid league ids.`);
  }

  cachedDefaultTargetLeagues = leagues;
  return [...leagues];
}

export function getTargetLeagueIds() {
  const rawValue = process.env.TARGET_LEAGUES;
  if (!rawValue) {
    return loadDefaultTargetLeagues();
  }

  const parsed = rawValue
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  return parsed.length > 0 ? parsed : loadDefaultTargetLeagues();
}
