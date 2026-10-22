import { useMemo, useState } from 'react';
import { useI18n, useCounts } from '../i18n/I18nProvider';
import {
  computeBalances,
  computeSettlements,
  memberPaidCents,
  memberShareCents,
  totalSpentCents,
} from '../lib/balances';
import { todayISO } from '../lib/dates';
import { uid } from '../lib/id';
import { formatMoney, fromCents } from '../lib/money';
import type { Expense, Group, Transfer } from '../types';
import { AddExpenseModal } from './AddExpenseModal';
import { Avatar } from './Avatar';
import { BalanceCard } from './BalanceCard';
import { ConfirmDialog } from './ConfirmDialog';
import { ExpenseDetail } from './ExpenseDetail';
import { ExpenseFeed } from './ExpenseFeed';
import { GroupSettings } from './GroupSettings';
import {
  ArrowLeftIcon,
  CheckIcon,
  PlusIcon,
  SettingsIcon,
  ShareIcon,
} from './Icons';
import { Modal } from './Modal';
import { SettlementsCard } from './SettlementsCard';
import { ShareModal } from './ShareModal';

interface GroupViewProps {
  group: Group;
  onBack: () => void;
  onUpdate: (updater: (group: Group) => Group) => void;
  onDelete: () => void;
  notify: (message: string) => void;
}

export function GroupView({ group, onBack, onUpdate, onDelete, notify }: GroupViewProps) {
  const { t, locale } = useI18n();
  const counts = useCounts();

  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<Transfer | null>(null);

  const balances = useMemo(() => computeBalances(group), [group]);
  const transfers = useMemo(() => computeSettlements(group), [group]);
  const totalSpent = totalSpentCents(group);

  const myBalance = group.currentMemberId
    ? (balances[group.currentMemberId] ?? 0)
    : null;
  const myShare = group.currentMemberId ? memberShareCents(group, group.currentMemberId) : 0;
  const myPaid = group.currentMemberId ? memberPaidCents(group, group.currentMemberId) : 0;

  const detailExpense = detailId
    ? (group.expenses.find((expense) => expense.id === detailId) ?? null)
    : null;
  const deleteExpense = deleteId
    ? (group.expenses.find((expense) => expense.id === deleteId) ?? null)
    : null;

  const memberName = (id: string) =>
    group.members.find((member) => member.id === id)?.name ?? '—';

  function handleSaveExpense(expense: Expense) {
    onUpdate((current) => ({ ...current, expenses: [expense, ...current.expenses] }));
    notify(t('expenseAdded'));
  }

  function handleDeleteExpense() {
    if (!deleteId) return;
    onUpdate((current) => ({
      ...current,
      expenses: current.expenses.filter((expense) => expense.id !== deleteId),
    }));
    setDeleteId(null);
    setDetailId(null);
  }

  function handleSettle() {
    if (!pendingTransfer) return;

    const from = memberName(pendingTransfer.from);
    const to = memberName(pendingTransfer.to);
    const settlement: Expense = {
      id: uid(),
      concept: t('settlementConcept', { from, to }),
      amount: fromCents(pendingTransfer.amountCents),
      paidBy: pendingTransfer.from,
      participants: [pendingTransfer.to],
      date: todayISO(),
      category: 'other',
      splitMethod: 'equal',
      settlement: true,
      createdAt: new Date().toISOString(),
    };

    onUpdate((current) => ({ ...current, expenses: [settlement, ...current.expenses] }));
    setPendingTransfer(null);
    notify(t('settlementAdded'));
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-1.5 px-3 py-3 sm:gap-2 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('back')}
            title={t('back')}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {group.name}
            </h1>
            <p className="truncate text-[11px] text-slate-500">
              {counts.members(group.members.length)} · {group.currency}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label={t('share')}
            title={t('share')}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ShareIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('settings')}
            title={t('settings')}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="space-y-4">
            <BalanceCard
              group={group}
              balanceCents={myBalance}
              totalSpentCents={totalSpent}
              myShareCents={myShare}
              myPaidCents={myPaid}
              onSelectMember={(memberId) =>
                onUpdate((current) => ({ ...current, currentMemberId: memberId }))
              }
              onChangePerson={() => setWhoOpen(true)}
            />

            <SettlementsCard
              group={group}
              transfers={transfers}
              onSettle={(transfer) => setPendingTransfer(transfer)}
            />
          </div>

          <div className="mt-4 lg:mt-0">
            <ExpenseFeed group={group} onOpenExpense={setDetailId} />
          </div>
        </div>
      </main>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label={t('addExpense')}
        title={t('addExpense')}
        className="fixed bottom-6 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-xl shadow-teal-900/30 transition hover:scale-105 hover:shadow-2xl active:scale-95 sm:right-8"
      >
        <PlusIcon className="h-7 w-7" />
      </button>

      <AddExpenseModal
        open={addOpen}
        group={group}
        onClose={() => setAddOpen(false)}
        onSave={handleSaveExpense}
      />

      {detailExpense && (
        <ExpenseDetail
          open
          group={group}
          expense={detailExpense}
          onClose={() => setDetailId(null)}
          onDeleteRequest={() => {
            setDeleteId(detailExpense.id);
            setDetailId(null);
          }}
        />
      )}

      <ConfirmDialog
        open={deleteExpense !== null}
        title={t('deleteExpense')}
        text={
          deleteExpense
            ? t('deleteExpenseText', { concept: deleteExpense.concept })
            : ''
        }
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        closeLabel={t('close')}
        tone="danger"
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteExpense}
      />

      <ConfirmDialog
        open={pendingTransfer !== null}
        title={t('settleConfirmTitle')}
        text={
          pendingTransfer
            ? t('settleConfirmText', {
                from: memberName(pendingTransfer.from),
                to: memberName(pendingTransfer.to),
                amount: formatMoney(pendingTransfer.amountCents, group.currency, locale),
              })
            : ''
        }
        confirmLabel={t('settleConfirm')}
        cancelLabel={t('cancel')}
        closeLabel={t('close')}
        onClose={() => setPendingTransfer(null)}
        onConfirm={handleSettle}
      />

      <ShareModal open={shareOpen} group={group} onClose={() => setShareOpen(false)} />

      <GroupSettings
        open={settingsOpen}
        group={group}
        onClose={() => setSettingsOpen(false)}
        onSave={(updates) => {
          onUpdate((current) => ({
            ...current,
            name: updates.name,
            currency: updates.currency,
            members: updates.members,
            currentMemberId: updates.currentMemberId,
          }));
          setSettingsOpen(false);
        }}
        onDelete={() => {
          setSettingsOpen(false);
          onDelete();
        }}
      />

      <Modal
        open={whoOpen}
        onClose={() => setWhoOpen(false)}
        title={t('whoAreYou')}
        closeLabel={t('close')}
        maxWidth="sm:max-w-sm"
      >
        <div className="space-y-2 px-5 py-5">
          {group.members.map((member) => {
            const active = group.currentMemberId === member.id;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  onUpdate((current) => ({ ...current, currentMemberId: member.id }));
                  setWhoOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                  active
                    ? 'border-teal-600 bg-teal-50 text-teal-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Avatar name={member.name} size="sm" />
                <span className="min-w-0 flex-1 truncate">{member.name}</span>
                {active && <CheckIcon className="h-4 w-4 shrink-0 text-teal-700" />}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
