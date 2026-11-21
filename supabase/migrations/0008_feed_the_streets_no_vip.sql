-- FEED THE STREETS is free entry with one tier; drop VIP. Mirrors src/data.ts.
-- Skipped if anyone already ordered VIP, so no order loses its line.
delete from public.ticket_tiers t
where t.event_id = 'night-01' and t.id = 'vip'
  and not exists (
    select 1 from public.order_lines l where l.event_id = t.event_id and l.tier_id = t.id
  );
