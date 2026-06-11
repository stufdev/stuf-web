'use client';

import { useFixtureMode } from '../fixture-mode-provider';
import { useLanguage } from '../language-provider';

export function FixtureModeToggle() {
  const { fixtureMode, setFixtureMode } = useFixtureMode();
  const { t } = useLanguage();

  const base =
    'h-7 min-w-[88px] px-3 text-[12px] font-semibold uppercase tracking-[0.1em] transition-colors';

  return (
    <div
      className="flex overflow-hidden rounded-[2px] border border-[#2a2a2a] bg-[#050505]"
      title={t('Switch between upcoming fixtures and recently-played results')}
    >
      <button
        className={`${base} ${
          fixtureMode === 'upcoming'
            ? 'bg-[#141414] text-[#ededed]'
            : 'bg-transparent text-[#606060] hover:bg-[#0d0d0d] hover:text-[#a1a1a1]'
        }`}
        onClick={() => setFixtureMode('upcoming')}
        type="button"
      >
        {t('Upcoming')}
      </button>
      <button
        className={`${base} ${
          fixtureMode === 'recent'
            ? 'bg-[#141414] text-[#ededed]'
            : 'bg-transparent text-[#606060] hover:bg-[#0d0d0d] hover:text-[#a1a1a1]'
        }`}
        onClick={() => setFixtureMode('recent')}
        type="button"
      >
        {t('Recent')}
      </button>
    </div>
  );
}
