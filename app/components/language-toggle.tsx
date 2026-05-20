'use client';

import { useLanguage } from '../language-provider';

const OPTIONS = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
] as const;

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center gap-1 rounded-[18px] border border-[var(--app-border)] bg-[var(--app-panel-muted)] p-1.5">
      {OPTIONS.map((option) => {
        const isActive = option.value === language;

        return (
          <button
            key={option.value}
            aria-label={option.label}
            aria-pressed={isActive}
            className={`flex h-9 min-w-12 items-center justify-center rounded-[14px] border px-3 text-[11px] font-semibold tracking-[0.12em] transition-colors ${
              isActive
                ? 'border-[var(--app-accent)]/20 bg-[var(--app-canvas)] text-[var(--app-accent)]'
                : 'border-transparent text-[var(--app-text-soft)] hover:border-[var(--app-border)] hover:text-[var(--app-text)]'
            }`}
            onClick={() => setLanguage(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
