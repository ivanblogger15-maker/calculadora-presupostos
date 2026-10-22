import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n, useCounts } from '../i18n/I18nProvider';
import { totalSpentCents } from '../lib/balances';
import { formatMoney } from '../lib/money';
import { shareLink } from '../lib/share';
import type { Group } from '../types';
import { Avatar } from './Avatar';
import { CheckIcon, CopyIcon, InfoIcon, ShareIcon } from './Icons';
import { Modal } from './Modal';

interface ShareModalProps {
  open: boolean;
  group: Group;
  onClose: () => void;
}

export function ShareModal({ open, group, onClose }: ShareModalProps) {
  const { t, locale } = useI18n();
  const counts = useCounts();
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const link = useMemo(() => (open ? shareLink(group) : ''), [open, group]);

  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      return;
    } catch {
      // Clipboard API needs a secure context; fall back to selecting the input.
    }

    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
    try {
      document.execCommand('copy');
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('shareTitle')}
      closeLabel={t('close')}
      footer={
        <button
          type="button"
          onClick={copyLink}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99] ${
            copied
              ? 'bg-emerald-600 shadow-emerald-800/20'
              : 'bg-teal-700 shadow-teal-800/20 hover:bg-teal-800'
          }`}
        >
          {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          {copied ? t('copied') : t('copyLink')}
        </button>
      }
    >
      <div className="space-y-4 px-5 py-5">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-600 text-white">
            <ShareIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{group.name}</p>
            <p className="text-xs text-slate-500">
              {counts.members(group.members.length)}
              {' · '}
              {counts.expenses(group.expenses.length)}
              {' · '}
              {formatMoney(totalSpentCents(group), group.currency, locale)}
            </p>
          </div>
          <div className="flex -space-x-2">
            {group.members.slice(0, 3).map((member) => (
              <Avatar
                key={member.id}
                name={member.name}
                size="xs"
                className="ring-2 ring-slate-50"
              />
            ))}
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-600">{t('shareText')}</p>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            readOnly
            value={link}
            onFocus={(event) => event.target.select()}
            className="w-full truncate rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 outline-none focus:border-teal-500"
            aria-label={t('shareTitle')}
          />
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">{t('shareWarning')}</p>
        </div>
      </div>
    </Modal>
  );
}
