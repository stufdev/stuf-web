import type { OffsideQuickColumn as OffsideQuickColumnData } from '@/lib/server/offside-market-scanner';
import { OffsidesQuickRow } from './offsides-quick-row';

type OffsidesQuickColumnProps = {
  column: OffsideQuickColumnData;
};

export function OffsidesQuickColumn({ column }: OffsidesQuickColumnProps) {
  return (
    <section className="min-w-0 overflow-hidden rounded border border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--app-text)]">{column.title}</h2>
          <span className="rounded border border-[var(--app-border)] px-2 py-1 text-xs font-semibold text-[var(--app-text-dim)]">
            {column.rows.length}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_88px_minmax(120px,0.9fr)] gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">
          <span>Team</span>
          <span className="text-right">#</span>
          <span>Percent</span>
        </div>
      </div>

      {column.rows.length === 0 ? (
        <div className="px-3 py-10 text-center text-sm text-[var(--app-text-dim)]">No teams match this scope.</div>
      ) : (
        <div>
          {column.rows.map((row) => (
            <OffsidesQuickRow key={`${row.scope}:${row.teamId}:${row.marketKey}`} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}
