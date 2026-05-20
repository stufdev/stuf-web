'use client';

import type { ReactNode } from 'react';
import { useLanguage } from '../../language-provider';

type ThemeMode = 'system' | 'light' | 'dark';

type ThemeToggleProps = {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
};

function SunIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.75V5.25M12 18.75V21.25M21.25 12H18.75M5.25 12H2.75M18.54 5.46L16.77 7.23M7.23 16.77L5.46 18.54M18.54 18.54L16.77 16.77M7.23 7.23L5.46 5.46"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <rect x="3.5" y="4.5" width="17" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 19.5H15M12 16.5V19.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M16.7 15.4A7 7 0 0 1 10 4.8A8.5 8.5 0 1 0 19.2 14A6.4 6.4 0 0 1 16.7 15.4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M18.75 4.75V7.25M20 6H17.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

const OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  icon: ReactNode;
}> = [
  { value: 'light', label: 'Light mode', icon: <SunIcon /> },
  { value: 'system', label: 'Follow system', icon: <MonitorIcon /> },
  { value: 'dark', label: 'Dark mode', icon: <MoonIcon /> },
];

export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  const { t } = useLanguage();

  return (
    <div className="inline-flex items-center gap-1 rounded-[18px] border border-[var(--app-border)] bg-[var(--app-panel-muted)] p-1.5">
      {OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            aria-label={t(option.label)}
            aria-pressed={isActive}
            className={`flex h-9 w-9 items-center justify-center rounded-[14px] border transition-colors ${
              isActive
                  ? 'border-[var(--app-accent)]/20 bg-[var(--app-canvas)] text-[var(--app-accent)]'
                  : 'border-transparent text-[var(--app-text-soft)] hover:border-[var(--app-border)] hover:text-[var(--app-text)]'
               }`}
              onClick={() => onChange(option.value)}
              type="button"
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
