import type { CardMatchRow } from '@/lib/server/card-market-scanner';

type CardMatchTableProps = {
  isLoading?: boolean;
  rows: CardMatchRow[];
  teamId: number;
  title: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function formatCards(row: CardMatchRow) {
  if (row.cardScoreLabel) {
    return row.cardScoreLabel;
  }

  const { homeCards, awayCards } = row;
  if (homeCards === null || awayCards === null) {
    return '-';
  }

  return `${homeCards} - ${awayCards}`;
}

function TeamName({ isTarget, name }: { isTarget: boolean; name: string }) {
  return (
    <span className={isTarget ? 'font-bold text-[var(--app-text)]' : 'text-[var(--app-text-soft)]'}>
      {name}
    </span>
  );
}

export function CardMatchTable({ isLoading = false, rows, teamId, title }: CardMatchTableProps) {
  if (isLoading) {
    return (
      <div className="rounded border border-dashed border-[var(--app-border)] p-4 text-sm text-[var(--app-text-dim)]">
        Loading {title.toLowerCase()} evidence...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded border border-dashed border-[var(--app-border)] p-4 text-sm text-[var(--app-text-dim)]">
        No match evidence for {title}.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-[var(--app-border)]">
      <table className="min-w-[720px] text-sm">
        <thead className="bg-[var(--app-panel-muted)] text-xs uppercase text-[var(--app-text-dim)]">
          <tr>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Home Team</th>
            <th className="px-3 py-2 text-left">Cards</th>
            <th className="px-3 py-2 text-left">Away Team</th>
            <th className="px-3 py-2 text-left">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--app-border)]">
          {rows.map((row) => (
            <tr className={row.result ? 'bg-emerald-500/10' : 'bg-red-500/10'} key={`${title}:${row.fixtureId}`}>
              <td className="px-3 py-2 text-[var(--app-text-soft)]">{formatDate(row.date)}</td>
              <td className="px-3 py-2">
                <TeamName isTarget={row.homeTeamId === teamId} name={row.homeTeamName} />
              </td>
              <td className="px-3 py-2 font-semibold text-[var(--app-text)]">{formatCards(row)}</td>
              <td className="px-3 py-2">
                <TeamName isTarget={row.awayTeamId === teamId} name={row.awayTeamName} />
              </td>
              <td className="px-3 py-2">
                <span
                  className={[
                    'inline-flex rounded px-2 py-1 text-xs font-bold',
                    row.result
                      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                      : 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
                  ].join(' ')}
                >
                  {row.result ? 'Hit' : 'Miss'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
