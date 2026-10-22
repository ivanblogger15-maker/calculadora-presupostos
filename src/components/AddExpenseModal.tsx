import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { CATEGORIES } from '../lib/categories';
import { todayISO } from '../lib/dates';
import { uid } from '../lib/id';
import {
  currencySymbol,
  distributeCents,
  formatMoney,
  formatNumber,
  fromCents,
  parseAmount,
  toCents,
} from '../lib/money';
import type { CategoryId, Expense, Group, SplitMethod } from '../types';
import { Avatar } from './Avatar';
import { Modal } from './Modal';

interface AddExpenseModalProps {
  open: boolean;
  group: Group;
  onClose: () => void;
  onSave: (expense: Expense) => void;
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';

const labelClass = 'mb-2 block text-xs font-semibold text-slate-600';

const METHODS: SplitMethod[] = ['equal', 'exact', 'percent', 'shares'];

function buildDefaultValues(
  method: SplitMethod,
  amountCents: number,
  memberIds: string[],
): Record<string, string> {
  if (method === 'equal' || memberIds.length === 0) return {};

  if (method === 'shares') {
    return Object.fromEntries(memberIds.map((id) => [id, '1']));
  }

  if (method === 'percent') {
    const base = Math.floor(10000 / memberIds.length);
    const parts = memberIds.map(() => base);
    parts[parts.length - 1] += 10000 - base * memberIds.length;
    return Object.fromEntries(memberIds.map((id, index) => [id, String(parts[index] / 100)]));
  }

  const parts = distributeCents(amountCents, memberIds.map(() => 1));
  return Object.fromEntries(memberIds.map((id, index) => [id, (parts[index] / 100).toFixed(2)]));
}

function numericValue(raw: string | undefined): number {
  if (!raw) return 0;
  const parsed = Number(raw.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AddExpenseModal({ open, group, onClose, onSave }: AddExpenseModalProps) {
  const { t, locale } = useI18n();

  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<CategoryId>('food');
  const [method, setMethod] = useState<SplitMethod>('equal');
  const [participants, setParticipants] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    setConcept('');
    setAmount('');
    setPaidBy(group.currentMemberId ?? group.members[0]?.id ?? '');
    setDate(todayISO());
    setCategory('food');
    setMethod('equal');
    setParticipants(group.members.map((member) => member.id));
    setValues({});
    setError(null);

    const timer = window.setTimeout(() => amountRef.current?.focus(), 240);
    return () => window.clearTimeout(timer);
  }, [open, group.id, group.currentMemberId, group.members]);

  const amountCents = useMemo(() => {
    const parsed = parseAmount(amount);
    return parsed === null ? 0 : toCents(parsed);
  }, [amount]);

  const symbol = currencySymbol(group.currency, locale);

  const exactSumCents = participants.reduce(
    (sum, id) => sum + toCents(parseAmount(values[id] ?? '') ?? 0),
    0,
  );
  const percentSum = participants.reduce((sum, id) => sum + numericValue(values[id]), 0);
  const sharesSum = participants.reduce((sum, id) => sum + numericValue(values[id]), 0);

  function changeMethod(nextMethod: SplitMethod) {
    setMethod(nextMethod);
    setValues(buildDefaultValues(nextMethod, amountCents, participants));
    setError(null);
  }

  function toggleParticipant(memberId: string) {
    const next = participants.includes(memberId)
      ? participants.filter((id) => id !== memberId)
      : [...participants, memberId];

    setParticipants(next);
    if (method !== 'equal') {
      setValues(buildDefaultValues(method, amountCents, next));
    }
    setError(null);
  }

  function setAllParticipants(all: boolean) {
    const next = all ? group.members.map((member) => member.id) : [];
    setParticipants(next);
    if (method !== 'equal') {
      setValues(buildDefaultValues(method, amountCents, next));
    }
    setError(null);
  }

  function distributeEqually() {
    setValues(buildDefaultValues(method, amountCents, participants));
    setError(null);
  }

  function handleSave() {
    const trimmedConcept = concept.trim();
    if (!trimmedConcept) {
      setError(t('conceptError'));
      return;
    }
    if (amountCents <= 0) {
      setError(t('amountError'));
      return;
    }
    if (participants.length === 0) {
      setError(t('participantsError'));
      return;
    }

    let weights: Record<string, number> | undefined;

    if (method === 'exact') {
      weights = Object.fromEntries(
        participants.map((id) => [id, parseAmount(values[id] ?? '') ?? 0]),
      );
      const sum = participants.reduce((total, id) => total + toCents(weights?.[id] ?? 0), 0);
      if (sum !== amountCents) {
        setError(t('exactError', { amount: formatMoney(amountCents, group.currency, locale) }));
        return;
      }
    } else if (method === 'percent') {
      weights = Object.fromEntries(participants.map((id) => [id, numericValue(values[id])]));
      if (Math.abs(percentSum - 100) > 0.01) {
        setError(t('percentError'));
        return;
      }
    } else if (method === 'shares') {
      weights = Object.fromEntries(participants.map((id) => [id, numericValue(values[id])]));
      if (sharesSum <= 0) {
        setError(t('sharesError'));
        return;
      }
    }

    onSave({
      id: uid(),
      concept: trimmedConcept,
      amount: fromCents(amountCents),
      paidBy,
      date,
      category,
      splitMethod: method,
      participants,
      weights,
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  const methodLabels: Record<SplitMethod, string> = {
    equal: t('splitEqual'),
    exact: t('splitExact'),
    percent: t('splitPercent'),
    shares: t('splitShares'),
  };

  const perPersonCents =
    participants.length > 0 ? Math.round(amountCents / participants.length) : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('newExpense')}
      closeLabel={t('close')}
      footer={
        <div className="space-y-3">
          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-2xl bg-teal-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-800/20 transition hover:bg-teal-800 active:scale-[0.99]"
          >
            {t('saveExpense')}
          </button>
        </div>
      }
    >
      <div className="space-y-5 px-5 py-5">
        <div className="rounded-3xl border-2 border-teal-600/80 bg-teal-50/50 px-4 py-3 focus-within:ring-4 focus-within:ring-teal-600/10">
          <label htmlFor="expense-amount" className="text-[11px] font-semibold text-teal-700">
            {t('amount')}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-teal-700">{symbol}</span>
            <input
              id="expense-amount"
              ref={amountRef}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              inputMode="decimal"
              placeholder="0,00"
              autoComplete="off"
              className="tabular w-full bg-transparent py-1 text-3xl font-bold text-slate-900 outline-none placeholder:text-teal-900/25"
            />
          </div>
        </div>

        <div>
          <label htmlFor="expense-concept" className={labelClass}>
            {t('concept')}
          </label>
          <input
            id="expense-concept"
            value={concept}
            onChange={(event) => {
              setConcept(event.target.value);
              setError(null);
            }}
            placeholder={t('conceptPlaceholder')}
            maxLength={120}
            className={inputClass}
          />
        </div>

        <div>
          <span className={labelClass}>{t('paidByLabel')}</span>
          <div className="flex flex-wrap gap-2">
            {group.members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setPaidBy(member.id)}
                aria-pressed={paidBy === member.id}
                aria-label={`${t('paidByLabel')} ${member.name}`}
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                  paidBy === member.id
                    ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/10'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Avatar name={member.name} size="xs" />
                {member.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <span className={labelClass}>{t('category')}</span>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  aria-pressed={category === item.id}
                  title={t(item.labelKey)}
                  className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl border px-3 py-2 text-lg transition ${
                    category === item.id
                      ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-600/10'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span aria-hidden="true">{item.emoji}</span>
                  <span className="text-[9px] font-semibold text-slate-500">
                    {t(item.labelKey)}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="sm:w-36">
            <label htmlFor="expense-date" className={labelClass}>
              {t('date')}
            </label>
            <input
              id="expense-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${inputClass} py-2.5`}
            />
          </div>
        </div>

        <div>
          <span className={labelClass}>{t('split')}</span>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeMethod(option)}
                aria-pressed={method === option}
                className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold transition ${
                  method === option
                    ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/10'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {methodLabels[option]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">{t('participants')}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setAllParticipants(true)}
                className="rounded-lg px-2 py-1 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-50"
              >
                {t('all')}
              </button>
              <button
                type="button"
                onClick={() => setAllParticipants(false)}
                className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100"
              >
                {t('none')}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.members.map((member) => {
              const selected = participants.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleParticipant(member.id)}
                  aria-pressed={selected}
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                    selected
                      ? 'border-teal-600 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Avatar name={member.name} size="xs" />
                  {member.name}
                </button>
              );
            })}
          </div>

          {method === 'equal' && amountCents > 0 && participants.length > 0 && (
            <p className="mt-2.5 text-xs text-slate-500">
              {t('perPerson', {
                amount: formatMoney(perPersonCents, group.currency, locale),
              })}
            </p>
          )}
        </div>

        {method !== 'equal' && participants.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-1 flex items-center justify-between gap-2 px-1">
              <p
                className={`text-xs font-semibold ${
                  (method === 'exact' && exactSumCents === amountCents) ||
                  (method === 'percent' && Math.abs(percentSum - 100) <= 0.01) ||
                  (method === 'shares' && sharesSum > 0)
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {method === 'exact' &&
                  (exactSumCents === amountCents
                    ? t('splitBalanced')
                    : exactSumCents < amountCents
                      ? t('remaining', {
                          amount: formatMoney(amountCents - exactSumCents, group.currency, locale),
                        })
                      : t('over', {
                          amount: formatMoney(exactSumCents - amountCents, group.currency, locale),
                        }))}
                {method === 'percent' &&
                  t('percentTotal', { value: formatNumber(percentSum, locale, 2) })}
                {method === 'shares' &&
                  t('sharesTotal', { value: formatNumber(sharesSum, locale, 2) })}
              </p>
              <button
                type="button"
                onClick={distributeEqually}
                className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-teal-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-teal-50"
              >
                {t('distributeEqually')}
              </button>
            </div>

            <div className="divide-y divide-slate-200/70">
              {group.members
                .filter((member) => participants.includes(member.id))
                .map((member) => (
                  <div key={member.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={member.name} size="sm" />
                    <span className="flex-1 truncate text-sm font-medium text-slate-700">
                      {member.name}
                    </span>
                    <div className="relative w-24">
                      <input
                        value={values[member.id] ?? ''}
                        onChange={(event) => {
                          setValues((current) => ({
                            ...current,
                            [member.id]: event.target.value,
                          }));
                          setError(null);
                        }}
                        inputMode="decimal"
                        className="tabular w-full rounded-xl border border-slate-200 bg-white py-2 pl-2.5 pr-7 text-right text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                        aria-label={member.name}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                        {method === 'exact' ? symbol : method === 'percent' ? '%' : '×'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
