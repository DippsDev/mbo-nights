-- night-01 is now FEED THE STREETS, a free event. Mirrors src/data.ts.
update public.events
set title = 'FEED THE STREETS', date_label = '28 Nov 2026', time_label = '16:00',
    venue = 'G-West Industrial Warehouse'
where id = 'night-01';

update public.ticket_tiers set price = 0 where event_id = 'night-01';
