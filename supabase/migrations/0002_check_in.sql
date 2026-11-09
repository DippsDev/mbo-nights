-- MBO ticketing: door check-in.
-- Run in Supabase → SQL Editor after 0001. Safe to re-run.

alter table public.tickets add column if not exists checked_in_by uuid;

create index if not exists tickets_event_idx on public.tickets (event_id, checked_in_at);

create or replace function public._ticket_json(p_code text)
returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'code', k.code, 'nightId', k.event_id, 'tierId', k.tier_id,
    'title', e.title, 'tierName', t.name, 'holder', o.buyer_name, 'ref', o.ref,
    'orderStatus', o.status, 'checkedInAt', k.checked_in_at)
  from tickets k
  join orders o on o.id = k.order_id
  join events e on e.id = k.event_id
  join ticket_tiers t on t.event_id = k.event_id and t.id = k.tier_id
  where k.code = p_code;
$$;

create or replace function public._door_counts(p_event text)
returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'checkedIn', count(*) filter (where k.checked_in_at is not null),
    'total', count(*))
  from tickets k
  join orders o on o.id = k.order_id
  where k.event_id = p_event and o.status = 'confirmed';
$$;

-- Result is one of: ok | already | wrong_event | not_valid | not_found.
-- Only `ok` changes anything.
create or replace function public.admin_check_in(p_code text, p_event text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  k tickets%rowtype;
  v_status text;
begin
  if not is_admin() then perform _fail('Not allowed.'); end if;
  if v_code !~ '^MBO-T-' then v_code := 'MBO-T-' || v_code; end if;

  select * into k from tickets where code = v_code for update;
  if k.code is null then
    return jsonb_build_object('result', 'not_found', 'code', v_code,
                              'counts', _door_counts(p_event));
  end if;

  select status into v_status from orders where id = k.order_id;

  if v_status <> 'confirmed' then
    return jsonb_build_object('result', 'not_valid', 'ticket', _ticket_json(k.code),
                              'counts', _door_counts(p_event));
  end if;
  if k.event_id <> p_event then
    return jsonb_build_object('result', 'wrong_event', 'ticket', _ticket_json(k.code),
                              'counts', _door_counts(p_event));
  end if;
  if k.checked_in_at is not null then
    return jsonb_build_object('result', 'already', 'ticket', _ticket_json(k.code),
                              'counts', _door_counts(p_event));
  end if;

  update tickets set checked_in_at = now(), checked_in_by = auth.uid() where code = k.code;
  return jsonb_build_object('result', 'ok', 'ticket', _ticket_json(k.code),
                            'counts', _door_counts(p_event));
end $$;

-- For a mis-scan: lets that ticket in again.
create or replace function public.admin_undo_check_in(p_code text, p_event text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
begin
  if not is_admin() then perform _fail('Not allowed.'); end if;
  update tickets set checked_in_at = null, checked_in_by = null
  where code = upper(btrim(p_code));
  return _door_counts(p_event);
end $$;

create or replace function public.admin_door_counts(p_event text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not is_admin() then perform _fail('Not allowed.'); end if;
  return _door_counts(p_event);
end $$;

revoke all on function public._ticket_json(text)             from public, anon, authenticated;
revoke all on function public._door_counts(text)             from public, anon, authenticated;
revoke all on function public.admin_check_in(text, text)      from public, anon;
revoke all on function public.admin_undo_check_in(text, text) from public, anon;
revoke all on function public.admin_door_counts(text)         from public, anon;
grant execute on function public.admin_check_in(text, text)      to authenticated;
grant execute on function public.admin_undo_check_in(text, text) to authenticated;
grant execute on function public.admin_door_counts(text)         to authenticated;
