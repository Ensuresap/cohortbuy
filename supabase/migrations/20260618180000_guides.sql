-- CohortBuy — DB-backed guides so staff can author SEO articles from /admin.
create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  category text,
  body text not null default '',
  read_mins int not null default 4,
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists guides_status_idx on public.guides (status, published_at desc);

alter table public.guides enable row level security;

-- Anyone (incl. anonymous visitors) may read PUBLISHED guides.
drop policy if exists guides_public_read on public.guides;
create policy guides_public_read on public.guides for select to anon, authenticated
  using (status = 'published');

-- Platform staff may read drafts + create/edit/delete.
drop policy if exists guides_staff_all on public.guides;
create policy guides_staff_all on public.guides for all to authenticated
  using (public.is_platform_staff()) with check (public.is_platform_staff());
