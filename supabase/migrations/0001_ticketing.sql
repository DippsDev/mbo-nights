-- MBO ticketing: tables, stock-safe order functions, admin actions.
--
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run: tables use IF NOT EXISTS and functions are replaced.
--
-- Security model: Row Level Security is ON for every table with NO policies,
-- so the publishable key can't read or write tables directly. Everything goes
-- through the functions below, which validate input and run as the owner.
-- Admin functions also require a signed-in user listed in public.admins.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tables --

create table if not exists public.events (
  id          text primary key,
  title       text not null,
  date_label  text not null,
  time_label  text not null,
  venue       text not null,
  on_sale     boolean not null default true
);

create table if not exists public.ticket_tiers (
  event_id  text not null references public.events (id) on delete cascade,
  id        text not null,
  name      text not null,
  price     integer not null check (price >= 0),
  capacity  integer not null check (capacity >= 0),
  primary key (event_id, id)
);

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  ref               text not null unique,
  -- Secret used in the customer's order link; never guessable like `ref`.
  token             uuid not null unique default gen_random_uuid(),
  status            text not null default 'awaiting_payment'
                    check (status in ('awaiting_payment', 'awaiting_confirmation',
                                      'confirmed', 'rejected', 'expired')),
  buyer_name        text not null,
  buyer_phone       text not null,
  buyer_email       text not null,
  total             integer not null,
  payment_note      text,
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null,
  reported_paid_at  timestamptz,
  resolved_at       timestamptz,
  resolved_by       uuid
);

create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_phone_idx on public.orders (buyer_phone);

create table if not exists public.order_lines (
  order_id    uuid not null references public.orders (id) on delete cascade,
  event_id    text not null,
  tier_id     text not null,
  qty         integer not null check (qty between 1 and 10),
  unit_price  integer not null,
  primary key (order_id, event_id, tier_id),
  foreign key (event_id, tier_id) references public.ticket_tiers (event_id, id)
);

create index if not exists order_lines_tier_idx on public.order_lines (event_id, tier_id);

create table if not exists public.tickets (
  code           text primary key,
  order_id       uuid not null references public.orders (id) on delete cascade,
  event_id       text not null,
  tier_id        text not null,
  checked_in_at  timestamptz,
  foreign key (event_id, tier_id) references public.ticket_tiers (event_id, id)
);

create index if not exists tickets_order_idx on public.tickets (order_id);

create table if not exists public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade
);

alter table public.events       enable row level security;
alter table public.ticket_tiers enable row level security;
alter table public.orders       enable row level security;
alter table public.order_lines  enable row level security;
alter table public.tickets      enable row level security;
alter table public.admins       enable row level security;

-- --------------------------------------------------------------- helpers --

-- Random code without 0/O/1/I/L so it survives being read over the phone.
create or replace function public._code(n integer)
returns text
language plpgsql volatile
set search_path = public, extensions
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea := gen_random_bytes(n);
  result text := '';
begin
  for i in 0 .. n - 1 loop
    result := result || substr(alphabet, (get_byte(b, i) % 31) + 1, 1);
  end loop;
  return result;
end $$;

-- Tickets currently counted against a tier's capacity.
create or replace function public._held(p_event text, p_tier text)
returns integer
language sql stable
set search_path = public
as $$
  select coalesce(sum(l.qty), 0)::int
  from order_lines l
  join orders o on o.id = l.order_id
  where l.event_id = p_event
    and l.tier_id = p_tier
    and (o.status in ('awaiting_confirmation', 'confirmed')
         or (o.status = 'awaiting_payment' and o.expires_at > now()));
$$;

create or replace function public._expire_stale()
returns void
language sql volatile
set search_path = public
as $$
  update orders set status = 'expired', resolved_at = now()
  where status = 'awaiting_payment' and expires_at <= now();
$$;

create or replace function public._fail(msg text)
returns void
language plpgsql
as $$ begin raise exception using errcode = 'P0001', message = msg; end $$;

