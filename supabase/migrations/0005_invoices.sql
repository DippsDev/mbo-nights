-- Email invoices (sent by the `send-invoice` edge function through Resend).
-- Records when an order's invoice went out so the admin page can show it.

alter table public.orders add column if not exists invoice_sent_at timestamptz;
comment on column public.orders.invoice_sent_at is 'When the emailed invoice was last sent (send-invoice edge function).';

-- Same as 0001 plus invoiceSentAt.
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
    'invoiceSentAt', o.invoice_sent_at,
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

-- One order by reference, admins only. Used by the edge function.
create or replace function public.admin_get_order(p_ref text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_admin() then perform _fail('Not allowed.'); end if;
  select id into v_id from orders where ref = upper(btrim(p_ref));
  if v_id is null then perform _fail('Order not found.'); end if;
  return _order_json(v_id);
end $$;

create or replace function public.admin_mark_invoiced(p_ref text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_admin() then perform _fail('Not allowed.'); end if;
  update orders set invoice_sent_at = now()
  where ref = upper(btrim(p_ref)) and status = 'confirmed'
  returning id into v_id;
  if v_id is null then perform _fail('Only confirmed orders can be invoiced.'); end if;
  return _order_json(v_id);
end $$;

grant execute on function public.admin_get_order(text)     to authenticated;
grant execute on function public.admin_mark_invoiced(text) to authenticated;
