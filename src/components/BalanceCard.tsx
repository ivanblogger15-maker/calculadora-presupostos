import { useI18n } from '../i18n/I18nProvider';
import { formatMoney } from '../lib/money';
import type { Group } from '../types';
import { Avatar } from './Avatar';
import { CheckCircleIcon, UsersIcon } from './Icons';

interface BalanceCardProps {
  group: Group;
  /** null when the user hasn't picked who they are yet. */
  balanceCents: number | null;
  totalSpentCents: number;
  myShareCents: number;
  myPaidCents: number;
  onSelectMember: (memberId: string) => void;
  onChangePerson: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-teal-100/70">
        {label}
      </p>
      <p className="tabular mt-0.5 truncate text-[11px] font-semibold text-white">{value}</p>
    </div>
  );
}

export function BalanceCard({
  group,
  balanceCents,
  totalSpentCents,
  myShareCents,
  myPaidCents,
  onSelectMember,
  onChangePerson,
}: BalanceCardProps) {
  const { t, locale } = useI18n();

  if (balanceCents === null) {
    return (
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
            <UsersIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">{t('whoAreYou')}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {t('whoAreYouHint')}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {group.members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelectMember(member.id)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            >
              <Avatar name={member.name} size="xs" />
              {member.name}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const positive = balanceCents > 0;
  const negative = balanceCents < 0;
  const amount = formatMoney(Math.abs(balanceCents), group.currency, locale);

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-950 p-5 text-white shadow-xl shadow-teal-950/20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-emerald-300/10 blur-2xl"
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-teal-100/90">{t('balanceTitle')}</p>
          <button
            type="button"
            onClick={onChangePerson}
            className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-teal-50 ring-1 ring-white/15 transition hover:bg-white/20"
          >
            {t('changePerson')}
          </button>
        </div>

        <div className="mt-3">
          <p
            className={`text-[11px] font-semibold uppercase tracking-wide ${
              positive ? 'text-emerald-300' : negative ? 'text-rose-300' : 'text-teal-200'
            }`}
          >
            {positive ? t('owedToYou') : negative ? t('youOwe') : t('settled')}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <p className="tabular text-[40px] font-extrabold leading-none tracking-tight sm:text-5xl">
              {positive ? '+' : negative ? '−' : ''}
              {amount}
            </p>
            {!positive && !negative && (
              <CheckCircleIcon className="h-6 w-6 shrink-0 text-emerald-300" />
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-teal-100/70">
            {t('inThisGroup')} · {group.name}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/10 px-1 py-3 ring-1 ring-white/10 backdrop-blur-sm">
          <Stat label={t('totalSpentLabel')} value={formatMoney(totalSpentCents, group.currency, locale)} />
          <Stat label={t('yourShareLabel')} value={formatMoney(myShareCents, group.currency, locale)} />
          <Stat label={t('youPaidLabel')} value={formatMoney(myPaidCents, group.currency, locale)} />
        </div>
      </div>
    </section>
  );
}
