-- Throttle the public order lookups so a reference, phone or email can't be
-- brute-forced. Each miss is logged per key; after 10 misses in 15 minutes
-- that key is locked until the window passes.
--
-- A miss is recorded on a call that RETURNS (not raises), so the insert commits.
-- The lockout check runs first and raises.

create table if not exists public.lookup_misses (
  key text not null,
  at  timestamptz not null default now()
);
create index if not exists lookup_misses_key_at on public.lookup_misses (key, at);
alter table public.lookup_misses enable row level security;

create or replace function public._lookup_locked(p_keys text[])
returns void
language plpgsql
set search_path = public
as $$
begin
  delete from lookup_misses where at < now() - interval '1 day';
  if exists (
    select 1 from lookup_misses
    where key = any(p_keys) and at > now() - interval '15 minutes'
    group by key having count(*) >= 10
  ) then
    perform _fail('Too many attempts. Try again in 15 minutes.');
  end if;
end $$;

create or replace function public.find_order(p_ref text, p_phone text)
returns text
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_ref   text := upper(btrim(coalesce(p_ref, '')));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_token text;
begin
  if v_phone like '267%' and length(v_phone) > 8 then v_phone := substr(v_phone, 4); end if;
  perform _lookup_locked(array['ref:' || v_ref, 'phone:' || v_phone]);

  select token::text into v_token from orders
  where ref = v_ref and buyer_phone = v_phone;

  if v_token is null then
    insert into lookup_misses (key) values ('ref:' || v_ref), ('phone:' || v_phone);
  end if;
  return v_token;
end $$;

create or replace function public.find_orders(p_phone text, p_email text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_out   jsonb;
begin
  if v_phone like '267%' and length(v_phone) > 8 then v_phone := substr(v_phone, 4); end if;
  if v_phone !~ '^\d{8}$' or v_email = '' then return '[]'::jsonb; end if;
  perform _lookup_locked(array['phone:' || v_phone, 'email:' || v_email]);

  update orders set status = 'expired', resolved_at = now()
  where buyer_phone = v_phone and buyer_email = v_email
    and status = 'awaiting_payment' and expires_at <= now();

  v_out := coalesce((
    select jsonb_agg(_order_json(o.id) order by o.created_at desc)
    from (select id, created_at from orders
          where buyer_phone = v_phone and buyer_email = v_email
          order by created_at desc limit 20) o
  ), '[]'::jsonb);

  if v_out = '[]'::jsonb then
    insert into lookup_misses (key) values ('phone:' || v_phone), ('email:' || v_email);
  end if;
  return v_out;
end $$;

revoke all on function public._lookup_locked(text[]) from public, anon, authenticated;
grant execute on function public.find_order(text, text)  to anon, authenticated;
grant execute on function public.find_orders(text, text) to anon, authenticated;
