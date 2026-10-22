import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { uid } from '../lib/id';
import type { Currency } from '../types';
import { PlusIcon, TrashIcon } from './Icons';
import { Modal } from './Modal';

interface MemberRow {
  key: string;
  name: string;
}

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, currency: Currency, memberNames: string[]) => void;
}

const CURRENCIES: Array<{ id: Currency; symbol: string }> = [
  { id: 'EUR', symbol: '€' },
  { id: 'USD', symbol: '$' },
  { id: 'GBP', symbol: '£' },
];

function blankRow(): MemberRow {
  return { key: uid(), name: '' };
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';

export function CreateGroupModal({ open, onClose, onCreate }: CreateGroupModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [members, setMembers] = useState<MemberRow[]>([blankRow(), blankRow()]);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setCurrency('EUR');
    setMembers([blankRow(), blankRow()]);
    setError(null);
    const timer = window.setTimeout(() => nameRef.current?.focus(), 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  function updateMember(key: string, value: string) {
    setMembers((current) =>
      current.map((member) => (member.key === key ? { ...member, name: value } : member)),
    );
  }

  function removeMember(key: string) {
    setMembers((current) =>
      current.length > 1 ? current.filter((member) => member.key !== key) : current,
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const groupName = name.trim();
    if (!groupName) {
      setError(t('groupNameError'));
      return;
    }

    const names = members.map((member) => member.name.trim()).filter(Boolean);
    if (names.length === 0) {
      setError(t('membersError'));
      return;
    }

    const normalized = names.map((memberName) => memberName.toLocaleLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      setError(t('duplicateMembersError'));
      return;
    }

    onCreate(groupName, currency, names);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('createGroupTitle')}
      closeLabel={t('close')}
      footer={
        <button
          type="submit"
          form="create-group-form"
          className="w-full rounded-2xl bg-teal-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-800/20 transition hover:bg-teal-800 active:scale-[0.99]"
        >
          {t('createGroup')}
        </button>
      }
    >
      <form id="create-group-form" onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
        <div>
          <label htmlFor="group-name" className="mb-1.5 block text-xs font-semibold text-slate-600">
            {t('groupName')}
          </label>
          <input
            id="group-name"
            ref={nameRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('groupNamePlaceholder')}
            maxLength={80}
            className={inputClass}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">{t('currency')}</span>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setCurrency(option.id)}
                aria-pressed={currency === option.id}
                className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                  currency === option.id
                    ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/10'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="mr-1.5 text-base">{option.symbol}</span>
                {option.id}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">{t('members')}</span>
          <div className="space-y-2">
            {members.map((member, index) => (
              <div key={member.key} className="flex items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-400">
                  {index + 1}
                </span>
                <input
                  value={member.name}
                  onChange={(event) => updateMember(member.key, event.target.value)}
                  placeholder={t('memberPlaceholder')}
                  maxLength={60}
                  className={`${inputClass} py-2.5`}
                />
                <button
                  type="button"
                  onClick={() => removeMember(member.key)}
                  disabled={members.length === 1}
                  aria-label={t('remove')}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-30"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMembers((current) => [...current, blankRow()])}
            disabled={members.length >= 30}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-40"
          >
            <PlusIcon className="h-4 w-4" />
            {t('addMember')}
          </button>
        </div>

        {error && (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
