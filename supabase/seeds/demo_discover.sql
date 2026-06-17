-- ===========================================================================
-- CohortBuy — DEMO SEED for the cohort DISCOVERY page
-- ---------------------------------------------------------------------------
-- Creates a pool of ~40 demo neighbors and 16 PUBLIC cohorts: 12 SERVICE
-- cohorts spanning the plan's categories (fencing, roofing, landscaping, solar,
-- bulk pest control + more) and 4 GROUP_BUY cohorts (mulch, firewood, propane,
-- EV chargers), with varied member counts, locations, and projects carrying
-- agreed amounts so the discover cards show real "members · $ coordinated ·
-- projects" metrics and both the "Services" and "Group buys" sections have
-- content (US cohorts surface under "Near you" for a US viewer).
--
-- Run once against your DEV database (not production):
--   • Supabase SQL editor: paste this whole file and Run, OR
--   • CLI:  supabase db execute --file supabase/seeds/demo_discover.sql
--
-- Idempotent: re-running refreshes the demo cohorts (handles prefixed below);
-- their members + projects are cleared and rebuilt. Demo users have unusable
-- passwords (cannot log in) — they exist only to populate counts/avatars.
-- Requires migration 20260617130000_discover_cohorts.sql to be applied.
-- ===========================================================================

do $$
declare
  v_pool      uuid[] := '{}';
  v_uid       uuid;
  v_cohort    uuid;
  v_coord     uuid;
  v_start     int;
  v_amount    bigint;
  v_status    text;
  v_title     text;
  v_curr      text;
  v_cat       text;
  i           int;
  j           int;
  c           record;
  first_names text[] := array[
    'Maya','Raj','Elena','Tom','Aisha','Liam','Sofia','Noah','Priya','Diego',
    'Grace','Omar','Hana','Lucas','Nina','Marcus','Yuki','Carlos','Fatima','Ben',
    'Chloe','Arjun','Lena','Sam','Wei','Olivia','Kofi','Ruth','Pablo','Mei',
    'Ivan','Tara','Jamal','Erin','Hugo','Nadia','Felix','Zara','Owen','Leah'];
  last_names text[] := array[
    'Patel','Singh','Cruz','Becker','Khan','Murphy','Rossi','Kim','Sharma','Lopez',
    'Nguyen','Hassan','Tanaka','Silva','Andersson','Brown','Sato','Garcia','Ali','Cohen',
    'Walsh','Mehta','Novak','Reed','Chen','Wright','Mensah','Levi','Ramos','Wong',
    'Petrov','Shah','Carter','Doyle','Muller','Aziz','Bauer','Haddad','Evans','Frost'];
