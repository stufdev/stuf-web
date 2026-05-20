'use client';

import type { ReactNode } from 'react';

type SelectFieldProps = {
  label?: string;
  placeholder?: string;
  value: string | number;
  disabled?: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
};

export function SelectField({ label, placeholder, value, disabled, onChange, children }: SelectFieldProps) {
  const resolvedPlaceholder = placeholder ?? label ?? 'Select';

  return (
    <div className="relative flex min-w-0">
      <select
        aria-label={label ?? resolvedPlaceholder}
        className={`
          h-10 w-full min-w-0
          rounded-[8px] border border-[var(--app-input-border)]
          bg-[var(--app-input-bg)] px-3.5 pr-10
          text-[13px] font-medium text-[var(--app-text)]
          outline-none transition-colors
          hover:border-[var(--app-border-strong)]
          focus-visible:border-[var(--app-border-strong)]
          disabled:cursor-not-allowed disabled:opacity-40
        `}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={String(value)}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--app-text-dim)]"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M6 9L12 15L18 9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}
