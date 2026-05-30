'use client';

import type { PlayerPropRankingRow } from '@/lib/server/player-prop-scanner';
import { PercentageMiniBar } from './percentage-mini-bar';

type PlayerPropRowProps = {
  row: PlayerPropRankingRow;
  onEvidenceClick: (row: PlayerPropRankingRow) => void;
};

function nextFixtureLabel(row: PlayerPropRankingRow): string {
  if (!row.nextOpponentName) return '—';
  const venueTag = row.nextVenueScope === 'home' ? 'H' : row.nextVenueScope === 'away' ? 'A' : '';
  const dateStr = row.nextFixtureDate
    ? new Date(row.nextFixtureDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : '';
  return `vs ${row.nextOpponentName}${venueTag ? ` (${venueTag})` : ''}${dateStr ? ` · ${dateStr}` : ''}`;
}

function streakLabel(streak: number): string {
  if (streak > 0) return `+${streak} hit`;
  if (streak < 0) return `${streak} miss`;
  return '—';
}

function streakClass(streak: number): string {
  if (streak >= 3) return 'text-emerald-500 font-semibold';
  if (streak > 0) return 'text-emerald-400';
  if (streak <= -3) return 'text-red-400';
  if (streak < 0) return 'text-[var(--app-text-dim)]';
  return 'text-[var(--app-text-dim)]';
}

export function PlayerPropRow({ row, onEvidenceClick }: PlayerPropRowProps) {
  return (
    <tr className="border-b border-[var(--app-border)] last:border-0 hover:bg-[var(--app-bg)] transition-colors">
      {/* Rank */}
      <td className="px-3 py-2.5 text-xs text-[var(--app-text-dim)] tabular-nums text-right">
        {row.rank}
      </td>

      {/* League */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {row.leagueLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.leagueLogoUrl} alt={row.leagueName} className="h-4 w-4 object-contain" />
          )}
          <span className="text-xs text-[var(--app-text-dim)]">{row.leagueName}</span>
        </div>
      </td>

      {/* Player + team */}
      <td className="px-3 py-2.5">
        <div className="text-sm font-medium text-[var(--app-text)]">
          {row.playerName ?? `Player ${row.playerId}`}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {row.teamLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.teamLogoUrl} alt={row.teamName} className="h-3.5 w-3.5 object-contain" />
          )}
          <span className="text-xs text-[var(--app-text-dim)]">{row.teamName}</span>
        </div>
      </td>

      {/* Sample / Hits */}
      <td className="px-3 py-2.5 text-xs tabular-nums text-center">
        <span className="font-medium">{row.hits}</span>
        <span className="text-[var(--app-text-dim)]">/{row.sample}</span>
      </td>

      {/* Hit % bar */}
      <td className="px-3 py-2.5 min-w-[100px]">
        <PercentageMiniBar percentage={row.percentage} />
      </td>

      {/* Last 5 */}
      <td className="px-3 py-2.5 text-xs tabular-nums text-center">
        {row.last5Sample && row.last5Sample > 0 ? (
          <span>
            <span className="font-medium">{row.last5Hits ?? 0}</span>
            <span className="text-[var(--app-text-dim)]">/{row.last5Sample}</span>
          </span>
        ) : (
          <span className="text-[var(--app-text-dim)]">—</span>
        )}
      </td>

      {/* Last 10 */}
      <td className="px-3 py-2.5 text-xs tabular-nums text-center">
        {row.last10Sample && row.last10Sample > 0 ? (
          <span>
            <span className="font-medium">{row.last10Hits ?? 0}</span>
            <span className="text-[var(--app-text-dim)]">/{row.last10Sample}</span>
          </span>
        ) : (
          <span className="text-[var(--app-text-dim)]">—</span>
        )}
      </td>

      {/* Streak */}
      <td className={`px-3 py-2.5 text-xs tabular-nums text-center ${streakClass(row.currentStreak)}`}>
        {streakLabel(row.currentStreak)}
      </td>

      {/* Next match */}
      <td className="px-3 py-2.5 text-xs text-[var(--app-text-dim)]">
        {nextFixtureLabel(row)}
      </td>

      {/* Evidence action */}
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          className="rounded border border-[var(--app-border)] px-2 py-1 text-xs text-[var(--app-text-dim)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)] transition-colors"
          onClick={() => onEvidenceClick(row)}
        >
          History
        </button>
      </td>
    </tr>
  );
}
