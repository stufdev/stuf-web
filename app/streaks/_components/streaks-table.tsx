'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { StreakScannerRow } from '@/lib/server/streak-scanner';

type StreaksTableProps = {
  rows: StreakScannerRow[];
};

type ActionableStreakRow = StreakScannerRow & {
  nextFixture: NonNullable<StreakScannerRow['nextFixture']>;
};

function formatNextFixtureDate(value: string) {
  const date = new Date(value);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${weekdays[date.getDay()]} ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${hours}:${minutes}`;
}

function hasNextFixture(row: StreakScannerRow): row is ActionableStreakRow {
  return row.nextFixture !== null;
}

function Logo({ alt, src }: { alt: string; src: string | null }) {
  if (!src) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] text-xs font-bold text-[var(--app-text-dim)]">
        {alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className="h-9 w-9 shrink-0 rounded object-contain"
      height={36}
      loading="lazy"
      src={src}
      width={36}
    />
  );
}

export function StreaksTable({ rows }: StreaksTableProps) {
  const actionableRows = rows.filter(hasNextFixture);

  if (actionableRows.length === 0) {
    return (
      <section className="px-4 py-12">
        <div className="border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel)] px-4 py-10 text-center">
          <div className="text-sm font-semibold text-[var(--app-text)]">No streaks match these filters.</div>
          <div className="mt-1 text-xs text-[var(--app-text-dim)]">Try a lower minimum streak or a broader market.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-4">
      <div className="overflow-x-auto border border-[var(--app-border)] bg-[var(--app-panel)]">
        <div className="grid min-w-[1240px] grid-cols-[minmax(240px,1.2fr)_minmax(220px,1fr)_minmax(210px,1fr)_150px_110px_150px_140px] border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2 text-xs font-semibold uppercase text-[var(--app-text-dim)]">
          <div>Team</div>
          <div>Stat/Market</div>
          <div>Next match</div>
          <div>Streak</div>
          <div>Odds</div>
          <div>Date</div>
          <div>Action</div>
        </div>

        <div className="min-w-[1240px] divide-y divide-[var(--app-border)]">
          {actionableRows.map((row) => (
            <div
              className="grid grid-cols-[minmax(240px,1.2fr)_minmax(220px,1fr)_minmax(210px,1fr)_150px_110px_150px_140px] items-center gap-0 px-3 py-3 text-sm"
              key={`${row.teamId}:${row.leagueId}:${row.season}:${row.scope}:${row.marketKey}`}
            >
              <div className="flex min-w-0 items-center gap-3 pr-4">
                <Logo alt={row.teamName} src={row.teamLogoUrl} />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[var(--app-text)]">{row.teamName}</div>
                </div>
              </div>

              <div className="truncate pr-4 font-medium text-[var(--app-text-soft)]">{row.marketLabel}</div>

              <div className="truncate pr-4 text-sm font-semibold text-[var(--app-text)]">
                {row.nextFixture.isHome ? 'Home vs' : 'Away vs'} {row.nextFixture.opponentName}
              </div>

              <div>
                <span className="inline-flex items-center rounded bg-[var(--app-danger-soft)] px-3 py-1 text-sm font-bold text-[var(--app-danger-text)] ring-1 ring-[var(--app-danger-border)]">
                  🔥 {row.currentStreak} Matches
                </span>
              </div>

              <div>
                <span className="inline-flex h-8 items-center rounded border border-[var(--app-border)] px-2 text-xs font-semibold text-[var(--app-text-dim)]">
                  Odds TBD
                </span>
              </div>

              <div className="text-sm font-medium text-[var(--app-text-soft)]">
                {formatNextFixtureDate(row.nextFixture.date)}
              </div>

              <div>
                <Link
                  className="inline-flex h-8 items-center justify-center rounded border border-[var(--app-accent)] bg-[var(--app-accent-soft)] px-3 text-xs font-semibold text-[var(--app-accent)] hover:bg-[var(--app-accent)] hover:text-white"
                  href={
                    '/comparison?fixtureId=' +
                    row.nextFixture.fixtureId +
                    '&marketKey=' +
                    row.marketKey +
                    '&source=streaks'
                  }
                >
                  Analyze Match
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
