-- CohortBuy — vendor candidates gain an address (area/locality) field.
alter table public.vendor_candidates add column if not exists address text;