begin
  -- ---- pool of 40 demo neighbors --------------------------------------------
  for i in 1..40 loop
    v_uid := ('e0000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid;
    v_pool := array_append(v_pool, v_uid);

    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data, is_super_admin)
    values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated',
            'authenticated', 'neighbor' || i || '@cohortbuy.test', '',
            now(), now(), now(),
            '{"provider":"email","providers":["email"]}', '{}', false)
    on conflict (id) do nothing;

    insert into public.profiles (id, display_name, handle, email)
    values (v_uid,
            first_names[i] || ' ' || last_names[i],
            lower(first_names[i]) || '_n' || i,
            'neighbor' || i || '@cohortbuy.test')
    on conflict (id) do update set display_name = excluded.display_name;
  end loop;

  -- ---- cohorts --------------------------------------------------------------
  for c in
    select * from (values
      -- ── Services (work quoted & done per home) ──────────────────────────
      (1 ,'oak-ridge-hoa'      ,'Oak Ridge HOA Fence Project'   ,'{fencing,hoa}'::text[]              ,'US','service'  ,'One contractor, one price for the whole street','Replacing aging back fences across Oak Ridge — combining 18 homes into a single bid for cedar privacy fencing.',18,3,5230000,'Austin','TX','{78704,78745,78748}'::text[]),
      (2 ,'sunset-solar-coop'  ,'Sunset Valley Solar Co-op'     ,'{solar,eco-friendly}'::text[]       ,'US','service'  ,'Go solar together, save on installation','Rooftop solar group buy for Sunset Valley. Bulk panel pricing + one crew on site for the whole block.',31,2,28400000,'Austin','TX','{78745,78704,78749}'::text[]),
      (3 ,'maple-roof-collective','Maple Heights Roofing'       ,'{roofing,hoa}'::text[]              ,'US','service'  ,'Re-roof the block before next winter','Storm-damaged roofs across Maple Heights pooling for a single roofing contract with shared scaffolding.',14,2,12850000,'Cedar Park','TX','{78613,78641}'::text[]),
      (4 ,'greenlawn-neighbors','Greenlawn Lawn & Landscaping'  ,'{landscaping,seasonal}'::text[]     ,'US','service'  ,'Shared crew, shared savings on yard care','Seasonal landscaping and irrigation refresh for the Greenlawn community — recurring group rate.',22,4,4120000,'Austin','TX','{78704,78745}'::text[]),
      (5 ,'cedar-pest-shield'  ,'Cedar Park Pest Shield'        ,'{pest-control,seasonal}'::text[]    ,'US','service'  ,'Bulk termite & pest treatment','Neighborhood-wide quarterly pest and termite treatment at a bulk contract rate.',27,3,1840000,'Cedar Park','TX','{78613,78717,78641}'::text[]),
      (6 ,'riverside-driveways','Riverside Driveway Group'      ,'{driveway-paving,hoa}'::text[]      ,'US','service','Repave the cul-de-sac in one pour','Driveway resurfacing for Riverside — one asphalt crew, one mobilization fee split across homes.',9,1,7300000,'Austin','TX','{78741,78744}'::text[]),
      (7 ,'lakeview-gutters'   ,'Lakeview Gutter Guard Buy'     ,'{gutters,seasonal}'::text[]         ,'US','service'  ,'Gutter guards at contractor pricing','Group buy on seamless gutters + leaf guards for the Lakeview homes backing onto the woods.',12,2,2670000,'Lakeway','TX','{78732,78734}'::text[]),
      (8 ,'harbor-hvac'        ,'Harbor Point AC & HVAC'        ,'{hvac,emergency}'::text[]           ,'US','service'  ,'Beat the summer rush on AC installs','Aging AC units across Harbor Point replaced together for a bulk install + service plan.',16,2,9730000,'Austin','TX','{78759,78750}'::text[]),
      (9 ,'kensington-paint'   ,'Kensington Terrace Painting'   ,'{exterior-painting,hoa}'::text[]    ,'GB','service','One scaffold, the whole terrace painted','Exterior repaint of the Kensington terrace — shared access equipment and a single decorator team.',11,2,3400000,'London','England','{}'::text[]),
      (10,'maple-leaf-solar'   ,'Maple Leaf Solar Collective'   ,'{solar,eco-friendly}'::text[]       ,'CA','service'  ,'Community solar for colder climates','Cold-climate rooftop solar group buy with battery options for the whole subdivision.',24,2,19000000,'Toronto','ON','{}'::text[]),
      (11,'bandra-fiber'       ,'Bandra West Fiber Group'       ,'{fiber-internet}'::text[]           ,'IN','service' ,'Fiber to every flat, one bulk plan','Bulk fiber broadband rollout for the Bandra West building society — one install window, one rate.',38,3,1250000,'Mumbai','MH','{}'::text[]),
      (12,'bondi-tree'         ,'Bondi Tree & Garden Co-op'     ,'{tree-service,seasonal}'::text[]    ,'AU','service'  ,'Just forming — pruning & removals','Tree pruning and storm-risk removals for Bondi homes. Gathering neighbors before requesting quotes.',8,1,0,'Sydney','NSW','{}'::text[]),
      -- ── Group buys (shared volume product orders) ───────────────────────
      (13,'ridgeway-mulch'     ,'Ridgeway Bulk Mulch & Compost' ,'{mulch-compost,eco-friendly,seasonal}'::text[],'US','group_buy','Truckloads of mulch at wholesale rates','Spring bulk mulch and compost delivery for Ridgeway — one truck, split by the cubic yard.',19,2,980000,'Austin','TX','{78704,78745}'::text[]),
      (14,'northgate-firewood' ,'Northgate Firewood Co-op'      ,'{firewood,seasonal}'::text[]        ,'US','group_buy',E'A season\'s firewood, bought by the cord','Group order of seasoned hardwood firewood for the Northgate homes — bulk cords, shared delivery.',14,2,740000,'Austin','TX','{78753,78758}'::text[]),
      (15,'pinewood-propane'   ,'Pinewood Propane & Heating Oil','{propane-heating-oil,seasonal}'::text[],'US','group_buy','Lock in winter propane pricing together','Neighborhood propane and heating-oil group buy to lock a bulk per-gallon rate before winter.',26,3,4350000,'Austin','TX','{78745,78748,78749}'::text[]),
      (16,'elmwood-ev'         ,'Elmwood EV Charger Group Buy'  ,'{ev-chargers,eco-friendly}'::text[] ,'US','group_buy','Home EV chargers at fleet pricing','Bulk purchase + group install of Level 2 EV chargers for Elmwood driveways.',12,2,2100000,'Austin','TX','{78704,78703}'::text[])
    ) as t(seq,handle,name,tags,country,kind,tagline,descr,members,projects,value_cents,city,region,zips)
  loop
    -- upsert the cohort (keep id stable across re-runs)
    insert into public.cohorts
        (handle, name, description, tagline, visibility, tags, country, kind,
         city, region, coverage_zips, last_activity_at)
    values (c.handle, c.name, c.descr, c.tagline, 'public', c.tags, c.country, c.kind,
            c.city, c.region, c.zips, now() - make_interval(days => c.seq))
    on conflict (handle) do update
      set name = excluded.name, description = excluded.description, tagline = excluded.tagline,
          visibility = 'public', tags = excluded.tags, country = excluded.country,
          kind = excluded.kind, city = excluded.city, region = excluded.region,
          coverage_zips = excluded.coverage_zips, last_activity_at = excluded.last_activity_at
    returning id into v_cohort;

    -- rebuild members + projects for idempotency
    delete from public.service_requests where cohort_id = v_cohort;
    delete from public.cohort_members  where cohort_id = v_cohort;

    -- members: a contiguous slice of the pool (distinct, no wrap collisions)
    v_start := (c.seq * 13) % 40;
    insert into public.cohort_members (cohort_id, user_id, access_level, status)
    select v_cohort, v_pool[1 + ((v_start + g.i) % 40)], 'member', 'approved'
      from generate_series(0, c.members - 1) g(i)
    on conflict (cohort_id, user_id) do nothing;

    -- first member becomes owner + manager (coordinator)
    v_coord := v_pool[1 + (v_start % 40)];
    update public.cohorts set created_by = v_coord where id = v_cohort;
    update public.cohort_members set access_level = 'manager'
      where cohort_id = v_cohort and user_id = v_coord;

    -- currency by country (display still normalizes to USD on the card)
    v_curr := case c.country when 'GB' then 'GBP' when 'CA' then 'CAD'
                             when 'IN' then 'INR' when 'AU' then 'AUD' else 'USD' end;

    -- readable label from the cohort's primary tag (for project titles/category)
    v_cat := replace(coalesce(c.tags[1], 'project'), '-', ' ');

    -- projects: value lands on a completed project; others sit earlier in the pipeline
    for j in 1..c.projects loop
      if j = 1 and c.value_cents > 0 then
        v_status := 'completed'; v_amount := c.value_cents;
        v_title  := 'Whole-group ' || v_cat || ' (combined bid)';
      else
        v_amount := null;
        v_status := case j when 2 then 'funding' when 3 then 'rfq' else 'forming' end;
        v_title  := case j
                      when 2 then v_cat || ' — group quote round'
                      when 3 then 'New ' || v_cat || ' interest'
                      else 'Seasonal ' || v_cat || ' refresh' end;
      end if;

      insert into public.service_requests
        (cohort_id, created_by, title, category, status, min_size,
         agreed_amount_cents, agreed_currency, last_activity_at, created_at)
      values (v_cohort, v_coord, v_title, initcap(v_cat), v_status, 4,
              v_amount, case when v_amount is null then null else v_curr end,
              now() - make_interval(days => c.seq + j), now() - make_interval(days => c.seq + j + 5));
    end loop;
  end loop;

  -- Give the demo operator a location so local discovery works out of the box.
  -- (Austin 78704 is covered by several seeded cohorts.) Adjust the email if needed.
  update public.profiles p
     set postal_code = '78704', city = 'Austin', country = 'US'
    from auth.users u
   where u.id = p.id and lower(u.email) = 'praf12@gmail.com';

  raise notice 'Seeded 16 demo cohorts (12 service + 4 group buy) + 40 demo neighbors; demo operator ZIP set to 78704.';
end $$;
