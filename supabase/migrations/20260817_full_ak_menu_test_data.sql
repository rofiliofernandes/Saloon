/* AK MENU + TEST CATALOGUE DATA
Source: supplied AK Hair & Beauty Salon menu PDF.
Durations not specified in the menu are temporary TEST durations and should be
replaced with salon-confirmed timings before production.
The kids haircut price was not supplied, so that option is inactive until a
base price is configured.

Additive/idempotent: existing records are preserved; only original placeholder
services are deactivated and matching menu options are added.
*/

insert into public.service_categories(name, description, display_order, active)
select 'Hair Color / Global / Highlights', 'Hair Color / Global / Highlights services from the AK salon menu.', 0, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Hair Color / Global / Highlights'));

insert into public.service_categories(name, description, display_order, active)
select 'Haircut', 'Haircut services from the AK salon menu.', 1, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Haircut'));

insert into public.service_categories(name, description, display_order, active)
select 'Wash & Styling', 'Wash & Styling services from the AK salon menu.', 2, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Wash & Styling'));

insert into public.service_categories(name, description, display_order, active)
select 'Facial / O3 + D-Tan', 'Facial / O3 + D-Tan services from the AK salon menu.', 3, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Facial / O3 + D-Tan'));

insert into public.service_categories(name, description, display_order, active)
select 'OXY Bleach', 'OXY Bleach services from the AK salon menu.', 4, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('OXY Bleach'));

insert into public.service_categories(name, description, display_order, active)
select 'O3 + D-Tan Pack', 'O3 + D-Tan Pack services from the AK salon menu.', 5, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('O3 + D-Tan Pack'));

insert into public.service_categories(name, description, display_order, active)
select 'Body Scrubs', 'Body Scrubs services from the AK salon menu.', 6, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Body Scrubs'));

insert into public.service_categories(name, description, display_order, active)
select 'Body Polish', 'Body Polish services from the AK salon menu.', 7, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Body Polish'));

insert into public.service_categories(name, description, display_order, active)
select 'Bridal Packages', 'Bridal Packages services from the AK salon menu.', 8, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Bridal Packages'));

insert into public.service_categories(name, description, display_order, active)
select 'Threading', 'Threading services from the AK salon menu.', 9, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Threading'));

insert into public.service_categories(name, description, display_order, active)
select 'Pedicure / Manicure', 'Pedicure / Manicure services from the AK salon menu.', 10, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Pedicure / Manicure'));

insert into public.service_categories(name, description, display_order, active)
select 'Chocolate Wax', 'Chocolate Wax services from the AK salon menu.', 11, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Chocolate Wax'));

insert into public.service_categories(name, description, display_order, active)
select 'Normal Wax', 'Normal Wax services from the AK salon menu.', 12, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Normal Wax'));

insert into public.service_categories(name, description, display_order, active)
select 'Men''s Styling', 'Men''s Styling services from the AK salon menu.', 13, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Men''s Styling'));

insert into public.service_categories(name, description, display_order, active)
select 'Texture / Treatments', 'Texture / Treatments services from the AK salon menu.', 14, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Texture / Treatments'));

insert into public.service_categories(name, description, display_order, active)
select 'Hair Spa', 'Hair Spa services from the AK salon menu.', 15, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Hair Spa'));

insert into public.service_categories(name, description, display_order, active)
select 'Massage', 'Massage services from the AK salon menu.', 16, true
where not exists (select 1 from public.service_categories c where lower(c.name)=lower('Massage'));

update public.services
set active=false, deleted_at=coalesce(deleted_at, now()), updated_at=now()
where (lower(name)=lower('Signature Haircut') and description='Consultation, cut, wash and finish.')
   or (lower(name)=lower('Beard Sculpt') and description='Shape, trim and hot towel finish.')
   or (lower(name)=lower('Classic Blowout') and description='Wash, blow-dry and polished finish.')
   or (lower(name)=lower('Signature Styling') and description='Consultation and tailored styling session.');

