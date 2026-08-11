create extension if not exists btree_gist;
create type public.user_role as enum('customer','admin');
create type public.category as enum('male','female','unisex');
create type public.appointment_status as enum('confirmed','completed','cancelled','no_show');
create type public.discount_type as enum('percentage','fixed');
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,name text not null,email text not null,role public.user_role not null default 'customer',created_at timestamptz default now());
create table public.services(id uuid primary key default gen_random_uuid(),name text not null,category public.category not null,description text,price numeric(10,2) not null check(price>=0),duration_minutes int not null check(duration_minutes between 1 and 720),active boolean default true,deleted_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
create table public.stylists(id uuid primary key default gen_random_uuid(),name text not null,bio text,category public.category not null,active boolean default true,deleted_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
create table public.stylist_services(stylist_id uuid references public.stylists(id) on delete cascade,service_id uuid references public.services(id) on delete cascade,primary key(stylist_id,service_id));
create table public.working_hours(id uuid primary key default gen_random_uuid(),stylist_id uuid references public.stylists(id) on delete cascade,day_of_week int check(day_of_week between 0 and 6),start_time time not null,end_time time not null,check(end_time>start_time));
create table public.blocked_periods(id uuid primary key default gen_random_uuid(),stylist_id uuid references public.stylists(id) on delete cascade,start_time timestamptz not null,end_time timestamptz not null,reason text,check(end_time>start_time));
create table public.salon_closures(id uuid primary key default gen_random_uuid(),closure_date date unique not null,close_time time,reason text);
create table public.coupons(id uuid primary key default gen_random_uuid(),code text unique not null,discount_type public.discount_type not null,discount_value numeric(10,2) not null check(discount_value>0),minimum_amount numeric(10,2) default 0,usage_limit int,used_count int default 0,expires_at timestamptz,active boolean default true,created_at timestamptz default now());
create table public.appointments(id uuid primary key default gen_random_uuid(),customer_id uuid references public.profiles(id) on delete restrict not null,stylist_id uuid references public.stylists(id) on delete restrict not null,service_id uuid references public.services(id) on delete restrict not null,start_time timestamptz not null,end_time timestamptz not null,price numeric(10,2) not null,status public.appointment_status default 'confirmed',coupon_id uuid references public.coupons(id) on delete set null,created_at timestamptz default now(),check(end_time>start_time));
alter table public.appointments add constraint appointments_no_overlap exclude using gist(stylist_id with =,tstzrange(start_time,end_time,'[)') with &&) where(status='confirmed');
create table public.coupon_usage(id uuid primary key default gen_random_uuid(),coupon_id uuid references public.coupons(id) on delete cascade,customer_id uuid references public.profiles(id) on delete cascade,appointment_id uuid references public.appointments(id) on delete cascade,unique(coupon_id,appointment_id));
create table public.audit_logs(id bigint generated always as identity primary key,admin_id uuid references public.profiles(id) on delete set null,action text not null,entity text not null,entity_id uuid,old_data jsonb,new_data jsonb,created_at timestamptz default now());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.profiles(id,name,email) values(new.id,coalesce(new.raw_user_meta_data->>'name','Customer'),new.email);return new;end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;alter table public.services enable row level security;alter table public.stylists enable row level security;alter table public.stylist_services enable row level security;alter table public.working_hours enable row level security;alter table public.blocked_periods enable row level security;alter table public.salon_closures enable row level security;alter table public.appointments enable row level security;alter table public.coupons enable row level security;alter table public.coupon_usage enable row level security;alter table public.audit_logs enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
create policy "profiles self admin" on public.profiles for select using(id=auth.uid() or public.is_admin());
create policy "services public admin" on public.services for select using((active and deleted_at is null) or public.is_admin());
create policy "services admin write" on public.services for all using(public.is_admin()) with check(public.is_admin());
create policy "stylists public admin" on public.stylists for select using((active and deleted_at is null) or public.is_admin());
create policy "stylists admin write" on public.stylists for all using(public.is_admin()) with check(public.is_admin());
create policy "stylist services read" on public.stylist_services for select using(true);
create policy "stylist services admin" on public.stylist_services for all using(public.is_admin()) with check(public.is_admin());
create policy "working admin" on public.working_hours for all using(public.is_admin()) with check(public.is_admin());
create policy "blocks admin" on public.blocked_periods for all using(public.is_admin()) with check(public.is_admin());
create policy "closures admin" on public.salon_closures for all using(public.is_admin()) with check(public.is_admin());
create policy "appointments own admin" on public.appointments for select using(customer_id=auth.uid() or public.is_admin());
create policy "appointments admin update" on public.appointments for update using(public.is_admin()) with check(public.is_admin());
create policy "coupons admin" on public.coupons for all using(public.is_admin()) with check(public.is_admin());
create policy "coupon usage admin" on public.coupon_usage for all using(public.is_admin()) with check(public.is_admin());
create policy "audit admin" on public.audit_logs for select using(public.is_admin());

create or replace function public.create_appointment(p_customer_id uuid,p_service_id uuid,p_stylist_id uuid,p_start_time timestamptz,p_coupon_code text default null) returns public.appointments language plpgsql security definer set search_path=public as $$
declare s public.services; st public.stylists; e timestamptz; price numeric(10,2); c public.coupons; r public.appointments;
begin
if auth.uid()<>p_customer_id then raise exception 'Not authorized';end if;
select * into s from services where id=p_service_id and active and deleted_at is null;if not found then raise exception 'Service unavailable';end if;
select * into st from stylists where id=p_stylist_id and active and deleted_at is null;if not found then raise exception 'Stylist unavailable';end if;
if not exists(select 1 from stylist_services where stylist_id=p_stylist_id and service_id=p_service_id) then raise exception 'Stylist does not provide this service';end if;
e:=p_start_time+make_interval(mins=>s.duration_minutes);if p_start_time<=now() then raise exception 'Appointment must be in the future';end if;
if exists(select 1 from blocked_periods where (stylist_id=p_stylist_id or stylist_id is null) and tstzrange(start_time,end_time,'[)') && tstzrange(p_start_time,e,'[)')) then raise exception 'That period is blocked';end if;
price:=s.price;
if p_coupon_code is not null and trim(p_coupon_code)<>'' then select * into c from coupons where upper(code)=upper(trim(p_coupon_code)) and active and (expires_at is null or expires_at>now()) for update;if not found then raise exception 'Invalid coupon';end if;if price<c.minimum_amount then raise exception 'Minimum booking amount not met';end if;if c.usage_limit is not null and c.used_count>=c.usage_limit then raise exception 'Coupon limit reached';end if;if c.discount_type='percentage' then price:=greatest(0,price-round(price*c.discount_value/100,2));else price:=greatest(0,price-c.discount_value);end if;end if;
insert into appointments(customer_id,stylist_id,service_id,start_time,end_time,price,coupon_id) values(p_customer_id,p_stylist_id,p_service_id,p_start_time,e,price,c.id) returning * into r;
if c.id is not null then update coupons set used_count=used_count+1 where id=c.id;insert into coupon_usage(coupon_id,customer_id,appointment_id) values(c.id,p_customer_id,r.id);end if;
return r;
exception when exclusion_violation then raise exception 'That slot was just booked. Please choose another time.';
end;$$;
revoke all on function public.create_appointment(uuid,uuid,uuid,timestamptz,text) from public;grant execute on function public.create_appointment(uuid,uuid,uuid,timestamptz,text) to authenticated;
