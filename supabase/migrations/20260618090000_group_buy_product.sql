-- CohortBuy — group-buy Research: capture the product being bought (spec), so the
-- coordinator can anchor a reference (market) price and then record the negotiated
-- group price. Reference range reuses benchmark_*; negotiated price reuses agreed_*.
alter table public.service_requests add column if not exists product_name text;
alter table public.service_requests add column if not exists product_url text;
alter table public.service_requests add column if not exists product_specs text;
alter table public.service_requests add column if not exists product_image_url text;

create or replace function public.set_product_info(
  p_request uuid, p_name text, p_url text, p_specs text, p_image text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.service_requests r
    where r.id = p_request and (r.created_by = auth.uid() or public.auth_is_cohort_manager(r.cohort_id))
  ) then raise exception 'not_coordinator'; end if;
  update public.service_requests
    set product_name = nullif(p_name, ''),
        product_url = nullif(p_url, ''),
        product_specs = nullif(p_specs, ''),
        product_image_url = nullif(p_image, ''),
        last_activity_at = now()
    where id = p_request;
end; $$;
grant execute on function public.set_product_info(uuid, text, text, text, text) to authenticated;