update public.services s
set category='unisex'::public.category,
    description='Hair Color / Global / Highlights services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Hair Color / Global / Highlights') limit 1),
    updated_at=now()
where lower(s.name)=lower('Hair Color / Global / Highlights');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Hair Color / Global / Highlights', 'unisex'::public.category, 'Hair Color / Global / Highlights services from the supplied AK salon menu.', 450, 30, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Hair Color / Global / Highlights') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Hair Color / Global / Highlights'));

insert into public.service_audiences(service_id, audience)
select s.id, 'men'
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='men');

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Hair Color / Global / Highlights') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'T-Section Highlights', 3000, 'from', 90, 0, true
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('T-Section Highlights'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Highlights - Half Head', 4000, 'fixed', 90, 1, true
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Highlights - Half Head'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Highlights - Full Head', 5500, 'fixed', 120, 2, true
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Highlights - Full Head'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Global + Highlights', 6500, 'fixed', 120, 3, true
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Global + Highlights'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Glossing', 2500, 'fixed', 75, 4, true
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Glossing'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Global', 4000, 'fixed', 120, 5, true
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Global'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Root Touchup', 1600, 'fixed', 90, 6, true
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Root Touchup'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Mens Global / Roots', 1500, 'fixed', 90, 7, true
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Mens Global / Roots'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Mens Highlights', 2500, 'fixed', 90, 8, true
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Mens Highlights'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Mens Beard / Moustache', 450, 'fixed', 30, 9, true
from public.services s
where lower(s.name)=lower('Hair Color / Global / Highlights')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Mens Beard / Moustache'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Hair Color / Global / Highlights');

update public.services s
set category='unisex'::public.category,
    description='Haircut and styling for women, men and kids. The kids option is inactive until its base price is confirmed.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Haircut') limit 1),
    updated_at=now()
where lower(s.name)=lower('Hair Cut / Styling');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Hair Cut / Styling', 'unisex'::public.category, 'Haircut and styling for women, men and kids. The kids option is inactive until its base price is confirmed.', 0, 45, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Haircut') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Hair Cut / Styling'));

insert into public.service_audiences(service_id, audience)
select s.id, 'men'
from public.services s
where lower(s.name)=lower('Hair Cut / Styling')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='men');

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Hair Cut / Styling')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

insert into public.service_audiences(service_id, audience)
select s.id, 'kids'
from public.services s
where lower(s.name)=lower('Hair Cut / Styling')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='kids');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Hair Cut / Styling') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Haircut With Stylist — Women', 700, 'fixed', 60, 0, true
from public.services s
where lower(s.name)=lower('Hair Cut / Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Haircut With Stylist — Women'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Haircut With Stylist — Men', 300, 'fixed', 45, 1, true
from public.services s
where lower(s.name)=lower('Hair Cut / Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Haircut With Stylist — Men'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Haircut With Senior Stylist — Women', 1000, 'fixed', 75, 2, true
from public.services s
where lower(s.name)=lower('Hair Cut / Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Haircut With Senior Stylist — Women'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Haircut With Senior Stylist — Men', 500, 'fixed', 60, 3, true
from public.services s
where lower(s.name)=lower('Hair Cut / Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Haircut With Senior Stylist — Men'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Kids Haircut (5–15 Years) — 15% off', 0, 'fixed', 45, 4, false
from public.services s
where lower(s.name)=lower('Hair Cut / Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Kids Haircut (5–15 Years) — 15% off'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Hair Cut / Styling');

update public.services s
set category='unisex'::public.category,
    description='Wash & Styling services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Wash & Styling') limit 1),
    updated_at=now()
where lower(s.name)=lower('Wash & Styling');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Wash & Styling', 'unisex'::public.category, 'Wash & Styling services from the supplied AK salon menu.', 400, 30, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Wash & Styling') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Wash & Styling'));

insert into public.service_audiences(service_id, audience)
select s.id, 'men'
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='men');

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Wash & Styling') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Straight Blow-dry — Short', 500, 'fixed', 45, 0, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Straight Blow-dry — Short'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Straight Blow-dry — Medium', 700, 'fixed', 60, 1, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Straight Blow-dry — Medium'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Straight Blow-dry — Long', 900, 'fixed', 75, 2, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Straight Blow-dry — Long'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Only Finger Dry — Short', 400, 'fixed', 30, 3, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Only Finger Dry — Short'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Only Finger Dry — Medium', 500, 'fixed', 45, 4, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Only Finger Dry — Medium'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Only Finger Dry — Long', 600, 'fixed', 60, 5, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Only Finger Dry — Long'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Out Curls / Incurls / Twist — Short', 700, 'fixed', 60, 6, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Out Curls / Incurls / Twist — Short'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Out Curls / Incurls / Twist — Medium', 900, 'fixed', 75, 7, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Out Curls / Incurls / Twist — Medium'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Out Curls / Incurls / Twist — Long', 1200, 'fixed', 90, 8, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Out Curls / Incurls / Twist — Long'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Without Wash Styling — Short', 400, 'fixed', 30, 9, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Without Wash Styling — Short'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Without Wash Styling — Medium', 600, 'fixed', 45, 10, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Without Wash Styling — Medium'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Without Wash Styling — Long', 800, 'fixed', 60, 11, true
from public.services s
where lower(s.name)=lower('Wash & Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Without Wash Styling — Long'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Wash & Styling');

update public.services s
set category='female'::public.category,
    description='Facial / O3 + D-Tan services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Facial / O3 + D-Tan') limit 1),
    updated_at=now()
