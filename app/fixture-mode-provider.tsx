'use client';

import { createContext, useContext, useMemo, useState } from 'react';

export type FixtureMode = 'upcoming' | 'recent';

const FIXTURE_MODE_STORAGE_KEY = 'stuf_fixture_mode';

type FixtureModeContextValue = {
  fixtureMode: FixtureMode;
  setFixtureMode: (value: FixtureMode) => void;
};

const FixtureModeContext = createContext<FixtureModeContextValue | null>(null);

function isFixtureMode(value: unknown): value is FixtureMode {
  return value === 'upcoming' || value === 'recent';
}

export function FixtureModeProvider({ children }: { children: React.ReactNode }) {
  const [fixtureMode, setFixtureModeState] = useState<FixtureMode>(() => {
    if (typeof window === 'undefined') return 'upcoming';
    const stored = window.localStorage.getItem(FIXTURE_MODE_STORAGE_KEY);
    return isFixtureMode(stored) ? stored : 'upcoming';
  });

  const setFixtureMode = (value: FixtureMode) => {
    window.localStorage.setItem(FIXTURE_MODE_STORAGE_KEY, value);
    setFixtureModeState(value);
  };

  const value = useMemo(() => ({ fixtureMode, setFixtureMode }), [fixtureMode]);

  return (
    <FixtureModeContext.Provider value={value}>
      {children}
    </FixtureModeContext.Provider>
  );
}

export function useFixtureMode() {
  const value = useContext(FixtureModeContext);
  if (!value) {
    throw new Error('useFixtureMode must be used within FixtureModeProvider');
  }
  return value;
}
