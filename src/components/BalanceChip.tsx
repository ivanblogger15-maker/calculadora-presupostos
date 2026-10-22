import { useI18n } from '../i18n/I18nProvider';
import { formatMoney } from '../lib/money';
import type { Currency } from '../types';

interface BalanceChipProps {
  cents: number;
  currency: Currency;
  className?: string;
}

export function BalanceChip({ cents, currency, className = '' }: BalanceChipProps) {
  const { t, locale } = useI18n();

  if (cents === 0) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ${className}`}
      >
        {t('settled')}
      </span>
    );
  }

  const positive = cents > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      } ${className}`}
    >
      <span className="opacity-80">{positive ? t('owedToYou') : t('youOwe')}</span>
      <span className="tabular">{formatMoney(Math.abs(cents), currency, locale)}</span>
    </span>
  );
}