where lower(s.name)=lower('Facial / O3 + D-Tan');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Facial / O3 + D-Tan', 'female'::public.category, 'Facial / O3 + D-Tan services from the supplied AK salon menu.', 500, 30, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Facial / O3 + D-Tan') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Facial / O3 + D-Tan'));

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Facial / O3 + D-Tan')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Facial / O3 + D-Tan') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'O3 Whitening Facial', 2500, 'fixed', 75, 0, true
from public.services s
where lower(s.name)=lower('Facial / O3 + D-Tan')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('O3 Whitening Facial'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'O3 Age Lock', 3000, 'fixed', 90, 1, true
from public.services s
where lower(s.name)=lower('Facial / O3 + D-Tan')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('O3 Age Lock'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Aroma Facial', 1500, 'fixed', 60, 2, true
from public.services s
where lower(s.name)=lower('Facial / O3 + D-Tan')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Aroma Facial'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Lotus Facial', 1800, 'fixed', 60, 3, true
from public.services s
where lower(s.name)=lower('Facial / O3 + D-Tan')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Lotus Facial'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'O3 Clean Up', 1500, 'fixed', 45, 4, true
from public.services s
where lower(s.name)=lower('Facial / O3 + D-Tan')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('O3 Clean Up'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Aroma Clean Up', 1000, 'fixed', 45, 5, true
from public.services s
where lower(s.name)=lower('Facial / O3 + D-Tan')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Aroma Clean Up'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Lotus Clean Up', 1200, 'fixed', 45, 6, true
from public.services s
where lower(s.name)=lower('Facial / O3 + D-Tan')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Lotus Clean Up'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'O3 Peel Off Mask', 500, 'fixed', 30, 7, true
from public.services s
where lower(s.name)=lower('Facial / O3 + D-Tan')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('O3 Peel Off Mask'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'O3 + D-Tan', 500, 'fixed', 30, 8, true
from public.services s
where lower(s.name)=lower('Facial / O3 + D-Tan')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('O3 + D-Tan'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Facial / O3 + D-Tan');

update public.services s
set category='female'::public.category,
    description='OXY Bleach services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('OXY Bleach') limit 1),
    updated_at=now()
where lower(s.name)=lower('OXY Bleach');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'OXY Bleach', 'female'::public.category, 'OXY Bleach services from the supplied AK salon menu.', 400, 30, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('OXY Bleach') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('OXY Bleach'));

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('OXY Bleach')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('OXY Bleach') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Face / Neck', 400, 'fixed', 30, 0, true
from public.services s
where lower(s.name)=lower('OXY Bleach')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Face / Neck'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Arms', 600, 'fixed', 45, 1, true
from public.services s
where lower(s.name)=lower('OXY Bleach')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Arms'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Legs', 800, 'fixed', 60, 2, true
from public.services s
where lower(s.name)=lower('OXY Bleach')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Legs'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Back', 800, 'fixed', 60, 3, true
from public.services s
where lower(s.name)=lower('OXY Bleach')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Back'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Front', 800, 'fixed', 60, 4, true
from public.services s
where lower(s.name)=lower('OXY Bleach')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Front'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Back', 400, 'fixed', 45, 5, true
from public.services s
where lower(s.name)=lower('OXY Bleach')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Back'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Front', 400, 'fixed', 45, 6, true
from public.services s
where lower(s.name)=lower('OXY Bleach')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Front'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Body', 4000, 'fixed', 120, 7, true
from public.services s
where lower(s.name)=lower('OXY Bleach')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Body'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('OXY Bleach');

update public.services s
set category='female'::public.category,
    description='O3 + D-Tan Pack services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('O3 + D-Tan Pack') limit 1),
    updated_at=now()
where lower(s.name)=lower('O3 + D-Tan Pack');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'O3 + D-Tan Pack', 'female'::public.category, 'O3 + D-Tan Pack services from the supplied AK salon menu.', 500, 30, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('O3 + D-Tan Pack') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('O3 + D-Tan Pack'));

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('O3 + D-Tan Pack')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('O3 + D-Tan Pack') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Face / Neck', 500, 'fixed', 30, 0, true
from public.services s
where lower(s.name)=lower('O3 + D-Tan Pack')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Face / Neck'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Arms', 800, 'fixed', 45, 1, true
from public.services s
where lower(s.name)=lower('O3 + D-Tan Pack')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Arms'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Legs', 1000, 'fixed', 60, 2, true
from public.services s
where lower(s.name)=lower('O3 + D-Tan Pack')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Legs'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Back', 1000, 'fixed', 60, 3, true
from public.services s
where lower(s.name)=lower('O3 + D-Tan Pack')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Back'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Front', 1000, 'fixed', 60, 4, true
from public.services s
where lower(s.name)=lower('O3 + D-Tan Pack')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Front'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Back', 600, 'fixed', 45, 5, true
from public.services s
where lower(s.name)=lower('O3 + D-Tan Pack')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Back'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Front', 600, 'fixed', 45, 6, true
from public.services s
where lower(s.name)=lower('O3 + D-Tan Pack')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Front'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Body', 5000, 'fixed', 120, 7, true
from public.services s
where lower(s.name)=lower('O3 + D-Tan Pack')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Body'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('O3 + D-Tan Pack');

update public.services s
set category='female'::public.category,
    description='Body Scrubs services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Body Scrubs') limit 1),
    updated_at=now()
where lower(s.name)=lower('Body Scrubs');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Body Scrubs', 'female'::public.category, 'Body Scrubs services from the supplied AK salon menu.', 1000, 30, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Body Scrubs') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Body Scrubs'));

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Body Scrubs')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Body Scrubs') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Back Scrub', 1000, 'fixed', 30, 0, true
from public.services s
where lower(s.name)=lower('Body Scrubs')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Back Scrub'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Body Scrub', 2000, 'fixed', 60, 1, true
from public.services s
where lower(s.name)=lower('Body Scrubs')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Body Scrub'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Body Scrubs');

