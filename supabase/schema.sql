-- FemComptes · Supabase schema
-- Run this once in the Supabase SQL editor.
--
-- Security model:
--   * The table is not exposed through the REST API (RLS + no policies).
--   * Clients only use the three SECURITY DEFINER functions below.
--   * The random group id is the capability: knowing it lets you read/write
--     that one group. There is no listing endpoint.
--   * The anon key is public by design (it is shipped in the web bundle).

create table if not exists public.groups (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

alter table public.groups enable row level security;
revoke all on table public.groups from anon, authenticated;

create or replace function public.get_group(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
  row_updated_at timestamptz;
  row_deleted boolean;
begin
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{8,64}$' then
    return null;
  end if;

  select g.data, g.updated_at, g.deleted
    into row_data, row_updated_at, row_deleted
    from public.groups g
   where g.id = p_id;

  if not found then
    return null;
  end if;

  if row_deleted then
    return jsonb_build_object('deleted', true, 'updatedAt', row_updated_at);
  end if;

  return jsonb_build_object(
    'deleted', false,
    'data', row_data,
    'updatedAt', row_updated_at
  );
end;
$$;

create or replace function public.save_group(p_id text, p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_at timestamptz;
begin
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{8,64}$' then
    raise exception 'invalid group id';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'invalid group data';
  end if;
  if octet_length(p_data::text) > 1048576 then
    raise exception 'group data too large';
  end if;

  insert into public.groups as g (id, data, updated_at, deleted)
  values (p_id, p_data, now(), false)
  on conflict (id) do update
    set data = excluded.data,
        updated_at = now(),
        deleted = false
  returning g.updated_at into saved_at;

  return saved_at;
end;
$$;

create or replace function public.delete_group(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{8,64}$' then
    raise exception 'invalid group id';
  end if;

  update public.groups
     set deleted = true,
         data = '{}'::jsonb,
         updated_at = now()
   where id = p_id;
end;
$$;

revoke all on function public.get_group(text) from public;
revoke all on function public.save_group(text, jsonb) from public;
revoke all on function public.delete_group(text) from public;

grant execute on function public.get_group(text) to anon, authenticated;
grant execute on function public.save_group(text, jsonb) to anon, authenticated;
grant execute on function public.delete_group(text) to anon, authenticated;

comment on table public.groups is
  'FemComptes groups. Access is only through the RPC functions below.';
