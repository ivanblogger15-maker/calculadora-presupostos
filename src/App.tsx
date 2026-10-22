import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { CreateGroupModal } from './components/CreateGroupModal';
import { GroupView } from './components/GroupView';
import { Home } from './components/Home';
import { ImportModal } from './components/ImportModal';
import { Toast } from './components/Toast';
import { I18nProvider, useI18n } from './i18n/I18nProvider';
import {
  broadcastGroupChanged,
  cloudEnabled,
  fetchCloudGroup,
  removeCloudGroup,
} from './lib/cloud';
import { uid } from './lib/id';
import { clearShareHash, readShareFromLocation } from './lib/share';
import { loadState, saveState } from './lib/storage';
import { decodeLiveInvite } from './lib/sync';
import { useCloudSync } from './lib/useCloudSync';
import type { AppState, Currency, Group, Lang, Member } from './types';

interface ToastState {
  id: number;
  message: string;
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setLang = useCallback((lang: Lang) => {
    setState((current) => ({ ...current, lang }));
  }, []);

  return (
    <I18nProvider lang={state.lang} setLang={setLang}>
      <AppContent state={state} setState={setState} />
    </I18nProvider>
  );
}

interface AppContentProps {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
}

function AppContent({ state, setState }: AppContentProps) {
  const { t } = useI18n();

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<Group | null>(null);
  const [importFailed, setImportFailed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const syncErrorAt = useRef(0);

  const notify = useCallback((message: string) => {
    setToast({ id: Date.now() + Math.random(), message });
  }, []);

  const handleRemoteDelete = useCallback(
    (groupId: string) => {
      setActiveGroupId((current) => (current === groupId ? null : current));
      notify(t('cloudDeleted'));
    },
    [notify, t],
  );

  const handleSyncError = useCallback(() => {
    const now = Date.now();
    if (now - syncErrorAt.current < 15000) return;
    syncErrorAt.current = now;
    notify(t('cloudError'));
  }, [notify, t]);

  const { registerRemoteGroup } = useCloudSync({
    groups: state.groups,
    setState,
    activeGroupId,
    onRemoteDelete: handleRemoteDelete,
    onSyncError: handleSyncError,
  });

  useEffect(() => {
    const invite = decodeLiveInvite(window.location.hash);
    if (invite) {
      void joinLiveGroup(invite);
      return;
    }

    if (!window.location.hash.startsWith('#g=')) return;

    const shared = readShareFromLocation();
    if (shared) {
      setPendingImport(shared);
    } else {
      setImportFailed(true);
      clearShareHash();
    }
    // The invite is only read once, when the page first loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!importFailed) return;
    notify(t('importInvalid'));
    setImportFailed(false);
  }, [importFailed, notify, t]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeGroup = state.groups.find((group) => group.id === activeGroupId) ?? null;

  async function joinLiveGroup(groupId: string) {
    clearShareHash();

    if (state.groups.some((group) => group.id === groupId)) {
      setActiveGroupId(groupId);
      return;
    }

    if (!cloudEnabled) {
      notify(t('cloudJoinError'));
      return;
    }

    setJoining(true);
    try {
      const result = await fetchCloudGroup(groupId);
      if (!result || result.deleted) {
        notify(t('cloudJoinError'));
        return;
      }

      registerRemoteGroup(result.group, result.updatedAt);
      const group: Group = { ...result.group, currentMemberId: null };

      setState((current) =>
        current.groups.some((candidate) => candidate.id === groupId)
          ? current
          : { ...current, groups: [group, ...current.groups] },
      );
      setActiveGroupId(groupId);
      notify(t('cloudJoined'));
    } catch {
      notify(t('cloudJoinError'));
    } finally {
      setJoining(false);
    }
  }

  function updateGroup(groupId: string, updater: (group: Group) => Group) {
    setState((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId
          ? { ...updater(group), updatedAt: new Date().toISOString() }
          : group,
      ),
    }));
  }

  function handleCreateGroup(name: string, currency: Currency, memberNames: string[]) {
    const now = new Date().toISOString();
    const members: Member[] = memberNames.map((memberName) => ({
      id: uid(),
      name: memberName,
    }));

    const group: Group = {
      id: uid(),
      name,
      currency,
      members,
      expenses: [],
      createdAt: now,
      updatedAt: now,
      currentMemberId: members[0]?.id ?? null,
    };

    setState((current) => ({ ...current, groups: [group, ...current.groups] }));
    setCreateOpen(false);
    setActiveGroupId(group.id);
  }

  function handleDeleteGroup() {
    const groupId = activeGroupId;
    if (!groupId) return;

    setState((current) => ({
      ...current,
      groups: current.groups.filter((group) => group.id !== groupId),
    }));
    setActiveGroupId(null);

    if (cloudEnabled) {
      void (async () => {
        try {
          await removeCloudGroup(groupId);
          broadcastGroupChanged(groupId);
        } catch {
          handleSyncError();
        }
      })();
    }
  }

  function handleImport() {
    if (!pendingImport) return;

    const now = new Date().toISOString();
    const group: Group = {
      ...pendingImport,
      id: uid(),
      createdAt: now,
      updatedAt: now,
      currentMemberId: null,
    };

    setState((current) => ({ ...current, groups: [group, ...current.groups] }));
    setPendingImport(null);
    clearShareHash();
    setActiveGroupId(group.id);
  }

  function dismissImport() {
    setPendingImport(null);
    clearShareHash();
  }

  return (
    <>
      {activeGroup ? (
        <GroupView
          group={activeGroup}
          onBack={() => setActiveGroupId(null)}
          onUpdate={(updater) => updateGroup(activeGroup.id, updater)}
          onDelete={handleDeleteGroup}
          notify={notify}
        />
      ) : (
        <Home
          groups={state.groups}
          onCreate={() => setCreateOpen(true)}
          onOpen={(groupId) => setActiveGroupId(groupId)}
        />
      )}

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateGroup}
      />

      <ImportModal
        group={pendingImport}
        onImport={handleImport}
        onDismiss={dismissImport}
      />

      {joining && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/20 px-6 backdrop-blur-sm">
          <div className="rounded-3xl bg-white px-8 py-7 text-center shadow-2xl">
            <div
              aria-hidden="true"
              className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600"
            />
            <p className="mt-4 text-sm font-semibold text-slate-700">{t('cloudConnecting')}</p>
          </div>
        </div>
      )}

      <Toast message={toast?.message ?? null} />
    </>
  );
}