update public.services s
set category='female'::public.category,
    description='Body Polish services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Body Polish') limit 1),
    updated_at=now()
where lower(s.name)=lower('Body Polish');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Body Polish', 'female'::public.category, 'Body Polish services from the supplied AK salon menu.', 3000, 60, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Body Polish') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Body Polish'));

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Body Polish')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Body Polish') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Body Polish', 3000, 'fixed', 60, 0, true
from public.services s
where lower(s.name)=lower('Body Polish')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Body Polish'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Body Polish');

update public.services s
set category='female'::public.category,
    description='Bridal Packages services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Bridal Packages') limit 1),
    updated_at=now()
where lower(s.name)=lower('Bridal Packages');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Bridal Packages', 'female'::public.category, 'Bridal Packages services from the supplied AK salon menu.', 50, 10, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Bridal Packages') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Bridal Packages'));

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Bridal Packages')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Bridal Packages') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Eyebrows', 70, 'fixed', 15, 0, true
from public.services s
where lower(s.name)=lower('Bridal Packages')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Eyebrows'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Upper Lips', 50, 'fixed', 10, 1, true
from public.services s
where lower(s.name)=lower('Bridal Packages')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Upper Lips'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Chin', 50, 'fixed', 10, 2, true
from public.services s
where lower(s.name)=lower('Bridal Packages')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Chin'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Forehead', 50, 'fixed', 10, 3, true
from public.services s
where lower(s.name)=lower('Bridal Packages')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Forehead'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Side Locks', 60, 'fixed', 15, 4, true
from public.services s
where lower(s.name)=lower('Bridal Packages')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Side Locks'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Face + Eyebrows', 350, 'fixed', 30, 5, true
from public.services s
where lower(s.name)=lower('Bridal Packages')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Face + Eyebrows'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Bridal Packages');

