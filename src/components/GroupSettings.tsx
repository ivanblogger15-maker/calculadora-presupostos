import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { uid } from '../lib/id';
import type { Currency, Group, Member } from '../types';
import { Avatar } from './Avatar';
import { ConfirmDialog } from './ConfirmDialog';
import { CheckIcon, PlusIcon, TrashIcon } from './Icons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Modal } from './Modal';

interface GroupSettingsProps {
  open: boolean;
  group: Group;
  onClose: () => void;
  onSave: (updates: {
    name: string;
    currency: Currency;
    members: Member[];
    currentMemberId: string | null;
  }) => void;
  onDelete: () => void;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';

const bigInputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';

const CURRENCIES: Array<{ id: Currency; symbol: string }> = [
  { id: 'EUR', symbol: '€' },
  { id: 'USD', symbol: '$' },
  { id: 'GBP', symbol: '£' },
];

export function GroupSettings({ open, group, onClose, onSave, onDelete }: GroupSettingsProps) {
  const { t, lang } = useI18n();

  const [name, setName] = useState(group.name);
  const [currency, setCurrency] = useState<Currency>(group.currency);
  const [members, setMembers] = useState<Member[]>(group.members);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(group.currentMemberId);
  const [newMember, setNewMember] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(group.name);
    setCurrency(group.currency);
    setMembers(group.members);
    setCurrentMemberId(group.currentMemberId);
    setNewMember('');
    setError(null);
    setConfirmDelete(false);
  }, [open, group]);

  // Error messages are stored translated; clear them when the language changes
  // so the user never sees a stale string in another language.
  useEffect(() => {
    setError(null);
  }, [lang]);

  function updateMemberName(id: string, value: string) {
    setMembers((current) =>
      current.map((member) => (member.id === id ? { ...member, name: value } : member)),
    );
    setError(null);
  }

  function removeMember(id: string) {
    const used = group.expenses.some(
      (expense) => expense.paidBy === id || expense.participants.includes(id),
    );
    if (used) {
      setError(t('memberHasExpenses'));
      return;
    }
    if (members.length <= 1) {
      setError(t('membersError'));
      return;
    }

    setMembers((current) => current.filter((member) => member.id !== id));
    if (currentMemberId === id) setCurrentMemberId(null);
    setError(null);
  }

  function addMember() {
    const memberName = newMember.trim();
    if (!memberName) {
      setError(t('addMemberError'));
      return;
    }
    if (
      members.some(
        (member) => member.name.trim().toLocaleLowerCase() === memberName.toLocaleLowerCase(),
      )
    ) {
      setError(t('duplicateMembersError'));
      return;
    }

    setMembers((current) => [...current, { id: uid(), name: memberName }]);
    setNewMember('');
    setError(null);
  }

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('groupNameError'));
      return;
    }

    const cleaned = members.map((member) => ({ ...member, name: member.name.trim() }));
    if (cleaned.length === 0) {
      setError(t('membersError'));
      return;
    }
    if (cleaned.some((member) => !member.name)) {
      setError(t('memberNameError'));
      return;
    }

    const normalized = cleaned.map((member) => member.name.toLocaleLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      setError(t('duplicateMembersError'));
      return;
    }

    const stillExists = currentMemberId
      ? cleaned.some((member) => member.id === currentMemberId)
      : false;

    onSave({
      name: trimmedName,
      currency,
      members: cleaned,
      currentMemberId: stillExists ? currentMemberId : null,
    });
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t('settingsTitle')}
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
              {t('saveChanges')}
            </button>
          </div>
        }
      >
        <div className="space-y-6 px-5 py-5">
          <div>
            <label htmlFor="settings-name" className="mb-1.5 block text-xs font-semibold text-slate-600">
              {t('groupName')}
            </label>
            <input
              id="settings-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              maxLength={80}
              className={bigInputClass}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              {t('currency')}
            </span>
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
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              {t('members')}
            </span>
            <div className="space-y-2">
              {members.map((member) => {
                const isCurrent = currentMemberId === member.id;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-2"
                  >
                    <Avatar name={member.name || '?'} size="sm" />
                    <input
                      value={member.name}
                      onChange={(event) => updateMemberName(member.id, event.target.value)}
                      maxLength={60}
                      className={inputClass}
                      aria-label={t('memberPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setCurrentMemberId(isCurrent ? null : member.id)}
                      title={t('setAsMe')}
                      aria-label={t('setAsMe')}
                      aria-pressed={isCurrent}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                        isCurrent
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-white text-slate-300 ring-1 ring-slate-200 hover:text-teal-600'
                      }`}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMember(member.id)}
                      aria-label={t('remove')}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {currentMemberId === null && (
              <p className="mt-2 text-[11px] text-slate-400">{t('whoAreYouHint')}</p>
            )}

            <div className="mt-2 flex gap-2">
              <input
                value={newMember}
                onChange={(event) => {
                  setNewMember(event.target.value);
                  setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addMember();
                  }
                }}
                placeholder={t('memberPlaceholder')}
                maxLength={60}
                className={inputClass}
              />
              <button
                type="button"
                onClick={addMember}
                aria-label={t('addMember')}
                className="grid h-9 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 transition hover:bg-teal-100"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              {t('language')}
            </span>
            <LanguageSwitcher />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <TrashIcon className="h-4 w-4" />
              {t('deleteGroup')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title={t('deleteGroup')}
        text={t('deleteGroupText', { name: group.name })}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        closeLabel={t('close')}
        tone="danger"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
      />
    </>
  );
}
