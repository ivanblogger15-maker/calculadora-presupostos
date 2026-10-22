import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Currency, Expense, Group, Member } from '../types';
import { uid } from './id';
import { sanitizeGroup } from './storage';

const HASH_PREFIX = '#g=';

interface SharePayload {
  v: 1;
  n: string;
  c: Currency;
  m: Array<{ i: string; n: string }>;
  e: Expense[];
}

export function encodeShare(group: Group): string {
  const payload: SharePayload = {
    v: 1,
    n: group.name,
    c: group.currency,
    m: group.members.map((member) => ({ i: member.id, n: member.name })),
    e: group.expenses,
  };

  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeShare(encoded: string): Group | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;

    const payload = JSON.parse(json) as SharePayload;
    if (payload.v !== 1 || !Array.isArray(payload.m) || !Array.isArray(payload.e)) return null;

    const members: Member[] = payload.m
      .filter((member) => member && typeof member.n === 'string' && member.n.trim())
      .map((member) => ({ id: typeof member.i === 'string' ? member.i : uid(), name: member.n }));

    return sanitizeGroup({
      id: uid(),
      name: payload.n,
      currency: payload.c,
      members,
      expenses: payload.e,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentMemberId: null,
    });
  } catch {
    return null;
  }
}

export function shareLink(group: Group): string {
  return `${window.location.origin}${window.location.pathname}${HASH_PREFIX}${encodeShare(group)}`;
}

export function readShareFromLocation(): Group | null {
  const hash = window.location.hash;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  return decodeShare(hash.slice(HASH_PREFIX.length));
}

export function clearShareHash(): void {
  if (
    window.location.hash.startsWith(HASH_PREFIX) ||
    window.location.hash.startsWith('#join=')
  ) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}