update public.services s
set category='female'::public.category,
    description='Threading services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Threading') limit 1),
    updated_at=now()
where lower(s.name)=lower('Threading');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Threading', 'female'::public.category, 'Threading services from the supplied AK salon menu.', 50, 10, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Threading') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Threading'));

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Threading')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Threading') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Eyebrows', 70, 'fixed', 15, 0, true
from public.services s
where lower(s.name)=lower('Threading')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Eyebrows'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Upper Lips', 50, 'fixed', 10, 1, true
from public.services s
where lower(s.name)=lower('Threading')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Upper Lips'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Chin', 50, 'fixed', 10, 2, true
from public.services s
where lower(s.name)=lower('Threading')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Chin'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Forehead', 50, 'fixed', 10, 3, true
from public.services s
where lower(s.name)=lower('Threading')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Forehead'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Side Locks', 60, 'fixed', 15, 4, true
from public.services s
where lower(s.name)=lower('Threading')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Side Locks'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Face', 350, 'fixed', 30, 5, true
from public.services s
where lower(s.name)=lower('Threading')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Face'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Threading');

update public.services s
set category='female'::public.category,
    description='Pedicure / Manicure services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Pedicure / Manicure') limit 1),
    updated_at=now()
where lower(s.name)=lower('Pedicure / Manicure');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Pedicure / Manicure', 'female'::public.category, 'Pedicure / Manicure services from the supplied AK salon menu.', 100, 15, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Pedicure / Manicure') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Pedicure / Manicure'));

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Pedicure / Manicure')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Pedicure / Manicure') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Normal Pedicure', 900, 'fixed', 60, 0, true
from public.services s
where lower(s.name)=lower('Pedicure / Manicure')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Normal Pedicure'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Spa Pedicure', 1200, 'fixed', 75, 1, true
from public.services s
where lower(s.name)=lower('Pedicure / Manicure')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Spa Pedicure'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Normal Manicure', 500, 'fixed', 45, 2, true
from public.services s
where lower(s.name)=lower('Pedicure / Manicure')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Normal Manicure'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Spa Manicure', 800, 'fixed', 60, 3, true
from public.services s
where lower(s.name)=lower('Pedicure / Manicure')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Spa Manicure'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Cut File', 150, 'fixed', 20, 4, true
from public.services s
where lower(s.name)=lower('Pedicure / Manicure')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Cut File'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'File', 100, 'fixed', 15, 5, true
from public.services s
where lower(s.name)=lower('Pedicure / Manicure')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('File'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Nail Polish', 150, 'fixed', 20, 6, true
from public.services s
where lower(s.name)=lower('Pedicure / Manicure')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Nail Polish'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Gel Polish', 1000, 'fixed', 60, 7, true
from public.services s
where lower(s.name)=lower('Pedicure / Manicure')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Gel Polish'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Gel Polish Remove', 400, 'fixed', 30, 8, true
from public.services s
where lower(s.name)=lower('Pedicure / Manicure')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Gel Polish Remove'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Pedicure / Manicure');

