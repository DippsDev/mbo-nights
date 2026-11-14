-- Lets a customer list ALL their orders (paid or not) without the reference,
-- by giving BOTH the cell number and the email they booked with.
-- Newest first, capped at 20. Unpaid orders past their hold are marked expired
-- on the way out, the same as get_order() does.
create or replace function public.find_orders(p_phone text, p_email text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_phone like '267%' and length(v_phone) > 8 then v_phone := substr(v_phone, 4); end if;
  if v_phone !~ '^\d{8}$' or v_email = '' then return '[]'::jsonb; end if;

  update orders set status = 'expired', resolved_at = now()
  where buyer_phone = v_phone and buyer_email = v_email
    and status = 'awaiting_payment' and expires_at <= now();

  return coalesce((
    select jsonb_agg(_order_json(o.id) order by o.created_at desc)
    from (select id, created_at from orders
          where buyer_phone = v_phone and buyer_email = v_email
          order by created_at desc limit 20) o
  ), '[]'::jsonb);
end $$;

grant execute on function public.find_orders(text, text) to anon, authenticated;
