import { useI18n, useCounts } from '../i18n/I18nProvider';
import { totalSpentCents } from '../lib/balances';
import { formatMoney } from '../lib/money';
import type { Group } from '../types';
import { Avatar } from './Avatar';
import { Modal } from './Modal';

interface ImportModalProps {
  group: Group | null;
  onImport: () => void;
  onDismiss: () => void;
}

export function ImportModal({ group, onImport, onDismiss }: ImportModalProps) {
  const { t, locale } = useI18n();
  const counts = useCounts();

  return (
    <Modal
      open={group !== null}
      onClose={onDismiss}
      title={t('importTitle')}
      closeLabel={t('close')}
      maxWidth="sm:max-w-md"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('dismiss')}
          </button>
          <button
            type="button"
            onClick={onImport}
            className="flex-1 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-800/20 transition hover:bg-teal-800"
          >
            {t('importButton')}
          </button>
        </div>
      }
    >
      {group && (
        <div className="px-5 py-5">
          <p className="text-sm leading-relaxed text-slate-600">
            {t('importText', {
              name: group.name,
              count: group.members.length,
              expenses: group.expenses.length,
            })}
          </p>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{group.name}</p>
                <p className="text-xs text-slate-500">
                  {counts.members(group.members.length)} ·{' '}
                  {formatMoney(totalSpentCents(group), group.currency, locale)}
                </p>
              </div>
              <div className="flex -space-x-2">
                {group.members.slice(0, 4).map((member) => (
                  <Avatar
                    key={member.id}
                    name={member.name}
                    size="sm"
                    className="ring-2 ring-slate-50"
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {group.members.map((member) => (
                <span
                  key={member.id}
                  className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200"
                >
                  {member.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
