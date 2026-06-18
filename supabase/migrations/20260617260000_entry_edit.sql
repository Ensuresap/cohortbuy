-- CohortBuy — edit/delete for scope items, quotes, and comments. Allowed for the
-- entry's author, the project coordinator, or a cohort manager. Centralized in
-- SECURITY DEFINER functions so the "coordinator too" rule lives in one place.

create or replace function public.can_manage_request_entry(p_request uuid, p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_owner = auth.uid()
    or exists (
      select 1 from public.service_requests r
      where r.id = p_request
        and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
    );
$$;

create or replace function public.update_scope_item(p_id uuid, p_description text, p_quantity text, p_notes text)
returns void language plpgsql security definer set search_path = public as $$
declare v_req uuid; v_owner uuid;
begin
  select request_id, user_id into v_req, v_owner from public.scope_items where id = p_id;
  if v_req is null then raise exception 'not_found'; end if;
  if not public.can_manage_request_entry(v_req, v_owner) then raise exception 'forbidden'; end if;
  update public.scope_items
    set description = p_description, quantity = nullif(p_quantity, ''), notes = nullif(p_notes, '')
    where id = p_id;
end; $$;

create or replace function public.delete_scope_item(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_req uuid; v_owner uuid;
begin
  select request_id, user_id into v_req, v_owner from public.scope_items where id = p_id;
  if v_req is null then return; end if;
  if not public.can_manage_request_entry(v_req, v_owner) then raise exception 'forbidden'; end if;
  delete from public.scope_items where id = p_id;
end; $$;

create or replace function public.update_quote(
  p_id uuid, p_vendor text, p_amount_cents bigint, p_currency text,
  p_timeline text, p_warranty text, p_notes text, p_kind text
) returns void language plpgsql security definer set search_path = public as $$
declare v_req uuid; v_owner uuid;
begin
  select request_id, created_by into v_req, v_owner from public.quotes where id = p_id;
  if v_req is null then raise exception 'not_found'; end if;
  if not public.can_manage_request_entry(v_req, v_owner) then raise exception 'forbidden'; end if;
  update public.quotes
    set vendor_name = p_vendor, amount_cents = p_amount_cents,
        currency = coalesce(nullif(p_currency, ''), 'USD'),
        timeline = nullif(p_timeline, ''), warranty = nullif(p_warranty, ''),
        notes = nullif(p_notes, ''), kind = coalesce(nullif(p_kind, ''), kind)
    where id = p_id;
end; $$;

create or replace function public.delete_quote(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_req uuid; v_owner uuid;
begin
  select request_id, created_by into v_req, v_owner from public.quotes where id = p_id;
  if v_req is null then return; end if;
  if not public.can_manage_request_entry(v_req, v_owner) then raise exception 'forbidden'; end if;
  -- if this was the selected winner, clear the selection on the project
  update public.service_requests set selected_quote_id = null
    where id = v_req and selected_quote_id = p_id;
  delete from public.quotes where id = p_id;
end; $$;

create or replace function public.update_comment(p_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare v_req uuid; v_owner uuid;
begin
  select request_id, user_id into v_req, v_owner from public.request_comments where id = p_id;
  if v_req is null then raise exception 'not_found'; end if;
  -- comments: only the author may edit
  if v_owner <> auth.uid() then raise exception 'forbidden'; end if;
  update public.request_comments set body = p_body where id = p_id;
end; $$;

create or replace function public.delete_comment(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_req uuid; v_owner uuid;
begin
  select request_id, user_id into v_req, v_owner from public.request_comments where id = p_id;
  if v_req is null then return; end if;
  if not public.can_manage_request_entry(v_req, v_owner) then raise exception 'forbidden'; end if;
  delete from public.request_comments where id = p_id;
end; $$;
