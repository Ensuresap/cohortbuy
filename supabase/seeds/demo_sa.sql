-- ===========================================================================
-- CohortBuy — DEMO SEED for cohort "SA"
-- ---------------------------------------------------------------------------
-- Creates six demo projects across the lifecycle (forming → rfq → deciding →
-- contracting → funding → completed) with vendors, quotes, scope, discussion
-- and cost shares, plus a few demo members so splits/threads look realistic.
--
-- Run it once against your DEV database (not production):
--   • Supabase SQL editor: paste this whole file and Run, OR
--   • CLI:  supabase db execute --file supabase/seeds/demo_sa.sql
--
-- Idempotent: re-running deletes prior demo projects ([DEMO] …) and re-inserts.
-- Demo users have unusable passwords (cannot log in) — they exist for display.
-- ===========================================================================

do $$
declare
  v_cohort  uuid;
  v_owner   uuid;
  v_maya    uuid := 'd0000000-0000-0000-0000-000000000001';
  v_raj     uuid := 'd0000000-0000-0000-0000-000000000002';
  v_elena   uuid := 'd0000000-0000-0000-0000-000000000003';
  v_tom     uuid := 'd0000000-0000-0000-0000-000000000004';
  v_p uuid; v_q uuid;
begin
  -- ---- locate cohort SA -----------------------------------------------------
  select id into v_cohort from public.cohorts
   where lower(handle) = 'sa' or lower(name) = 'sa'
   order by created_at limit 1;
  if v_cohort is null then
    raise exception 'Cohort "SA" not found (looked up by handle/name). Create it first.';
  end if;

  -- real coordinator = an approved manager (fallback: any approved member, then a demo user)
  select user_id into v_owner from public.cohort_members
   where cohort_id = v_cohort and status = 'approved'
   order by (access_level = 'manager') desc, created_at asc limit 1;
  if v_owner is null then v_owner := v_maya; end if;

  -- ---- demo auth users + profiles ------------------------------------------
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, is_super_admin)
  values
   ('00000000-0000-0000-0000-000000000000', v_maya,  'authenticated','authenticated','maya.demo@cohortbuy.test','', now(), now(), now(), '{"provider":"email","providers":["email"]}','{}', false),
   ('00000000-0000-0000-0000-000000000000', v_raj,   'authenticated','authenticated','raj.demo@cohortbuy.test','',  now(), now(), now(), '{"provider":"email","providers":["email"]}','{}', false),
   ('00000000-0000-0000-0000-000000000000', v_elena, 'authenticated','authenticated','elena.demo@cohortbuy.test','',now(), now(), now(), '{"provider":"email","providers":["email"]}','{}', false),
   ('00000000-0000-0000-0000-000000000000', v_tom,   'authenticated','authenticated','tom.demo@cohortbuy.test','',  now(), now(), now(), '{"provider":"email","providers":["email"]}','{}', false)
  on conflict (id) do nothing;

  insert into public.profiles (id, display_name, handle, email) values
   (v_maya,  'Maya Patel',  'maya_demo',  'maya.demo@cohortbuy.test'),
   (v_raj,   'Raj Singh',   'raj_demo',   'raj.demo@cohortbuy.test'),
   (v_elena, 'Elena Cruz',  'elena_demo', 'elena.demo@cohortbuy.test'),
   (v_tom,   'Tom Becker',  'tom_demo',   'tom.demo@cohortbuy.test')
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.cohort_members (cohort_id, user_id, access_level, status)
  select v_cohort, u, 'member', 'approved'
    from unnest(array[v_maya, v_raj, v_elena, v_tom]) as u
  on conflict (cohort_id, user_id) do update set status = 'approved';

  -- ---- clean prior demo projects (cascades to quotes/scope/comments/shares) -
  delete from public.service_requests where cohort_id = v_cohort and title like '[DEMO]%';

  -- ===========================================================================
  -- 1) FORMING — gutter cleaning (scope started, no quotes yet)
  -- ===========================================================================
  insert into public.service_requests (cohort_id, created_by, title, category, description, driver, status, min_size)
  values (v_cohort, v_maya, '[DEMO] Block gutter cleaning', 'Home maintenance',
          'Pool the whole block to get a per-house rate on gutter clearing before the rainy season.',
          'Several houses had overflow last storm; a group rate beats individual call-outs.',
          'forming', 4)
  returning id into v_p;
  insert into public.request_participants (request_id, user_id, role, status) values
   (v_p, v_maya, 'coordinator', 'joined'), (v_p, v_raj, 'participant', 'joined');
  insert into public.scope_items (request_id, user_id, description, quantity, notes) values
   (v_p, v_maya, 'Single-storey gutter clear + downspout flush', '1 house', 'Approx 140 ft run'),
   (v_p, v_raj,  'Two-storey, includes back extension', '1 house', 'Steep pitch at rear');
  insert into public.request_comments (request_id, user_id, body) values
   (v_p, v_raj, 'In for mine — happy to collect addresses on the street.');

  -- ===========================================================================
  -- 2) RFQ — fence replacement (3 vendor quotes, owner coordinates)
  -- ===========================================================================
  insert into public.service_requests (cohort_id, created_by, title, category, description, driver, status, min_size)
  values (v_cohort, v_owner, '[DEMO] Backyard fence replacement', 'Fencing',
          'Adjoining backyards replacing shared timber fencing with the same spec for a bulk rate.',
          'Posts are rotting after the winter; replacing together saves on mobilisation and matches the look.',
          'rfq', 3)
  returning id into v_p;
  insert into public.request_participants (request_id, user_id, role, status) values
   (v_p, v_owner, 'coordinator', 'joined'), (v_p, v_maya, 'participant', 'joined'),
   (v_p, v_elena, 'participant', 'joined'), (v_p, v_tom, 'participant', 'joined');
  insert into public.scope_items (request_id, user_id, description, quantity, notes) values
   (v_p, v_owner, '6ft cedar privacy fence, back boundary', '120 ft', 'Remove + haul old panels'),
   (v_p, v_maya,  '6ft cedar, two sides', '95 ft', 'One gate'),
   (v_p, v_elena, '6ft cedar, back only', '60 ft', null);
  insert into public.quotes (request_id, vendor_name, amount_cents, currency, kind, timeline, warranty, notes, status, created_by) values
   (v_p, 'Apex Fencing',  385000, 'USD', 'final',      '2 weeks', '5 years', 'Best price; includes haul-away.', 'received', v_owner),
   (v_p, 'FenceCo',       420000, 'USD', 'indicative', '10 days', '3 years', 'Can start sooner.', 'received', v_owner),
   (v_p, 'GreenLine Outdoor', 460000, 'USD', 'indicative', '3 weeks', '7 years', 'Premium hardware, longest warranty.', 'received', v_owner);
  insert into public.request_comments (request_id, user_id, body) values
   (v_p, v_maya,  'Apex looks strong on price and they did my neighbour''s fence.'),
   (v_p, v_tom,   'GreenLine''s 7-year warranty is tempting though. Worth a call?');

  -- ===========================================================================
  -- 3) DECIDING — solar group install (quotes in, comparing)
  -- ===========================================================================
  insert into public.service_requests (cohort_id, created_by, title, category, description, driver, status, min_size)
  values (v_cohort, v_raj, '[DEMO] Rooftop solar group install', 'Energy',
          'Five households installing rooftop solar together to negotiate a per-system discount.',
          'Utility rates jumped again; a group buy unlocks better panel pricing and one inspection trip.',
          'deciding', 4)
  returning id into v_p;
  insert into public.request_participants (request_id, user_id, role, status) values
   (v_p, v_raj, 'coordinator', 'joined'), (v_p, v_maya, 'participant', 'joined'),
   (v_p, v_elena, 'participant', 'joined'), (v_p, v_tom, 'participant', 'joined'),
   (v_p, v_owner, 'participant', 'joined');
  insert into public.scope_items (request_id, user_id, description, quantity, notes) values
   (v_p, v_raj,   '6.4 kW system, south-facing roof', '1 system', 'Battery-ready inverter'),
   (v_p, v_elena, '8.2 kW system', '1 system', 'Includes 10 kWh battery');
  insert into public.quotes (request_id, vendor_name, amount_cents, currency, kind, timeline, warranty, notes, status, created_by) values
   (v_p, 'Helios Solar', 2690000, 'USD', 'final',      '6 weeks', '12 years', 'Lowest bid; group discount applied.', 'shortlisted', v_raj),
   (v_p, 'SunVolt',      2850000, 'USD', 'indicative', '5 weeks', '10 years', 'Faster install window.', 'shortlisted', v_raj),
   (v_p, 'BrightRoof',   3010000, 'USD', 'indicative', '8 weeks', '15 years', 'Tier-1 panels, longest warranty.', 'received', v_raj);
  insert into public.request_comments (request_id, user_id, body) values
   (v_p, v_maya,  'Helios came in lowest and the group discount is real. Leaning that way.'),
   (v_p, v_owner, 'Can we get BrightRoof to match on warranty? Otherwise Helios.'),
   (v_p, v_elena, 'Agree on Helios — their references checked out.');

  -- ===========================================================================
  -- 4) CONTRACTING — driveway resealing (quote selected, contract recorded)
  -- ===========================================================================
  insert into public.service_requests (cohort_id, created_by, title, category, description, driver,
          status, min_size, contract_url, contract_note)
  values (v_cohort, v_elena, '[DEMO] Driveway resealing', 'Paving',
          'Three driveways resealed in one visit for a shared mobilisation rate.',
          'Cracks are spreading; sealing now avoids a full repave later.',
          'contracting', 3,
          'https://drive.google.com/file/d/DEMO-driveway-agreement/view',
          'Signed scope: 3 driveways, 1 mobilisation, work week of the 23rd. Agreement is directly between the three members and SealPro.')
  returning id into v_p;
  insert into public.request_participants (request_id, user_id, role, status) values
   (v_p, v_elena, 'coordinator', 'joined'), (v_p, v_raj, 'participant', 'joined'),
   (v_p, v_tom, 'participant', 'joined');
  insert into public.scope_items (request_id, user_id, description, quantity, notes) values
   (v_p, v_elena, 'Standard 2-car driveway reseal', '3 driveways', 'Crack fill included');
  insert into public.quotes (request_id, vendor_name, amount_cents, currency, kind, timeline, warranty, notes, status, created_by) values
   (v_p, 'DriveMasters', 210000, 'USD', 'indicative', '1 week', '2 years', null, 'rejected', v_elena);
  insert into public.quotes (request_id, vendor_name, amount_cents, currency, kind, timeline, warranty, notes, status, created_by)
  values (v_p, 'SealPro', 180000, 'USD', 'final', '4 days', '3 years', 'Group rate; one mobilisation.', 'selected', v_elena)
  returning id into v_q;
  update public.service_requests
     set selected_quote_id = v_q, agreed_amount_cents = 180000, agreed_currency = 'USD', contract_vendor = 'SealPro'
   where id = v_p;
  insert into public.request_comments (request_id, user_id, body) values
   (v_p, v_raj, 'Contract looks good — uploaded my signed copy to the shared folder.');

  -- ===========================================================================
  -- 5) FUNDING — tree trimming (selected + contract + cost shares, part paid)
  -- ===========================================================================
  insert into public.service_requests (cohort_id, created_by, title, category, description, driver,
          status, min_size, contract_url, contract_note)
  values (v_cohort, v_owner, '[DEMO] Street tree trimming', 'Landscaping',
          'Trimming the street''s overhanging trees in one booking before storm season.',
          'Branches are over the power line; the city won''t cover private trees, so we''re pooling.',
          'funding', 4,
          'https://drive.google.com/file/d/DEMO-tree-agreement/view',
          'TreeCare booked for next Saturday. Settlement is direct to TreeCare; CohortBuy holds no funds.')
  returning id into v_p;
  insert into public.request_participants (request_id, user_id, role, status) values
   (v_p, v_owner, 'coordinator', 'joined'), (v_p, v_maya, 'participant', 'joined'),
   (v_p, v_raj, 'participant', 'joined'), (v_p, v_elena, 'participant', 'joined');
  insert into public.quotes (request_id, vendor_name, amount_cents, currency, kind, timeline, warranty, notes, status, created_by) values
   (v_p, 'ArborPlus', 275000, 'USD', 'indicative', '2 weeks', null, null, 'rejected', v_owner);
  insert into public.quotes (request_id, vendor_name, amount_cents, currency, kind, timeline, warranty, notes, status, created_by)
  values (v_p, 'TreeCare Co', 240000, 'USD', 'final', '1 week', '1 year', 'Stump grinding optional.', 'selected', v_owner)
  returning id into v_q;
  update public.service_requests
     set selected_quote_id = v_q, agreed_amount_cents = 240000, agreed_currency = 'USD', contract_vendor = 'TreeCare Co'
   where id = v_p;
  -- even split across 4 participants = 60000 each
  insert into public.cost_shares (request_id, user_id, amount_cents, currency, paid, paid_at) values
   (v_p, v_owner, 60000, 'USD', true,  now() - interval '2 days'),
   (v_p, v_maya,  60000, 'USD', true,  now() - interval '1 day'),
   (v_p, v_raj,   60000, 'USD', false, null),
   (v_p, v_elena, 60000, 'USD', false, null);
  insert into public.request_comments (request_id, user_id, body) values
   (v_p, v_maya, 'Sent my share — thanks for organising!'),
   (v_p, v_owner, 'Two paid so far. Raj/Elena, whenever you''re ready before Saturday.');

  -- ===========================================================================
  -- 6) COMPLETED — holiday lighting install (full lifecycle, all paid)
  -- ===========================================================================
  insert into public.service_requests (cohort_id, created_by, title, category, description, driver,
          status, min_size, contract_url, contract_note, completion_note, completed_at)
  values (v_cohort, v_tom, '[DEMO] Holiday lighting install', 'Seasonal',
          'Group booking to install and later remove holiday lights along three frontages.',
          'A pro install on a shared ladder day is safer and cheaper than three separate visits.',
          'completed', 3,
          'https://drive.google.com/file/d/DEMO-lighting-agreement/view',
          'BrightNights — install + January removal included.',
          'Installed across all three homes on the 1st. Clean job, removal scheduled for Jan 6.',
          now() - interval '5 days')
  returning id into v_p;
  insert into public.request_participants (request_id, user_id, role, status) values
   (v_p, v_tom, 'coordinator', 'joined'), (v_p, v_maya, 'participant', 'joined'),
   (v_p, v_raj, 'participant', 'joined');
  insert into public.quotes (request_id, vendor_name, amount_cents, currency, kind, timeline, warranty, notes, status, created_by) values
   (v_p, 'LumenWorks', 175000, 'USD', 'indicative', '3 days', null, null, 'rejected', v_tom);
  insert into public.quotes (request_id, vendor_name, amount_cents, currency, kind, timeline, warranty, notes, status, created_by)
  values (v_p, 'BrightNights', 150000, 'USD', 'final', '2 days', null, 'Install + removal.', 'selected', v_tom)
  returning id into v_q;
  update public.service_requests
     set selected_quote_id = v_q, agreed_amount_cents = 150000, agreed_currency = 'USD', contract_vendor = 'BrightNights'
   where id = v_p;
  insert into public.cost_shares (request_id, user_id, amount_cents, currency, paid, paid_at) values
   (v_p, v_tom,  50000, 'USD', true, now() - interval '6 days'),
   (v_p, v_maya, 50000, 'USD', true, now() - interval '6 days'),
   (v_p, v_raj,  50000, 'USD', true, now() - interval '5 days');
  insert into public.request_comments (request_id, user_id, body) values
   (v_p, v_maya, 'Looks fantastic — thanks Tom for running this!');

  raise notice 'Demo seed complete for cohort % (owner/coordinator %).', v_cohort, v_owner;
end $$;
