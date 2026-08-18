/*
  Stylist photos + richer coupon history.

  Adds:
  - public stylist image URL stored in the database
  - festival/event coupon source metadata
  - a clearer source classification for coupon history
*/

alter table public.stylists
  add column if not exists image_url text;

alter table public.coupons
  add column if not exists event_name text;

/* Existing compensation migration created this constraint with only
   manual/stylist_cancellation/automatic. Extend it for festival/event. */
alter table public.coupons
  drop constraint if exists coupons_source_check;

alter table public.coupons
  add constraint coupons_source_check
  check (
    source in (
      'manual',
      'stylist_cancellation',
      'festival_event',
      'automatic'
    )
  );

create index if not exists coupons_source_created_at_idx
  on public.coupons(source, created_at desc);

/*
  Create a public bucket for stylist profile photos.
  Uploads are performed server-side with the Supabase service role.
*/
insert into storage.buckets (id, name, public)
values ('stylist-images', 'stylist-images', true)
on conflict (id) do update set public = true;
