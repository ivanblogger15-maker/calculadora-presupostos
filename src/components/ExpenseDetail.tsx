import { useI18n, useCounts } from '../i18n/I18nProvider';
import { categoryEmoji, categoryLabelKey } from '../lib/categories';
import { expenseSharesCents } from '../lib/balances';
import { formatDateLabel, formatFullDate } from '../lib/dates';
import { formatMoney, formatPercent } from '../lib/money';
import type { Expense, Group, SplitMethod } from '../types';
import { Avatar } from './Avatar';
import { TrashIcon } from './Icons';
import { Modal } from './Modal';

interface ExpenseDetailProps {
  open: boolean;
  group: Group;
  expense: Expense;
  onClose: () => void;
  onDeleteRequest: () => void;
}

export function ExpenseDetail({
  open,
  group,
  expense,
  onClose,
  onDeleteRequest,
}: ExpenseDetailProps) {
  const { t, locale } = useI18n();
  const counts = useCounts();

  const shares = expenseSharesCents(expense);
  const payer = group.members.find((member) => member.id === expense.paidBy);
  const participants = group.members.filter((member) =>
    expense.participants.includes(member.id),
  );

  const methodLabels: Record<SplitMethod, string> = {
    equal: t('equalShort'),
    exact: t('exactShort'),
    percent: t('percentShort'),
    shares: t('sharesShort'),
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('expenseDetails')}
      closeLabel={t('close')}
      footer={
        <button
          type="button"
          onClick={onDeleteRequest}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          <TrashIcon className="h-4 w-4" />
          {t('deleteExpense')}
        </button>
      }
    >
      <div className="px-5 py-5">
        <div className="flex items-center gap-4">
          <span
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-3xl text-3xl ${
              expense.settlement ? 'bg-emerald-50' : 'bg-slate-100'
            }`}
          >
            {expense.settlement ? '🤝' : categoryEmoji(expense.category)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500">
              {expense.settlement ? t('settlementTag') : t(categoryLabelKey(expense.category))}
            </p>
            <h3 className="truncate text-lg font-bold text-slate-900">{expense.concept}</h3>
            <p className="tabular text-2xl font-extrabold tracking-tight text-slate-900">
              {formatMoney(Math.round(expense.amount * 100), group.currency, locale)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t('paidByLabel')}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              {payer && <Avatar name={payer.name} size="xs" />}
              <span className="truncate text-xs font-semibold text-slate-700">
                {payer?.name ?? '—'}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t('date')}
            </p>
            <p className="mt-1.5 text-xs font-semibold text-slate-700">
              {formatDateLabel(expense.date, locale, t('today'), t('yesterday'))}
            </p>
            <p className="text-[10px] text-slate-400">{formatFullDate(expense.date, locale)}</p>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t('method')}
            </p>
            <p className="mt-1.5 text-xs font-semibold text-slate-700">
              {methodLabels[expense.splitMethod]}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t('participants')}
            </p>
            <p className="mt-1.5 text-xs font-semibold text-slate-700">
              {counts.members(participants.length)}
            </p>
          </div>
        </div>

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">{t('splitBetween')}</h4>
            <span className="tabular text-[11px] font-semibold text-slate-500">
              {formatMoney(Math.round(expense.amount * 100), group.currency, locale)}
            </span>
          </div>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 px-3">
            {participants.map((member) => {
              const cents = shares[member.id] ?? 0;
              const percentage =
                expense.splitMethod === 'percent'
                  ? (expense.weights?.[member.id] ?? 0)
                  : expense.amount > 0
                    ? (cents / (expense.amount * 100)) * 100
                    : 0;

              return (
                <div key={member.id} className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={member.name} size="xs" />
                    <span className="flex-1 truncate text-sm text-slate-700">{member.name}</span>
                    <div className="text-right">
                      <p className="tabular text-sm font-semibold text-slate-900">
                        {formatMoney(cents, group.currency, locale)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatPercent(percentage, locale)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-500"
                      style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Modal>
  );
}
