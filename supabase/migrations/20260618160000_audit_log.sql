-- CohortBuy — append-only audit log for sensitive actions, so access is traceable.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;
-- No direct table policies: writes go through record_audit(), reads through
-- admin_audit_log(). Both are SECURITY DEFINER, so the log can't be tampered
-- with or read via the API except through these gated functions.

create or replace function public.record_audit(p_action text, p_target_type text, p_target_id text, p_meta jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
    values (auth.uid(), p_action, nullif(p_target_type, ''), nullif(p_target_id, ''), coalesce(p_meta, '{}'::jsonb));
end; $$;
grant execute on function public.record_audit(text, text, text, jsonb) to authenticated;

create or replace function public.admin_audit_log(p_limit int default 100)
returns table (
  id uuid, actor_id uuid, actor_name text, action text,
  target_type text, target_id text, metadata jsonb, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_staff() then raise exception 'forbidden'; end if;
  return query
    select a.id, a.actor_id, pr.display_name, a.action, a.target_type, a.target_id, a.metadata, a.created_at
    from public.audit_log a
    left join public.profiles pr on pr.id = a.actor_id
    order by a.created_at desc
    limit p_limit;
end; $$;
grant execute on function public.admin_audit_log(int) to authenticated;
