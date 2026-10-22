import { useMemo } from 'react';
import { useI18n, useCounts } from '../i18n/I18nProvider';
import { expenseSharesCents, totalSpentCents } from '../lib/balances';
import { categoryEmoji } from '../lib/categories';
import { formatDateLabel } from '../lib/dates';
import { formatMoney } from '../lib/money';
import type { Expense, Group } from '../types';

interface ExpenseFeedProps {
  group: Group;
  onOpenExpense: (expenseId: string) => void;
}

interface DateGroup {
  date: string;
  items: Expense[];
}

export function ExpenseFeed({ group, onOpenExpense }: ExpenseFeedProps) {
  const { t, locale } = useI18n();
  const counts = useCounts();

  const grouped = useMemo<DateGroup[]>(() => {
    const sorted = [...group.expenses].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.createdAt.localeCompare(a.createdAt);
    });

    const result: DateGroup[] = [];
    for (const expense of sorted) {
      const last = result[result.length - 1];
      if (last && last.date === expense.date) {
        last.items.push(expense);
      } else {
        result.push({ date: expense.date, items: [expense] });
      }
    }
    return result;
  }, [group.expenses]);

  const myId = group.currentMemberId;
  const total = totalSpentCents(group);

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">{t('feedTitle')}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('feedSubtitle', {
              count: counts.expenses(group.expenses.length),
              total: formatMoney(total, group.currency, locale),
            })}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {group.expenses.length}
        </span>
      </div>

      {group.expenses.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-3xl">
            🍽️
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">{t('noExpensesTitle')}</h3>
          <p className="mt-1 text-sm text-slate-500">{t('noExpensesText')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          {grouped.map((day) => (
            <div key={day.date}>
              <div className="border-y border-slate-100 bg-slate-50/80 px-4 py-2 first:border-t-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {formatDateLabel(day.date, locale, t('today'), t('yesterday'))}
                </p>
              </div>

              {day.items.map((expense) => {
                const myShare = myId ? (expenseSharesCents(expense)[myId] ?? 0) : 0;
                return (
                  <button
                    key={expense.id}
                    type="button"
                    onClick={() => onOpenExpense(expense.id)}
                    className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 active:bg-slate-100/70"
                  >
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${
                        expense.settlement ? 'bg-emerald-50' : 'bg-slate-100'
                      }`}
                    >
                      {expense.settlement ? '🤝' : categoryEmoji(expense.category)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {expense.concept}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {expense.settlement ? (
                          <span className="font-medium text-emerald-700">
                            {t('settlementTag')}
                          </span>
                        ) : (
                          t('paidBy', {
                            name:
                              group.members.find((member) => member.id === expense.paidBy)?.name ??
                              '—',
                          })
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="tabular text-sm font-bold text-slate-900">
                        {formatMoney(Math.round(expense.amount * 100), group.currency, locale)}
                      </p>
                      {!expense.settlement && myShare > 0 && (
                        <p className="tabular text-[10px] text-slate-500">
                          {t('yourShare', {
                            amount: formatMoney(myShare, group.currency, locale),
                          })}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
