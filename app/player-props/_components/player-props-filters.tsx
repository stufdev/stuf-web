'use client';

import type {
  PlayerPropFilterOptions,
  PlayerPropFilters,
  PropCategory,
} from '@/lib/server/player-prop-scanner';

// Defined inline (not imported from server scanner) to avoid bundling server-only modules.
const PROP_CATEGORIES: PropCategory[] = ['attacking', 'shots', 'cards', 'fouls', 'tackles', 'fouled'];

type PlayerPropsFiltersProps = {
  filters: PlayerPropFilters;
  options: PlayerPropFilterOptions;
  isUpdating: boolean;
  onFiltersChange: (nextValues: Partial<PlayerPropFilters>) => void;
};

const CATEGORY_LABELS: Record<PropCategory, string> = {
  attacking: 'Attacking',
  shots: 'Shots',
  cards: 'Cards',
  fouls: 'Fouls',
  tackles: 'Tackles',
  fouled: 'Fouled',
};

const SCOPE_OPTIONS = [
  { value: 'overall' as const, label: 'All' },
  { value: 'home' as const, label: 'Home' },
  { value: 'away' as const, label: 'Away' },
];

function activePropCategory(options: PlayerPropFilterOptions, propKey: string): PropCategory | null {
  for (const [category, props] of Object.entries(options.propsByCategory)) {
    if (props.some((p) => p.key === propKey)) return category as PropCategory;
  }
  return null;
}

export function PlayerPropsFilters({
  filters,
  options,
  isUpdating,
  onFiltersChange,
}: PlayerPropsFiltersProps) {
  const activeCategory = activePropCategory(options, filters.propKey);
  const propsForCategory = activeCategory ? (options.propsByCategory[activeCategory] ?? []) : [];

  return (
    <section className={`border-b border-[var(--app-border)] px-4 py-3 transition-opacity duration-150 ${isUpdating ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap gap-4">

        {/* League + season */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--app-text-dim)]">League</label>
          <select
            className="rounded border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-1.5 text-xs text-[var(--app-text)]"
            value={`${filters.leagueId}:${filters.season}`}
            onChange={(e) => {
              const [leagueId, season] = e.target.value.split(':').map(Number);
              onFiltersChange({ leagueId, season });
            }}
          >
            {options.leagueSeasons.map((ls) => (
              <option key={`${ls.leagueId}:${ls.season}`} value={`${ls.leagueId}:${ls.season}`}>
                {ls.leagueName} {ls.season}
              </option>
            ))}
          </select>
        </div>

        {/* Category tabs */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--app-text-dim)]">Category</label>
          <div className="flex gap-1">
            {PROP_CATEGORIES.map((cat) => {
              const isActive = cat === activeCategory;
              const hasProps = (options.propsByCategory[cat] ?? []).length > 0;
              if (!hasProps) return null;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`rounded border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white'
                      : 'border-[var(--app-border)] text-[var(--app-text-dim)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]'
                  }`}
                  onClick={() => {
                    const firstProp = options.propsByCategory[cat]?.[0];
                    if (firstProp) onFiltersChange({ propKey: firstProp.key });
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prop selector */}
        {propsForCategory.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--app-text-dim)]">Prop</label>
            <select
              className="rounded border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-1.5 text-xs text-[var(--app-text)]"
              value={filters.propKey}
              onChange={(e) => onFiltersChange({ propKey: e.target.value })}
            >
              {propsForCategory.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scope */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--app-text-dim)]">Scope</label>
          <div className="flex gap-1">
            {SCOPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`rounded border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  filters.scope === opt.value
                    ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white'
                    : 'border-[var(--app-border)] text-[var(--app-text-dim)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]'
                }`}
                onClick={() => onFiltersChange({ scope: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Min % */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--app-text-dim)]">Min %</label>
          <select
            className="rounded border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-1.5 text-xs text-[var(--app-text)]"
            value={String(filters.minPercentage)}
            onChange={(e) => onFiltersChange({ minPercentage: Number(e.target.value) })}
          >
            <option value="0">Any</option>
            <option value="40">40%+</option>
            <option value="50">50%+</option>
            <option value="60">60%+</option>
            <option value="70">70%+</option>
            <option value="80">80%+</option>
          </select>
        </div>

        {/* Min sample — raise-only main-ranking floor (P0 product standard) */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--app-text-dim)]">Min sample</label>
          <select
            className="rounded border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-1.5 text-xs text-[var(--app-text)]"
            value={filters.minMatches >= 20 ? 20 : filters.minMatches >= 15 ? 15 : 10}
            onChange={(e) => onFiltersChange({ minMatches: Number(e.target.value) })}
          >
            <option value={10}>≥ 10 (floor)</option>
            <option value={15}>≥ 15</option>
            <option value={20}>≥ 20</option>
          </select>
        </div>

        {/* Upcoming / All season */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--app-text-dim)]">Fixtures</label>
          <div className="flex gap-1">
            {([{ value: true, label: 'Upcoming' }, { value: false, label: 'All season' }] as const).map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                className={`rounded border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  filters.upcomingOnly === opt.value
                    ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white'
                    : 'border-[var(--app-border)] text-[var(--app-text-dim)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]'
                }`}
                onClick={() => onFiltersChange({ upcomingOnly: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Player search */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--app-text-dim)]">Player / Team</label>
          <input
            type="search"
            placeholder="Search…"
            className="rounded border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-1.5 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] w-32"
            value={filters.playerSearch}
            onChange={(e) => onFiltersChange({ playerSearch: e.target.value })}
          />
        </div>

      </div>
    </section>
  );
}
