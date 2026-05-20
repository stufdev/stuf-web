'use client';

import Image from 'next/image';
import { calculateMatchValue, evaluateHit, getCenterColumnLabel, getMatchDisplayValue } from '../helpers';
import type { HistoricalMatch, LeagueOpponentResult, LeagueRecord, LeagueStandingEntry } from '../types';

type LeagueTablePanelProps = {
  highlight: 'left' | 'right';
  teamSide: 'HOME' | 'AWAY';
  teamId: number | null;
  teamName: string;
  teamLogoUrl: string | null;
  counterpartTeamId: number | null;
  standings: LeagueStandingEntry[];
  opponentResults: Record<number, LeagueOpponentResult>;
  marketKey: string;
  isLoading?: boolean;
  emptyMessage?: string;
};

function getToneClass(tone: 'left' | 'right') {
  return tone === 'left'
    ? 'bg-[#141414] text-[#ededed]'
    : 'bg-[#141414] text-[#ededed]';
}

function OutcomeBadge({ value }: { value: 'W' | 'D' | 'L' }) {
  const tone =
    value === 'W'
      ? 'bg-[#34d399] text-white'
      : value === 'D'
        ? 'bg-[#141414] text-[#ededed]'
        : 'bg-[#fb7185] text-white';

  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-[2px] text-[12px] font-semibold ${tone}`}
    >
      {value}
    </span>
  );
}

function RecordRow({
  label,
  record,
}: {
  label: string;
  record: LeagueRecord;
}) {
  return (
    <tr className="border-b border-[#2a2a2a] last:border-b-0">
      <td className="px-2 py-1 text-[12px] font-semibold text-[#ededed]">{label}</td>
      <td className="px-2 py-1 text-center font-mono text-[12px] text-[#ededed]">{record.position}</td>
      <td className="px-2 py-1 text-center font-mono text-[12px] text-[#ededed]">{record.played}</td>
      <td className="px-2 py-1 text-center font-mono text-[12px] text-[#34d399]">{record.wins}</td>
      <td className="px-2 py-1 text-center font-mono text-[12px] text-[#a1a1a1]">{record.draws}</td>
      <td className="px-2 py-1 text-center font-mono text-[12px] text-[#fb7185]">{record.losses}</td>
      <td className="px-2 py-1 text-center font-mono text-[12px] text-[#ededed]">{record.goalsFor}</td>
      <td className="px-2 py-1 text-center font-mono text-[12px] text-[#ededed]">{record.goalsAgainst}</td>
      <td className="px-2 py-1 text-center font-mono text-[12px] text-[#ededed]">
        {record.goalDiff > 0 ? `+${record.goalDiff}` : record.goalDiff}
      </td>
      <td className="px-2 py-1 text-center font-mono text-[12px] font-semibold text-[#ededed]">{record.points}</td>
      <td className="px-2 py-1">
        <div className="flex flex-wrap justify-end gap-0.5">
          {record.form.map((item, index) => (
            <OutcomeBadge key={`${label}-${index}-${item}`} value={item} />
          ))}
        </div>
      </td>
    </tr>
  );
}

function ResultCell({
  match,
  marketKey,
}: {
  match: HistoricalMatch | null;
  marketKey: string;
}) {
  if (!match) {
    return <td className="px-2 py-1 text-center text-[12px] text-[#a1a1a1]">-</td>;
  }

  const isHit = evaluateHit(calculateMatchValue(match, marketKey), marketKey);
  const cellTone = isHit ? 'bg-[rgba(34,197,94,0.06)]' : 'bg-[rgba(239,68,68,0.06)]';
  const textTone = isHit ? 'text-[#34d399]' : 'text-[#fb7185]';

  return (
    <td className={`px-2 py-1 text-center ${cellTone}`}>
      <span className={`font-mono text-[12px] font-semibold ${textTone}`}>{getMatchDisplayValue(match, marketKey)}</span>
    </td>
  );
}

export function LeagueTablePanel({
  highlight,
  teamSide,
  teamId,
  teamName,
  teamLogoUrl,
  counterpartTeamId,
  standings,
  opponentResults,
  marketKey,
  isLoading = false,
  emptyMessage = 'No league data available.',
}: LeagueTablePanelProps) {
  const accentTone = getToneClass(highlight);
  const oppositeTone = getToneClass(highlight === 'left' ? 'right' : 'left');
  const selectedEntry = standings.find((entry) => entry.teamId === teamId) ?? null;
  const sideRecord = teamSide === 'HOME' ? selectedEntry?.home : selectedEntry?.away;
  const resultLabel = getCenterColumnLabel(marketKey);

  return (
    <section className="overflow-hidden rounded-[2px] border border-[#2a2a2a] bg-[#050505]">
      <div className={`flex items-center gap-2 border-b border-[#2a2a2a] px-3 py-2 ${accentTone}`}>
        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-[#2a2a2a] bg-[#050505]">
          {teamLogoUrl ? (
            <Image alt={`${teamName} logo`} className="h-4 w-4 object-contain" height={16} src={teamLogoUrl} width={16} />
          ) : (
            <span className="text-[12px] font-semibold uppercase text-[#a1a1a1]">{teamName.slice(0, 2)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{teamName} League View</p>
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] opacity-70">{teamSide}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-20 items-center justify-center text-[12px] text-[#a1a1a1]">Loading league table...</div>
      ) : !selectedEntry || standings.length === 0 ? (
        <div className="flex h-20 items-center justify-center text-[12px] text-[#a1a1a1]">{emptyMessage}</div>
      ) : (
        <div className="flex flex-col gap-2 p-2">
          <div className="overflow-x-auto border border-[#2a2a2a]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#2a2a2a] bg-[#141414]">
                  <th className="px-2 py-1 text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">Record</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">#</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">P</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">W</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">D</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">L</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">GF</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">GA</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">GD</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">Pts</th>
                  <th className="px-2 py-1 text-right text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">Form</th>
                </tr>
              </thead>
              <tbody>
                <RecordRow label="Overall" record={selectedEntry.overall} />
                {sideRecord ? <RecordRow label={teamSide === 'HOME' ? 'Home' : 'Away'} record={sideRecord} /> : null}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto border border-[#2a2a2a]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#2a2a2a] bg-[#141414]">
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">#</th>
                  <th className="px-2 py-1 text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">Team</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">P</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">GD</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">Pts</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">
                    Home {resultLabel}
                  </th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[#a1a1a1]">
                    Away {resultLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.map((entry) => {
                  const opponentTone =
                    entry.teamId === teamId
                      ? accentTone
                      : entry.teamId === counterpartTeamId
                        ? oppositeTone
                        : '';
                  const rowClass = opponentTone ? `${opponentTone} font-semibold` : 'bg-[#050505]';
                  const matchup = opponentResults[entry.teamId] ?? { homeMatch: null, awayMatch: null };

                  return (
                    <tr className={`border-b border-[#2a2a2a] last:border-b-0 ${rowClass}`} key={entry.teamId}>
                      <td className="px-2 py-1 text-center font-mono text-[12px] text-[#ededed]">{entry.overall.position}</td>
                      <td className="px-2 py-1 text-[12px] text-[#ededed]">{entry.teamName}</td>
                      <td className="px-2 py-1 text-center font-mono text-[12px] text-[#ededed]">{entry.overall.played}</td>
                      <td className="px-2 py-1 text-center font-mono text-[12px] text-[#ededed]">
                        {entry.overall.goalDiff > 0 ? `+${entry.overall.goalDiff}` : entry.overall.goalDiff}
                      </td>
                      <td className="px-2 py-1 text-center font-mono text-[12px] font-semibold text-[#ededed]">{entry.overall.points}</td>
                      <ResultCell marketKey={marketKey} match={matchup.homeMatch} />
                      <ResultCell marketKey={marketKey} match={matchup.awayMatch} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