update public.services s
set category='female'::public.category,
    description='Chocolate Wax services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Chocolate Wax') limit 1),
    updated_at=now()
where lower(s.name)=lower('Chocolate Wax');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Chocolate Wax', 'female'::public.category, 'Chocolate Wax services from the supplied AK salon menu.', 80, 10, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Chocolate Wax') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Chocolate Wax'));

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Chocolate Wax') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Legs', 800, 'fixed', 45, 0, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Legs'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Legs', 500, 'fixed', 30, 1, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Legs'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Arms', 600, 'fixed', 45, 2, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Arms'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Arms', 300, 'fixed', 30, 3, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Arms'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Under Arms', 150, 'fixed', 15, 4, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Under Arms'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Back', 1000, 'fixed', 45, 5, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Back'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Back', 600, 'fixed', 30, 6, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Back'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Stomach', 800, 'fixed', 45, 7, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Stomach'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Stomach', 500, 'fixed', 30, 8, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Stomach'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'V Wax / Line — Full', 800, 'fixed', 30, 9, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('V Wax / Line — Full'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'V Wax / Line — Half', 400, 'fixed', 20, 10, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('V Wax / Line — Half'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'W Wax — Full', 500, 'fixed', 30, 11, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('W Wax — Full'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'W Wax — Half', 250, 'fixed', 20, 12, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('W Wax — Half'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Body', 5000, 'fixed', 120, 13, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Body'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Upper Lip', 80, 'fixed', 10, 14, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Upper Lip'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Chin', 80, 'fixed', 10, 15, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Chin'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Side Locks', 80, 'fixed', 15, 16, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Side Locks'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Forehead', 80, 'fixed', 10, 17, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Forehead'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Face', 400, 'fixed', 30, 18, true
from public.services s
where lower(s.name)=lower('Chocolate Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Face'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Chocolate Wax');

update public.services s
set category='female'::public.category,
    description='Normal Wax services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Normal Wax') limit 1),
    updated_at=now()
where lower(s.name)=lower('Normal Wax');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Normal Wax', 'female'::public.category, 'Normal Wax services from the supplied AK salon menu.', 50, 10, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Normal Wax') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Normal Wax'));

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Normal Wax') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Legs', 600, 'fixed', 45, 0, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Legs'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Legs', 300, 'fixed', 30, 1, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Legs'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Arms', 500, 'fixed', 45, 2, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Arms'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Arms', 300, 'fixed', 30, 3, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Arms'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Under Arms', 100, 'fixed', 15, 4, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Under Arms'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Back', 800, 'fixed', 45, 5, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Back'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Back', 500, 'fixed', 30, 6, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Back'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Stomach', 600, 'fixed', 45, 7, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Stomach'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Half Stomach', 350, 'fixed', 30, 8, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Half Stomach'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'V Wax / Line — Full', 650, 'fixed', 30, 9, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('V Wax / Line — Full'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'V Wax / Line — Half', 350, 'fixed', 20, 10, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('V Wax / Line — Half'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'W Wax — Full', 400, 'fixed', 30, 11, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('W Wax — Full'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'W Wax — Half', 200, 'fixed', 20, 12, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('W Wax — Half'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Body', 4000, 'fixed', 120, 13, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Body'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Upper Lip', 60, 'fixed', 10, 14, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Upper Lip'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Chin', 50, 'fixed', 10, 15, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Chin'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Side Locks', 60, 'fixed', 15, 16, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Side Locks'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Forehead', 60, 'fixed', 10, 17, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Forehead'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Full Face', 300, 'fixed', 30, 18, true
from public.services s
where lower(s.name)=lower('Normal Wax')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Full Face'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Normal Wax');

update public.services s
set category='male'::public.category,
    description='Men''s Styling services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Men''s Styling') limit 1),
    updated_at=now()
