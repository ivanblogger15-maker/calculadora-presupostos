import { useMemo } from 'react';
import { useI18n, useCounts } from '../i18n/I18nProvider';
import { avatarClass, initials } from '../lib/avatar';
import { computeBalances, totalSpentCents } from '../lib/balances';
import { cloudEnabled } from '../lib/cloud';
import { formatMoney } from '../lib/money';
import type { Group } from '../types';
import { Avatar } from './Avatar';
import { BalanceChip } from './BalanceChip';
import { ChevronRightIcon, LockIcon, Logo, PlusIcon } from './Icons';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HomeProps {
  groups: Group[];
  onCreate: () => void;
  onOpen: (groupId: string) => void;
}

export function Home({ groups, onCreate, onOpen }: HomeProps) {
  const { t, locale } = useI18n();
  const counts = useCounts();
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [groups],
  );

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-gradient-to-b from-teal-100/70 via-emerald-50/40 to-transparent"
      />

      <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-11 rounded-2xl shadow-sm shadow-teal-900/10" />
            <div>
              <p className="text-lg font-extrabold tracking-tight text-slate-900">
                {t('appName')}
              </p>
              <p className="text-[11px] font-medium text-slate-500">{t('tagline')}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </header>

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {t('homeTitle')}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{t('homeSubtitle')}</p>
            </div>
            {sortedGroups.length > 0 && (
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-800/20 transition hover:bg-teal-800 active:scale-[0.98]"
              >
                <PlusIcon className="h-4 w-4" />
                {t('newGroup')}
              </button>
            )}
          </div>

          {sortedGroups.length === 0 ? (
            <div className="mt-8 rounded-[28px] border-2 border-dashed border-slate-200 bg-white/70 px-6 py-14 text-center">
              <div className="bg-dots mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-teal-50 text-5xl">
                🧾
              </div>
              <h2 className="mt-6 text-lg font-semibold text-slate-900">{t('emptyTitle')}</h2>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-500">
                {t('emptyText')}
              </p>
              <button
                type="button"
                onClick={onCreate}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-800/20 transition hover:bg-teal-800 active:scale-[0.98]"
              >
                <PlusIcon className="h-4 w-4" />
                {t('emptyCta')}
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {sortedGroups.map((group) => {
                const total = totalSpentCents(group);
                const balances = computeBalances(group);
                const myBalance = group.currentMemberId
                  ? (balances[group.currentMemberId] ?? 0)
                  : null;

                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => onOpen(group.id)}
                    className="group w-full rounded-3xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-900/5"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-bold ${avatarClass(
                          group.name,
                        )}`}
                      >
                        {initials(group.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-slate-900">{group.name}</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {counts.members(group.members.length)}
                          {' · '}
                          {counts.expenses(group.expenses.length)}
                        </p>
                        <div className="mt-2 flex -space-x-2">
                          {group.members.slice(0, 4).map((member) => (
                            <Avatar
                              key={member.id}
                              name={member.name}
                              size="xs"
                              className="ring-2 ring-white"
                            />
                          ))}
                          {group.members.length > 4 && (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 ring-2 ring-white">
                              +{group.members.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRightIcon className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-teal-600" />
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {t('totalSpentLabel')}
                        </p>
                        <p className="tabular mt-0.5 text-sm font-semibold text-slate-700">
                          {formatMoney(total, group.currency, locale)}
                        </p>
                      </div>
                      {myBalance !== null ? (
                        <BalanceChip cents={myBalance} currency={group.currency} />
                      ) : (
                        <span className="text-xs font-medium text-slate-400">
                          {t('noExpensesYet')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-14 border-t border-slate-200/70 pt-6">
          <div className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-500">
            <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
            <p>{t(cloudEnabled ? 'cloudEnabledNote' : 'localOnly')}</p>
          </div>
          <p className="mt-3 text-xs text-slate-400">{t('footerNote')}</p>
        </footer>
      </div>
    </div>
  );
}
