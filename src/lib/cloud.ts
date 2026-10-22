import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Group } from '../types';
import { sanitizeGroup } from './storage';
import { toCloudGroup } from './sync';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** Cloud sync is opt-in: without both values the app keeps working locally. */
export const cloudEnabled =
  /^https?:\/\//.test(supabaseUrl) && supabaseAnonKey.length > 20;

const client: SupabaseClient | null = cloudEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export interface CloudGroupSnapshot {
  deleted: false;
  group: Group;
  updatedAt: string;
}

export interface CloudGroupDeleted {
  deleted: true;
  group: null;
  updatedAt: string;
}

export type CloudGroupResult = CloudGroupSnapshot | CloudGroupDeleted | null;

export async function fetchCloudGroup(id: string): Promise<CloudGroupResult> {
  if (!client) return null;

  const { data, error } = await client.rpc('get_group', { p_id: id });
  if (error) throw error;
  if (!data) return null;

  const updatedAt = String(data.updatedAt ?? '');
  if (data.deleted === true) {
    return { deleted: true, group: null, updatedAt };
  }

  const group = sanitizeGroup({
    ...(data.data ?? {}),
    id,
    currentMemberId: null,
  });
  if (!group) throw new Error('Invalid group payload');

  return { deleted: false, group, updatedAt };
}

export async function pushCloudGroup(group: Group): Promise<string> {
  if (!client) return group.updatedAt;

  const { data, error } = await client.rpc('save_group', {
    p_id: group.id,
    p_data: toCloudGroup(group),
  });
  if (error) throw error;
  return String(data ?? new Date().toISOString());
}

export async function removeCloudGroup(id: string): Promise<void> {
  if (!client) return;
  const { error } = await client.rpc('delete_group', { p_id: id });
  if (error) throw error;
}

const channels = new Map<string, ReturnType<SupabaseClient['channel']>>();

/**
 * Listen for "something changed" pings. The payload never contains group data:
 * clients pull the authoritative version through the RPC.
 */
export function subscribeCloudGroup(id: string, onChange: () => void): () => void {
  if (!client) return () => {};

  const channel = client.channel(`fc-group-${id}`, {
    config: { broadcast: { self: false } },
  });
  channel.on('broadcast', { event: 'changed' }, onChange).subscribe();
  channels.set(id, channel);

  return () => {
    if (channels.get(id) === channel) channels.delete(id);
    void client.removeChannel(channel);
  };
}

export function broadcastGroupChanged(id: string): void {
  const channel = channels.get(id);
  if (!channel) return;
  void channel.send({ type: 'broadcast', event: 'changed', payload: { id } });
}