where lower(s.name)=lower('Men''s Styling');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Men''s Styling', 'male'::public.category, 'Men''s Styling services from the supplied AK salon menu.', 150, 20, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Men''s Styling') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Men''s Styling'));

insert into public.service_audiences(service_id, audience)
select s.id, 'men'
from public.services s
where lower(s.name)=lower('Men''s Styling')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='men');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Men''s Styling') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Wash & Styling', 400, 'fixed', 45, 0, true
from public.services s
where lower(s.name)=lower('Men''s Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Wash & Styling'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Only Wash', 150, 'fixed', 20, 1, true
from public.services s
where lower(s.name)=lower('Men''s Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Only Wash'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Beard Trim', 200, 'fixed', 20, 2, true
from public.services s
where lower(s.name)=lower('Men''s Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Beard Trim'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Clean Shave', 150, 'fixed', 20, 3, true
from public.services s
where lower(s.name)=lower('Men''s Styling')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Clean Shave'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Men''s Styling');

update public.services s
set category='unisex'::public.category,
    description='Texture / Treatments services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Texture / Treatments') limit 1),
    updated_at=now()
where lower(s.name)=lower('Texture / Treatments');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Texture / Treatments', 'unisex'::public.category, 'Texture / Treatments services from the supplied AK salon menu.', 4500, 120, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Texture / Treatments') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Texture / Treatments'));

insert into public.service_audiences(service_id, audience)
select s.id, 'men'
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='men');

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Texture / Treatments') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Keratin — Short', 4500, 'fixed', 120, 0, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Keratin — Short'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Keratin — Medium', 6000, 'fixed', 150, 1, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Keratin — Medium'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Keratin — Long', 8000, 'fixed', 180, 2, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Keratin — Long'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'QOD — Short', 5500, 'fixed', 120, 3, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('QOD — Short'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'QOD — Medium', 7000, 'fixed', 150, 4, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('QOD — Medium'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'QOD — Long', 9000, 'fixed', 180, 5, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('QOD — Long'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Botox — Short', 6000, 'fixed', 120, 6, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Botox — Short'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Botox — Medium', 8000, 'fixed', 150, 7, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Botox — Medium'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Botox — Long', 10000, 'fixed', 180, 8, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Botox — Long'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Straightening — Short', 5000, 'fixed', 120, 9, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Straightening — Short'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Straightening — Medium', 7000, 'fixed', 150, 10, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Straightening — Medium'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Straightening — Long', 10000, 'fixed', 180, 11, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Straightening — Long'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Perming — Short', 6000, 'fixed', 120, 12, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Perming — Short'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Perming — Medium', 8000, 'fixed', 150, 13, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Perming — Medium'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Perming — Long', 10000, 'fixed', 180, 14, true
from public.services s
where lower(s.name)=lower('Texture / Treatments')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Perming — Long'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Texture / Treatments');

update public.services s
set category='unisex'::public.category,
    description='Hair Spa services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Hair Spa') limit 1),
    updated_at=now()
where lower(s.name)=lower('Hair Spa');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Hair Spa', 'unisex'::public.category, 'Hair Spa services from the supplied AK salon menu.', 1500, 60, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Hair Spa') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Hair Spa'));

