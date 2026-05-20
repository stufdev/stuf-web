import { useLanguage } from '../../language-provider';
import type { ComparisonScope } from '../types';

type ScopeToggleProps = {
  value: ComparisonScope;
  onChange: (value: ComparisonScope) => void;
};

export function ScopeToggle({ value, onChange }: ScopeToggleProps) {
  const { t } = useLanguage();
  const base =
    'h-7 min-w-[120px] rounded-[2px] border px-3 text-[14px] font-semibold uppercase tracking-[0.1em] transition-colors';

  return (
    <div className="flex overflow-hidden rounded-[2px] border border-[#2a2a2a] bg-[#050505]">
      <button
        className={`${base} ${value === 'all'
          ? 'border-[#505050] bg-[#141414] text-[#ededed]'
          : 'border-transparent bg-transparent text-[#a1a1a1] hover:bg-[#141414] hover:text-[#ededed]'
          }`}
        onClick={() => onChange('all')}
        type="button"
      >
        {t('All matches')}
      </button>
      <button
        className={`${base} ${value === 'split'
          ? 'border-[#505050] bg-[#141414] text-[#ededed]'
          : 'border-transparent bg-transparent text-[#a1a1a1] hover:bg-[#141414] hover:text-[#ededed]'
          }`}
        onClick={() => onChange('split')}
        type="button"
      >
        {t('Home / Away')}
      </button>
    </div>
  );
}
