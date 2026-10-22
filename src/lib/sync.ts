import type { Group } from '../types';

/**
 * Data that is shared with the cloud. `currentMemberId` is intentionally left
 * out: it identifies the person using *this* device, not the group itself.
 */
export type CloudGroup = Omit<Group, 'currentMemberId'>;

export function toCloudGroup(group: Group): CloudGroup {
  const { currentMemberId: _currentMemberId, ...cloud } = group;
  return cloud;
}

export function cloudPayload(group: Group): string {
  return JSON.stringify(toCloudGroup(group));
}

/**
 * Merge a group received from the cloud without losing the local identity.
 */
export function mergeRemoteGroup(remote: Group, localMemberId: string | null): Group {
  const keep =
    localMemberId && remote.members.some((member) => member.id === localMemberId)
      ? localMemberId
      : null;
  return { ...remote, currentMemberId: keep };
}

/** Compare two ISO timestamps. Falls back to string comparison if parsing fails. */
export function compareTimestamps(a: string, b: string): number {
  const timeA = Date.parse(a);
  const timeB = Date.parse(b);
  if (Number.isNaN(timeA) || Number.isNaN(timeB)) return a.localeCompare(b);
  if (timeA === timeB) return 0;
  return timeA > timeB ? 1 : -1;
}

const LIVE_PREFIX = '#join=';

export function liveShareLink(
  id: string,
  base = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : '',
): string {
  return `${base}${LIVE_PREFIX}${encodeURIComponent(id)}`;
}

export function decodeLiveInvite(hash: string): string | null {
  if (!hash.startsWith(LIVE_PREFIX)) return null;
  try {
    const id = decodeURIComponent(hash.slice(LIVE_PREFIX.length));
    return /^[A-Za-z0-9_-]{8,64}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
