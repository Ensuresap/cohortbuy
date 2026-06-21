-- CohortBuy — admin inbox: read inbound vendor leads and waitlist signups.
-- Both gated by is_platform_staff(); the underlying tables have no anon select.
drop function if exists public.admin_vendor_leads(int);
create or replace function public.admin_vendor_leads(p_limit int default 50)
returns table (
  id uuid, business text, contact_name text, email text, phone text,
  categories text, service_area text, message text, source text, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_staff() then raise exception 'forbidden'; end if;
  return query
    select l.id, l.business, l.contact_name, l.email, l.phone,
           l.categories, l.service_area, l.message, l.source, l.created_at
    from public.vendor_leads l
    order by l.created_at desc
    limit p_limit;
end; $$;
grant execute on function public.admin_vendor_leads(int) to authenticated;

drop function if exists public.admin_waitlist(int);
create or replace function public.admin_waitlist(p_limit int default 100)
returns table (id uuid, email text, zip text, source text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_staff() then raise exception 'forbidden'; end if;
  return query
    select w.id, w.email, w.zip, w.source, w.created_at
    from public.waitlist w
    order by w.created_at desc
    limit p_limit;
end; $$;
grant execute on function public.admin_waitlist(int) to authenticated;
