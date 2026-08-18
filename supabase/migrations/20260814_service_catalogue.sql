/*
============================================================
AK HAIR & BEAUTY SALON
SERVICE CATALOGUE MIGRATION
============================================================

This migration adds the new service catalogue while
preserving the existing services and appointments.

It creates:

    service_categories
    service_options
    service_audiences

It also adds:

    services.category_id
    appointments.service_option_id

Existing services receive:

    - one "General Services" category
    - one pricing option based on their current
      price + duration
    - audience information based on the old
      services.category field

Existing appointments are linked to their service's
first pricing option.

Nothing is deleted.
============================================================
*/


/*
============================================================
1. SERVICE CATEGORIES
============================================================
*/

create table if not exists public.service_categories(
  id uuid primary key default gen_random_uuid(),

  name text not null,

  description text,

  display_order integer not null default 0,

  active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


/*
Prevent duplicate category names regardless of case.
*/

create unique index if not exists
service_categories_name_lower_unique
on public.service_categories(lower(name));


/*
============================================================
2. SERVICE OPTIONS
============================================================

Example:

Haircut
  ├── Basic
  │     ₹500
  │     30 min
  │
  ├── Premium
  │     ₹800
  │     60 min
  │
  └── Deluxe
        ₹1200
        90 min
*/

create table if not exists public.service_options(
  id uuid primary key default gen_random_uuid(),

  service_id uuid not null
    references public.services(id)
    on delete cascade,

  name text not null,

  price numeric(10,2) not null
    check(price >= 0),

  price_type text not null default 'fixed'
    check(
      price_type in (
        'fixed',
        'from',
        'percentage'
      )
    ),

  duration_minutes integer not null
    check(duration_minutes between 1 and 720),

  display_order integer not null default 0,

  active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


/*
============================================================
3. SERVICE AUDIENCES
============================================================

Examples:

men
women
kids
*/

create table if not exists public.service_audiences(
  id uuid primary key default gen_random_uuid(),

  service_id uuid not null
    references public.services(id)
    on delete cascade,

  audience text not null
    check(
      audience in (
        'men',
        'women',
        'kids'
      )
    ),

  created_at timestamptz not null default now(),

  unique(service_id, audience)
);


/*
============================================================
4. ADD CATEGORY TO SERVICES
============================================================

The old services table has:

    category

which currently represents:

    male
    female
    unisex

The new category system is different.

We keep the old column for backwards compatibility
and add category_id for the new catalogue.
*/

alter table public.services
add column if not exists category_id uuid
references public.service_categories(id)
on delete restrict;


/*
============================================================
5. CREATE A SAFE DEFAULT CATEGORY
============================================================

We cannot automatically know whether an existing
service should belong to:

    Haircuts
    Colour
    Styling
    Treatments
    etc.

So existing services are temporarily placed into:

    General Services

You can reorganise them from the admin catalogue
after this migration.
*/

insert into public.service_categories(
  name,
  description,
  display_order,
  active
)
select
  'General Services',
  'Existing services migrated from the original catalogue.',
  0,
  true
where not exists(
  select 1
  from public.service_categories
  where lower(name) = lower('General Services')
);


/*
============================================================
6. ASSIGN EXISTING SERVICES TO GENERAL SERVICES
============================================================
*/

update public.services
set category_id = (
  select id
  from public.service_categories
  where lower(name) = lower('General Services')
  limit 1
)
where category_id is null;


/*
At this point every existing service should have a
category_id.
*/

do $$
begin

  if exists(
    select 1
    from public.services
    where category_id is null
  ) then

    raise exception
      'Service catalogue migration failed: some services have no category_id.';

  end if;

end;
$$;


/*
Now that existing rows are populated, make the
relationship required.
*/

alter table public.services
alter column category_id set not null;


/*
============================================================
7. MIGRATE EXISTING SERVICES INTO SERVICE OPTIONS
============================================================

Every existing service currently has:

    price
    duration_minutes

We preserve those values as its first option.

Example:

Old:

    Signature Haircut
    ₹500
    45 minutes

New:

    Signature Haircut
      └── Standard
            ₹500
            45 minutes
*/

insert into public.service_options(
  service_id,
  name,
  price,
  price_type,
  duration_minutes,
  display_order,
  active
)
select
  s.id,
  'Standard',
  s.price,
  'fixed',
  s.duration_minutes,
  0,
  s.active
from public.services s
where not exists(
  select 1
  from public.service_options so
  where so.service_id = s.id
);


/*
============================================================
8. MIGRATE EXISTING AUDIENCE INFORMATION
============================================================

Old model:

    male
    female
    unisex

New model:

    men
    women
    kids

We translate:

    male   -> men
    female -> women
    unisex -> men + women

We do NOT guess "kids".
*/


insert into public.service_audiences(
  service_id,
  audience
)
select
  s.id,
  'men'
from public.services s
where s.category in ('male', 'unisex')
and not exists(
  select 1
  from public.service_audiences sa
  where sa.service_id = s.id
    and sa.audience = 'men'
);


insert into public.service_audiences(
  service_id,
  audience
)
select
  s.id,
  'women'
from public.services s
where s.category in ('female', 'unisex')
and not exists(
  select 1
  from public.service_audiences sa
  where sa.service_id = s.id
    and sa.audience = 'women'
);


/*
============================================================
9. ADD SERVICE OPTION TO APPOINTMENTS
============================================================
*/

alter table public.appointments
add column if not exists service_option_id uuid
references public.service_options(id)
on delete restrict;


/*
============================================================
10. LINK EXISTING APPOINTMENTS
============================================================

Each appointment gets the first option belonging
to its service.

Because migrated services have exactly one
"Standard" option, existing appointments retain
their original price/duration semantics.
*/

update public.appointments a
set service_option_id = (
  select so.id
  from public.service_options so
  where so.service_id = a.service_id
  order by
    so.display_order asc,
    so.created_at asc
  limit 1
)
where a.service_option_id is null;


/*
Make sure every existing appointment was linked.
*/

do $$
begin

  if exists(
    select 1
    from public.appointments
    where service_option_id is null
  ) then

    raise exception
      'Service catalogue migration failed: some appointments could not be linked to a service option.';

  end if;

end;
$$;


/*
Now the appointment must always identify the
exact pricing option used at booking time.
*/

alter table public.appointments
alter column service_option_id set not null;


/*
============================================================
11. INDEXES
============================================================
*/

create index if not exists
service_options_service_id_idx
on public.service_options(service_id);


create index if not exists
service_options_active_idx
on public.service_options(service_id, active);


create index if not exists
service_audiences_service_id_idx
on public.service_audiences(service_id);


create index if not exists
services_category_id_idx
on public.services(category_id);


create index if not exists
appointments_service_option_id_idx
on public.appointments(service_option_id);


/*
============================================================
12. ROW LEVEL SECURITY
============================================================
*/

alter table public.service_categories
enable row level security;

alter table public.service_options
enable row level security;

alter table public.service_audiences
enable row level security;


/*
============================================================
13. PUBLIC READ POLICIES
============================================================

Customers need to see active catalogue information.
Admins can see everything.
*/


drop policy if exists
"service categories public read"
on public.service_categories;


create policy
"service categories public read"
on public.service_categories
for select
using(
  active
  or public.is_admin()
);


drop policy if exists
"service options public read"
on public.service_options;


create policy
"service options public read"
on public.service_options
for select
using(
  active
  or public.is_admin()
);


drop policy if exists
"service audiences public read"
on public.service_audiences;


create policy
"service audiences public read"
on public.service_audiences
for select
using(true);


/*
============================================================
14. ADMIN WRITE POLICIES
============================================================
*/

drop policy if exists
"service categories admin write"
on public.service_categories;


create policy
"service categories admin write"
on public.service_categories
for all
using(public.is_admin())
with check(public.is_admin());


drop policy if exists
"service options admin write"
on public.service_options;


create policy
"service options admin write"
on public.service_options
for all
using(public.is_admin())
with check(public.is_admin());


drop policy if exists
"service audiences admin write"
on public.service_audiences;


create policy
"service audiences admin write"
on public.service_audiences
for all
using(public.is_admin())
with check(public.is_admin());


/*
============================================================
15. BASIC DATA-INTEGRITY CHECKS
============================================================
*/

do $$
declare
  service_count integer;
  option_count integer;
  appointment_count integer;
  linked_appointment_count integer;
begin

  select count(*)
  into service_count
  from public.services;

  select count(*)
  into option_count
  from public.service_options;

  select count(*)
  into appointment_count
  from public.appointments;

  select count(*)
  into linked_appointment_count
  from public.appointments
  where service_option_id is not null;


  raise notice
    'Service catalogue migration complete.';

  raise notice
    'Services: %',
    service_count;

  raise notice
    'Service options: %',
    option_count;

  raise notice
    'Appointments: %',
    appointment_count;

  raise notice
    'Appointments linked to options: %',
    linked_appointment_count;

end;
$$;


/*
============================================================
END
============================================================
*/
