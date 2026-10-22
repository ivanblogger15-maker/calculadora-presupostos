import {
  useCallback,
  useEffect,
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
import { uid } from './lib/id';
import { clearShareHash, readShareFromLocation } from './lib/share';
import { loadState, saveState } from './lib/storage';
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
  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = useCallback((message: string) => {
    setToast({ id: Date.now() + Math.random(), message });
  }, []);

  useEffect(() => {
    if (!window.location.hash.startsWith('#g=')) return;

    const shared = readShareFromLocation();
    if (shared) {
      setPendingImport(shared);
    } else {
      setImportFailed(true);
      clearShareHash();
    }
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
    if (!activeGroupId) return;
    setState((current) => ({
      ...current,
      groups: current.groups.filter((group) => group.id !== activeGroupId),
    }));
    setActiveGroupId(null);
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

      <Toast message={toast?.message ?? null} />
    </>
  );
}