create or replace function public._order_json(p_id uuid)
returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'ref', o.ref,
    'token', o.token,
    'status', o.status,
    'buyer', jsonb_build_object('name', o.buyer_name, 'phone', o.buyer_phone, 'email', o.buyer_email),
    'total', o.total,
    'createdAt', o.created_at,
    'expiresAt', o.expires_at,
    'paymentNote', o.payment_note,
    'reportedPaidAt', o.reported_paid_at,
    'resolvedAt', o.resolved_at,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nightId', l.event_id, 'tierId', l.tier_id, 'qty', l.qty, 'unitPrice', l.unit_price,
        'title', e.title, 'tierName', t.name, 'date', e.date_label, 'time', e.time_label,
        'venue', e.venue) order by l.event_id, l.tier_id)
      from order_lines l
      join events e on e.id = l.event_id
      join ticket_tiers t on t.event_id = l.event_id and t.id = l.tier_id
      where l.order_id = o.id), '[]'::jsonb),
    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', k.code, 'nightId', k.event_id, 'tierId', k.tier_id,
        'title', e.title, 'tierName', t.name, 'date', e.date_label, 'time', e.time_label,
        'venue', e.venue, 'checkedInAt', k.checked_in_at) order by k.event_id, k.tier_id, k.code)
      from tickets k
      join events e on e.id = k.event_id
      join ticket_tiers t on t.event_id = k.event_id and t.id = k.tier_id
      where k.order_id = o.id), '[]'::jsonb)
  )
  from orders o
  where o.id = p_id;
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$ select exists (select 1 from admins where user_id = auth.uid()); $$;

-- -------------------------------------------------------- public: stock --

create or replace function public.tier_stock()
returns table (event_id text, tier_id text, name text, price integer, remaining integer)
language sql stable security definer
set search_path = public
as $$
  select t.event_id, t.id, t.name, t.price,
         case when e.on_sale then greatest(0, t.capacity - _held(t.event_id, t.id)) else 0 end
  from ticket_tiers t
  join events e on e.id = t.event_id
  order by t.event_id, t.price;
$$;

-- ---------------------------------------------------- public: ordering --

create or replace function public.create_order(
  p_name text, p_phone text, p_email text, p_items jsonb
)
returns jsonb
language plpgsql volatile security definer
set search_path = public, extensions
as $$
declare
  v_name   text := btrim(coalesce(p_name, ''));
  v_phone  text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_line   record;
  v_left   integer;
  v_total  integer := 0;
  v_ref    text;
  v_id     uuid;
begin
  if v_phone like '267%' and length(v_phone) > 8 then
    v_phone := substr(v_phone, 4);
  end if;

  if length(v_name) < 2 or length(v_name) > 80 then
    perform _fail('Enter the name the tickets should be under.');
  end if;
  if v_phone !~ '^\d{8}$' then
    perform _fail('Enter an 8-digit Botswana cell number.');
  end if;
  if length(v_email) > 200 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    perform _fail('Enter a valid email.');
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 10 then
    perform _fail('There are no tickets in your bag.');
  end if;

  -- Stops one person reserving the whole room with throwaway orders.
  if (select count(*) from orders
      where buyer_phone = v_phone and status = 'awaiting_payment' and expires_at > now()) >= 3 then
    perform _fail('You already have 3 unpaid orders. Pay or cancel one first.');
  end if;

  create temp table _items on commit drop as
    select i->>'nightId' as event_id,
           i->>'tierId'  as tier_id,
           coalesce(sum((i->>'qty')::int), 0)::int as qty
    from jsonb_array_elements(p_items) i
    group by 1, 2;

  -- Lock the tiers being bought (in a fixed order) so two buyers can't both
  -- take the last ticket.
  perform 1 from ticket_tiers t
  join _items x on x.event_id = t.event_id and x.tier_id = t.id
  order by t.event_id, t.id
  for update of t;

  for v_line in
    select x.event_id, x.tier_id, x.qty, t.name, t.price, t.capacity, e.title, e.on_sale
    from _items x
    left join ticket_tiers t on t.event_id = x.event_id and t.id = x.tier_id
    left join events e on e.id = x.event_id
  loop
    if v_line.name is null or not v_line.on_sale then
      perform _fail('One of those nights is no longer on sale.');
    end if;
    if v_line.qty < 1 or v_line.qty > 10 then
      perform _fail(format('You can buy up to 10 %s tickets per order.', v_line.name));
    end if;
    v_left := greatest(0, v_line.capacity - _held(v_line.event_id, v_line.tier_id));
    if v_line.qty > v_left then
      perform _fail(case when v_left = 0
        then format('%s %s just sold out.', v_line.title, v_line.name)
        else format('Only %s %s left for %s.', v_left, v_line.name, v_line.title) end);
    end if;
    v_total := v_total + v_line.qty * v_line.price;
  end loop;

  loop
    v_ref := 'MBO-' || _code(4);
    exit when not exists (select 1 from orders where ref = v_ref);
  end loop;

  insert into orders (ref, buyer_name, buyer_phone, buyer_email, total, expires_at)
  values (v_ref, v_name, v_phone, v_email, v_total, now() + interval '120 minutes')
  returning id into v_id;

  insert into order_lines (order_id, event_id, tier_id, qty, unit_price)
  select v_id, x.event_id, x.tier_id, x.qty, t.price
  from _items x
  join ticket_tiers t on t.event_id = x.event_id and t.id = x.tier_id;

  return _order_json(v_id);
