import 'server-only';

import { NextResponse } from 'next/server';

export function clampInt(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

export function parsePositiveInt(
  value: string | null,
  fallback: number,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return clampInt(parsed, minimum, maximum);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

