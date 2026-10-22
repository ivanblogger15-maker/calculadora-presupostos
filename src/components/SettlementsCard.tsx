import { useI18n } from '../i18n/I18nProvider';
import { formatMoney } from '../lib/money';
import type { Group, Transfer } from '../types';
import { Avatar } from './Avatar';
import { ArrowRightIcon, CheckCircleIcon } from './Icons';

interface SettlementsCardProps {
  group: Group;
  transfers: Transfer[];
  onSettle: (transfer: Transfer) => void;
}

export function SettlementsCard({ group, transfers, onSettle }: SettlementsCardProps) {
  const { t, locale } = useI18n();

  const memberName = (id: string) =>
    group.members.find((member) => member.id === id)?.name ?? '—';

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{t('settleTitle')}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t('settleHint')}</p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
          <ArrowRightIcon className="h-4 w-4" />
        </span>
      </div>

      {transfers.length === 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-emerald-50 p-3.5">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium leading-relaxed text-emerald-800">{t('settleEmpty')}</p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {transfers.map((transfer) => (
            <li
              key={`${transfer.from}-${transfer.to}-${transfer.amountCents}`}
              className="flex items-center gap-3 py-3"
            >
              <div className="flex -space-x-2">
                <Avatar
                  name={memberName(transfer.from)}
                  size="sm"
                  className="ring-2 ring-white"
                />
                <Avatar name={memberName(transfer.to)} size="sm" className="ring-2 ring-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-800">
                  {t('paysTo', {
                    from: memberName(transfer.from),
                    to: memberName(transfer.to),
                  })}
                </p>
                <p className="tabular text-xs font-semibold text-slate-500">
                  {formatMoney(transfer.amountCents, group.currency, locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSettle(transfer)}
                className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-100 active:scale-95"
              >
                {t('settleButton')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