exception
  when invalid_text_representation or numeric_value_out_of_range then
    perform _fail('That order didn''t look right. Refresh and try again.');
end $$;

create or replace function public.get_order(p_token text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id from orders where token::text = lower(btrim(p_token));
  if v_id is null then return null; end if;
  update orders set status = 'expired', resolved_at = now()
  where id = v_id and status = 'awaiting_payment' and expires_at <= now();
  return _order_json(v_id);
end $$;

-- Customer lookup needs BOTH the reference and the phone it was booked with.
create or replace function public.find_order(p_ref text, p_phone text)
returns text
language plpgsql stable security definer
set search_path = public
as $$
declare v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if v_phone like '267%' and length(v_phone) > 8 then v_phone := substr(v_phone, 4); end if;
  return (select token::text from orders
          where ref = upper(btrim(p_ref)) and buyer_phone = v_phone);
end $$;

create or replace function public.report_paid(p_token text, p_note text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare o orders%rowtype;
begin
  select * into o from orders where token::text = lower(btrim(p_token)) for update;
  if o.id is null then perform _fail('Order not found.'); end if;
  if o.status = 'awaiting_payment' and o.expires_at <= now() then
    update orders set status = 'expired', resolved_at = now() where id = o.id;
    perform _fail('This reservation expired. If you already paid, contact us with your reference.');
  end if;
  if o.status <> 'awaiting_payment' then
    perform _fail(case o.status
      when 'expired' then 'This reservation expired. If you already paid, contact us with your reference.'
      else 'This order has already been reported as paid.' end);
  end if;
  update orders
     set status = 'awaiting_confirmation',
         payment_note = nullif(left(btrim(coalesce(p_note, '')), 120), ''),
         reported_paid_at = now()
   where id = o.id;
  return _order_json(o.id);
end $$;

create or replace function public.cancel_order(p_token text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare v_id uuid;
begin
  update orders set status = 'expired', resolved_at = now()
  where token::text = lower(btrim(p_token)) and status = 'awaiting_payment'
  returning id into v_id;
  if v_id is null then
    select id into v_id from orders where token::text = lower(btrim(p_token));
  end if;
  return _order_json(v_id);
end $$;

-- ------------------------------------------------------------ admin only --

create or replace function public.admin_list_orders()
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
begin
  if not is_admin() then perform _fail('Not allowed.'); end if;
  perform _expire_stale();
  return coalesce((
    select jsonb_agg(_order_json(id) order by created_at desc)
    from (select id, created_at from orders order by created_at desc limit 500) s
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_sales()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not is_admin() then perform _fail('Not allowed.'); end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'nightId', t.event_id, 'title', e.title, 'tierName', t.name, 'capacity', t.capacity,
      'sold', coalesce(s.sold, 0),
      'held', _held(t.event_id, t.id) - coalesce(s.sold, 0)) order by e.id, t.price)
    from ticket_tiers t
    join events e on e.id = t.event_id
    left join lateral (
      select sum(l.qty)::int as sold
      from order_lines l join orders o on o.id = l.order_id
      where l.event_id = t.event_id and l.tier_id = t.id and o.status = 'confirmed'
    ) s on true
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_confirm(p_ref text)
returns jsonb
language plpgsql volatile security definer
set search_path = public, extensions
as $$
declare
  o orders%rowtype;
  v_line record;
  v_left integer;
  v_holding boolean;
begin
  if not is_admin() then perform _fail('Not allowed.'); end if;
  select * into o from orders where ref = upper(btrim(p_ref)) for update;
  if o.id is null then perform _fail('Order not found.'); end if;
  if o.status = 'confirmed' then perform _fail('This order is already confirmed.'); end if;

  v_holding := o.status = 'awaiting_confirmation'
               or (o.status = 'awaiting_payment' and o.expires_at > now());

  -- Late payment on an expired/rejected order: only confirm if seats remain.
  if not v_holding then
    perform 1 from ticket_tiers t
    join order_lines l on l.event_id = t.event_id and l.tier_id = t.id
    where l.order_id = o.id
    order by t.event_id, t.id
    for update of t;

    for v_line in
      select l.event_id, l.tier_id, l.qty, t.capacity, t.name
      from order_lines l join ticket_tiers t on t.event_id = l.event_id and t.id = l.tier_id
      where l.order_id = o.id
    loop
      v_left := v_line.capacity - _held(v_line.event_id, v_line.tier_id);
      if v_line.qty > v_left then
        perform _fail(format('Not enough %s left to confirm this late order (%s left).',
                             v_line.name, greatest(v_left, 0)));
      end if;
    end loop;
  end if;

  insert into tickets (code, order_id, event_id, tier_id)
  select 'MBO-T-' || _code(10), o.id, l.event_id, l.tier_id
  from order_lines l, generate_series(1, l.qty)
  where l.order_id = o.id;

  update orders set status = 'confirmed', resolved_at = now(), resolved_by = auth.uid()
  where id = o.id;
  return _order_json(o.id);
end $$;

create or replace function public.admin_reject(p_ref text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare o orders%rowtype;
begin
  if not is_admin() then perform _fail('Not allowed.'); end if;
  select * into o from orders where ref = upper(btrim(p_ref)) for update;
  if o.id is null then perform _fail('Order not found.'); end if;
  if o.status = 'confirmed' then perform _fail('This order is already confirmed.'); end if;
  update orders set status = 'rejected', resolved_at = now(), resolved_by = auth.uid()
  where id = o.id;
  return _order_json(o.id);
end $$;

-- ------------------------------------------------------------ permissions --

revoke all on all functions in schema public from public, anon, authenticated;

grant execute on function public.tier_stock()                          to anon, authenticated;
grant execute on function public.create_order(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.get_order(text)                       to anon, authenticated;
grant execute on function public.find_order(text, text)                to anon, authenticated;
grant execute on function public.report_paid(text, text)               to anon, authenticated;
grant execute on function public.cancel_order(text)                    to anon, authenticated;
grant execute on function public.is_admin()                            to authenticated;
grant execute on function public.admin_list_orders()                   to authenticated;
grant execute on function public.admin_sales()                         to authenticated;
grant execute on function public.admin_confirm(text)                   to authenticated;
grant execute on function public.admin_reject(text)                    to authenticated;

-- New functions created later should not be callable by default.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ------------------------------------------------------------------ seed --
-- Mirrors src/data.ts. Edit prices/capacity here (or in Table Editor) —
-- the database is what checkout charges, not data.ts.

insert into public.events (id, title, date_label, time_label, venue) values
  ('night-01', 'Ponds Live',        '19 Sep 2026', '20:00', 'The Ponds'),
  ('night-02', 'House of Habanos',  '03 Oct 2026', '22:00', 'Bull & Bush'),
  ('night-03', 'Bahama Live',       '17 Oct 2026', '21:00', 'Bahama Lounge'),
  ('night-04', '50two Sessions',    '31 Oct 2026', '21:30', 'Table50two')
on conflict (id) do update set
  title = excluded.title, date_label = excluded.date_label,
  time_label = excluded.time_label, venue = excluded.venue;

insert into public.ticket_tiers (event_id, id, name, price, capacity) values
  ('night-01', 'general', 'General', 150,  80),
  ('night-01', 'vip',     'VIP',     280,  20),
  ('night-02', 'general', 'General', 150, 180),
  ('night-02', 'vip',     'VIP',     280,  40),
  ('night-03', 'general', 'General', 180, 100),
  ('night-03', 'vip',     'VIP',     320,  24),
  ('night-04', 'general', 'General', 160,  60),
  ('night-04', 'vip',     'VIP',     350,  18)
on conflict (event_id, id) do update set
  name = excluded.name, price = excluded.price, capacity = excluded.capacity;

-- ----------------------------------------------------------------- admin --
-- 1. Supabase → Authentication → Users → Add user (email + password, auto-confirm).
-- 2. Then run this line with that email:
-- insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
