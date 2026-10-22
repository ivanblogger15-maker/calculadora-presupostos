import { describe, expect, it } from 'vitest';
import type { Group } from '../types';
import {
  cloudPayload,
  compareTimestamps,
  decodeLiveInvite,
  liveShareLink,
  mergeRemoteGroup,
  toCloudGroup,
  touchGroupIfChanged,
} from './sync';

const group: Group = {
  id: 'group-12345678',
  name: 'Pis',
  currency: 'EUR',
  members: [
    { id: 'm1', name: 'Laia' },
    { id: 'm2', name: 'Marc' },
  ],
  expenses: [],
  createdAt: '2026-10-22T10:00:00.000Z',
  updatedAt: '2026-10-22T10:00:00.000Z',
  currentMemberId: 'm1',
};

describe('cloud payload', () => {
  it('does not leak the device identity into the shared group', () => {
    const cloud = toCloudGroup(group);
    expect(cloud).not.toHaveProperty('currentMemberId');
    expect(cloud.name).toBe('Pis');
    expect(cloud.expenses).toEqual([]);
  });

  it('produces the same payload for the same shared data', () => {
    expect(cloudPayload({ ...group, currentMemberId: 'm2' })).toBe(cloudPayload(group));
  });
});

describe('mergeRemoteGroup', () => {
  it('keeps the local identity when the member still exists', () => {
    const remote = { ...group, currentMemberId: null, name: 'Pis nou' };
    expect(mergeRemoteGroup(remote, 'm2').currentMemberId).toBe('m2');
  });

  it('clears the identity when the member was removed', () => {
    const remote = { ...group, members: [{ id: 'm1', name: 'Laia' }] };
    expect(mergeRemoteGroup(remote, 'm2').currentMemberId).toBeNull();
  });
});

describe('touchGroupIfChanged', () => {
  it('does not bump the shared timestamp for a local-only identity change', () => {
    const next = { ...group, currentMemberId: 'm2' };
    const touched = touchGroupIfChanged(group, next, '2030-01-01T00:00:00.000Z');
    expect(touched.updatedAt).toBe(group.updatedAt);
    expect(touched.currentMemberId).toBe('m2');
  });

  it('bumps the shared timestamp when group data changes', () => {
    const next = { ...group, name: 'Pis nou' };
    const touched = touchGroupIfChanged(group, next, '2030-01-01T00:00:00.000Z');
    expect(touched.updatedAt).toBe('2030-01-01T00:00:00.000Z');
  });
});

describe('timestamps', () => {
  it('compares ISO dates', () => {
    expect(compareTimestamps('2026-10-22T10:00:00Z', '2026-10-22T09:00:00Z')).toBe(1);
    expect(compareTimestamps('2026-10-22T10:00:00Z', '2026-10-22T10:00:00Z')).toBe(0);
    expect(compareTimestamps('2026-10-22T09:00:00Z', '2026-10-22T10:00:00Z')).toBe(-1);
  });
});

describe('live invite links', () => {
  it('round-trips a group id through the hash', () => {
    const link = liveShareLink('group-12345678', 'https://example.com/app/');
    expect(link).toBe('https://example.com/app/#join=group-12345678');
    expect(decodeLiveInvite('#join=group-12345678')).toBe('group-12345678');
  });

  it('rejects malformed or snapshot-style hashes', () => {
    expect(decodeLiveInvite('#g=N4Igxg')).toBeNull();
    expect(decodeLiveInvite('#join=')).toBeNull();
    expect(decodeLiveInvite('#join=../etc/passwd')).toBeNull();
  });
});
