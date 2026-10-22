import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { AppState, Group } from '../types';
import {
  broadcastGroupChanged,
  cloudEnabled,
  fetchCloudGroup,
  pushCloudGroup,
  subscribeCloudGroup,
} from './cloud';
import { cloudPayload, compareTimestamps, mergeRemoteGroup } from './sync';

const PUSH_DELAY_MS = 400;
const ACTIVE_POLL_MS = 6000;
const BACKGROUND_POLL_MS = 30000;
const RETRY_MS = 5000;

interface UseCloudSyncOptions {
  groups: Group[];
  setState: Dispatch<SetStateAction<AppState>>;
  activeGroupId: string | null;
  onRemoteDelete: (groupId: string) => void;
  onSyncError: () => void;
}

interface CloudSyncApi {
  /** Mark a group fetched from the cloud as already synced (used when joining). */
  registerRemoteGroup: (group: Group, updatedAt: string) => void;
}

export function useCloudSync({
  groups,
  setState,
  activeGroupId,
  onRemoteDelete,
  onSyncError,
}: UseCloudSyncOptions): CloudSyncApi {
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const activeRef = useRef(activeGroupId);
  activeRef.current = activeGroupId;

  const callbacksRef = useRef({ onRemoteDelete, onSyncError });
  callbacksRef.current = { onRemoteDelete, onSyncError };

  const lastSynced = useRef(new Map<string, string>());
  const serverTimestamp = useRef(new Map<string, string>());
  const dirty = useRef(new Set<string>());
  const pendingInitial = useRef(new Set<string>());
  const pushTimers = useRef(new Map<string, number>());
  const retryTimers = useRef(new Map<string, number>());
  const channels = useRef(new Map<string, () => void>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pushTimers.current.forEach((timer) => window.clearTimeout(timer));
      retryTimers.current.forEach((timer) => window.clearTimeout(timer));
      channels.current.forEach((unsubscribe) => unsubscribe());
      pushTimers.current.clear();
      retryTimers.current.clear();
      channels.current.clear();
    };
  }, []);

  const applyRemote = useCallback(
    (remote: Group, updatedAt: string) => {
      lastSynced.current.set(remote.id, cloudPayload(remote));
      serverTimestamp.current.set(remote.id, updatedAt);

      setState((current) => {
        const local = current.groups.find((group) => group.id === remote.id);
        if (!local) return current;

        const merged = mergeRemoteGroup(remote, local.currentMemberId);
        if (
          cloudPayload(merged) === cloudPayload(local) &&
          merged.currentMemberId === local.currentMemberId
        ) {
          return current;
        }

        return {
          ...current,
          groups: current.groups.map((group) =>
            group.id === remote.id ? merged : group,
          ),
        };
      });
    },
    [setState],
  );

  const push = useCallback(async (id: string): Promise<void> => {
    if (!cloudEnabled) return;

    const group = groupsRef.current.find((candidate) => candidate.id === id);
    if (!group) return;

    const payload = cloudPayload(group);
    dirty.current.add(id);

    try {
      const updatedAt = await pushCloudGroup(group);
      if (!mounted.current) return;

      lastSynced.current.set(id, payload);
      serverTimestamp.current.set(id, updatedAt);

      const current = groupsRef.current.find((candidate) => candidate.id === id);
      if (!current || cloudPayload(current) === payload) dirty.current.delete(id);

      broadcastGroupChanged(id);
    } catch {
      if (!mounted.current) return;
      callbacksRef.current.onSyncError();

      const previous = retryTimers.current.get(id);
      if (previous) window.clearTimeout(previous);
      retryTimers.current.set(
        id,
        window.setTimeout(() => {
          retryTimers.current.delete(id);
          void push(id);
        }, RETRY_MS),
      );
    }
  }, []);

  const schedulePush = useCallback(
    (id: string, delay = PUSH_DELAY_MS) => {
      const previous = pushTimers.current.get(id);
      if (previous) window.clearTimeout(previous);
      pushTimers.current.set(
        id,
        window.setTimeout(() => {
          pushTimers.current.delete(id);
          void push(id);
        }, delay),
      );
    },
    [push],
  );

  const pull = useCallback(
    async (id: string, initial = false): Promise<void> => {
      if (!cloudEnabled) return;
      if (!initial && dirty.current.has(id)) return;

      try {
        const result = await fetchCloudGroup(id);
        if (!mounted.current) return;

        if (!result) {
          if (initial) {
            const local = groupsRef.current.find((group) => group.id === id);
            if (local) {
              lastSynced.current.delete(id);
              await push(id);
            }
          }
          return;
        }

        if (result.deleted) {
          lastSynced.current.delete(id);
          serverTimestamp.current.delete(id);
          setState((current) => ({
            ...current,
            groups: current.groups.filter((group) => group.id !== id),
          }));
          callbacksRef.current.onRemoteDelete(id);
          return;
        }

        const local = groupsRef.current.find((group) => group.id === id);
        if (!local) return;

        const remotePayload = cloudPayload(result.group);
        const localPayload = cloudPayload(local);
        if (remotePayload === localPayload) {
          lastSynced.current.set(id, remotePayload);
          serverTimestamp.current.set(id, result.updatedAt);
          return;
        }

        if (initial) {
          if (compareTimestamps(result.group.updatedAt, local.updatedAt) >= 0) {
            applyRemote(result.group, result.updatedAt);
          } else {
            schedulePush(id, 0);
          }
          return;
        }

        const known = serverTimestamp.current.get(id);
        if (!known || compareTimestamps(result.updatedAt, known) > 0) {
          applyRemote(result.group, result.updatedAt);
        }
      } catch {
        if (mounted.current) callbacksRef.current.onSyncError();
      }
    },
    [applyRemote, push, schedulePush, setState],
  );

  // Reconcile groups that existed when the app loaded. New groups are pushed
  // by the effect below as soon as they appear in state.
  useEffect(() => {
    if (!cloudEnabled) return;

    const ids = groupsRef.current.map((group) => group.id);
    ids.forEach((id) => pendingInitial.current.add(id));

    void (async () => {
      for (const id of ids) {
        await pull(id, true);
        pendingInitial.current.delete(id);
      }
    })();
  }, [pull]);

  // Push local changes (debounced).
  useEffect(() => {
    if (!cloudEnabled) return;

    for (const group of groups) {
      if (pendingInitial.current.has(group.id)) continue;
      if (lastSynced.current.get(group.id) === cloudPayload(group)) continue;
      dirty.current.add(group.id);
      schedulePush(group.id);
    }
  }, [groups, schedulePush]);

  // Live updates for the group currently on screen.
  useEffect(() => {
    if (!cloudEnabled || !activeGroupId) return;

    const id = activeGroupId;
    const refresh = () => {
      void pull(id);
    };

    const unsubscribe = subscribeCloudGroup(id, refresh);
    channels.current.set(id, unsubscribe);
    refresh();

    const timer = window.setInterval(refresh, ACTIVE_POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', refresh);

    return () => {
      if (channels.current.get(id) === unsubscribe) channels.current.delete(id);
      unsubscribe();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', refresh);
    };
  }, [activeGroupId, pull]);

  // Keep the home list fresh even when a group is not open.
  useEffect(() => {
    if (!cloudEnabled) return;

    const timer = window.setInterval(() => {
      for (const group of groupsRef.current) {
        if (group.id === activeRef.current) continue;
        if (pendingInitial.current.has(group.id)) continue;
        void pull(group.id);
      }
    }, BACKGROUND_POLL_MS);

    return () => window.clearInterval(timer);
  }, [pull]);

  // Retry pending writes when the connection comes back.
  useEffect(() => {
    if (!cloudEnabled) return;

    const onOnline = () => {
      dirty.current.forEach((id) => {
        void push(id);
      });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [push]);

  const registerRemoteGroup = useCallback((group: Group, updatedAt: string) => {
    lastSynced.current.set(group.id, cloudPayload(group));
    serverTimestamp.current.set(group.id, updatedAt);
  }, []);

  return { registerRemoteGroup };
}