insert into public.service_audiences(service_id, audience)
select s.id, 'men'
from public.services s
where lower(s.name)=lower('Hair Spa')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='men');

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Hair Spa')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Hair Spa') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'L''Oreal — Short', 1500, 'fixed', 60, 0, true
from public.services s
where lower(s.name)=lower('Hair Spa')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('L''Oreal — Short'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'L''Oreal — Medium', 2500, 'fixed', 75, 1, true
from public.services s
where lower(s.name)=lower('Hair Spa')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('L''Oreal — Medium'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'L''Oreal — Long', 3200, 'fixed', 90, 2, true
from public.services s
where lower(s.name)=lower('Hair Spa')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('L''Oreal — Long'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, '3 TENX', 2500, 'from', 90, 3, true
from public.services s
where lower(s.name)=lower('Hair Spa')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('3 TENX'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Dandruff Treatment', 1500, 'fixed', 60, 4, true
from public.services s
where lower(s.name)=lower('Hair Spa')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Dandruff Treatment'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Hair Spa');

update public.services s
set category='unisex'::public.category,
    description='Massage services from the supplied AK salon menu.',
    active=true, deleted_at=null,
    category_id=(select c.id from public.service_categories c where lower(c.name)=lower('Massage') limit 1),
    updated_at=now()
where lower(s.name)=lower('Massage');

insert into public.services(name, category, description, price, duration_minutes, active, category_id)
select 'Massage', 'unisex'::public.category, 'Massage services from the supplied AK salon menu.', 600, 20, true,
       (select c.id from public.service_categories c where lower(c.name)=lower('Massage') limit 1)
where not exists (select 1 from public.services s where lower(s.name)=lower('Massage'));

insert into public.service_audiences(service_id, audience)
select s.id, 'men'
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='men');

insert into public.service_audiences(service_id, audience)
select s.id, 'women'
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_audiences sa where sa.service_id=s.id and sa.audience='women');

update public.service_options so
set active=false, updated_at=now()
where so.service_id=(select s.id from public.services s where lower(s.name)=lower('Massage') limit 1)
  and lower(so.name)=lower('Standard');

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Head Massage — Coconut Oil — 30 min', 800, 'fixed', 30, 0, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Head Massage — Coconut Oil — 30 min'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Head Massage — Coconut Oil — 45 min', 1000, 'fixed', 45, 1, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Head Massage — Coconut Oil — 45 min'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Head Massage — Olive Oil — 30 min', 1000, 'fixed', 30, 2, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Head Massage — Olive Oil — 30 min'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Head Massage — Olive Oil — 45 min', 1200, 'fixed', 45, 3, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Head Massage — Olive Oil — 45 min'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Neck & Shoulder — 30 min', 800, 'fixed', 30, 4, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Neck & Shoulder — 30 min'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Neck & Shoulder — 45 min', 1000, 'fixed', 45, 5, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Neck & Shoulder — 45 min'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Arms Massage — 20 min', 600, 'fixed', 20, 6, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Arms Massage — 20 min'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Arms Massage — 30 min', 800, 'fixed', 30, 7, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Arms Massage — 30 min'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Foot Massage — 30 min', 1000, 'fixed', 30, 8, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Foot Massage — 30 min'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Foot Massage — 45 min', 1200, 'fixed', 45, 9, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Foot Massage — 45 min'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Face Massage — 30 min', 600, 'fixed', 30, 10, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Face Massage — 30 min'));

insert into public.service_options(service_id,name,price,price_type,duration_minutes,display_order,active)
select s.id, 'Face Massage — 45 min', 1000, 'fixed', 45, 11, true
from public.services s
where lower(s.name)=lower('Massage')
  and not exists (select 1 from public.service_options so where so.service_id=s.id and lower(so.name)=lower('Face Massage — 45 min'));

update public.services s
set price=coalesce((select min(so.price) from public.service_options so where so.service_id=s.id and so.active=true),0),
    duration_minutes=coalesce((select min(so.duration_minutes) from public.service_options so where so.service_id=s.id and so.active=true),30),
    updated_at=now()
where lower(s.name)=lower('Massage');

-- Temporary test availability: 10:00–20:00 every day where a stylist has no existing schedule.
insert into public.working_hours(stylist_id, day_of_week, start_time, end_time)
select st.id, d.day_of_week, '10:00'::time, '20:00'::time
from public.stylists st cross join generate_series(0,6) as d(day_of_week)
where st.active=true and st.deleted_at is null
and not exists (select 1 from public.working_hours wh where wh.stylist_id=st.id and wh.day_of_week=d.day_of_week);

-- Temporary test compatibility: link existing active stylists to every active menu service.
insert into public.stylist_services(stylist_id, service_id)
select st.id, s.id
from public.stylists st cross join public.services s
where st.active=true and st.deleted_at is null and s.active=true and s.deleted_at is null
and not exists (select 1 from public.stylist_services ss where ss.stylist_id=st.id and ss.service_id=s.id);
