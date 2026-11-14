-- MBO ticketing: descriptions for every table and column.
-- Run in Supabase → SQL Editor after 0002. Safe to re-run.
-- Changes no data or behaviour; the text shows up in the Table Editor.
--
-- How the tables fit together:
--
--   events ──< ticket_tiers ──< order_lines >── orders ──< tickets
--                     └──────────────< tickets ─────┘
--   admins (who may use admin_* functions)
--
--   An event has tiers (General, VIP). A customer's order has one line per
--   tier bought. When an admin confirms the order, one ticket row is issued
--   per seat, and that ticket is scanned at the door.

-- ---------------------------------------------------------------- events --
comment on table  public.events is
  'One MBO night. Shown on the site as a "night" (nightId = events.id).';
comment on column public.events.id         is 'Short slug, e.g. night-01. Matches src/data.ts.';
comment on column public.events.title      is 'Display name, e.g. Ponds Live.';
comment on column public.events.date_label is 'Date as shown to customers (text, not a real date).';
comment on column public.events.time_label is 'Start time as shown to customers.';
comment on column public.events.venue      is 'Venue name.';
comment on column public.events.on_sale    is 'False = hidden from stock and cannot be ordered.';

-- ---------------------------------------------------------- ticket_tiers --
comment on table  public.ticket_tiers is
  'Ticket types for an event (General, VIP) with their price and seat count.';
comment on column public.ticket_tiers.event_id is 'Which event (events.id).';
comment on column public.ticket_tiers.id       is 'Tier slug, unique within the event, e.g. vip.';
comment on column public.ticket_tiers.name     is 'Display name, e.g. VIP.';
comment on column public.ticket_tiers.price    is 'Price per ticket in pula. This is what checkout charges.';
comment on column public.ticket_tiers.capacity is 'Total seats in this tier, including ones already sold.';

-- ---------------------------------------------------------------- orders --
comment on table  public.orders is
  'A customer purchase. Flow: awaiting_payment → awaiting_confirmation → confirmed, '
  'or ends as rejected / expired.';
comment on column public.orders.id               is 'Internal id.';
comment on column public.orders.ref              is 'Human reference the customer quotes, e.g. MBO-7KQP.';
comment on column public.orders.token            is 'Secret in the customer''s order link. Never share.';
comment on column public.orders.status           is 'awaiting_payment | awaiting_confirmation | confirmed | rejected | expired.';
comment on column public.orders.buyer_name       is 'Name the tickets are under.';
comment on column public.orders.buyer_phone      is '8-digit Botswana number, no +267.';
comment on column public.orders.buyer_email      is 'Lower-cased email.';
comment on column public.orders.total            is 'Order total in pula, fixed when the order was placed.';
comment on column public.orders.payment_note     is 'Note the customer left when reporting payment (max 120 chars).';
comment on column public.orders.created_at       is 'When the order was placed.';
comment on column public.orders.expires_at       is 'Unpaid orders release their seats after this time.';
comment on column public.orders.reported_paid_at is 'When the customer said they paid.';
comment on column public.orders.resolved_at      is 'When it was confirmed, rejected or expired.';
comment on column public.orders.resolved_by      is 'Admin user who confirmed or rejected (null if it expired).';

-- ----------------------------------------------------------- order_lines --
comment on table  public.order_lines is
  'What was bought in an order: one row per event + tier, with quantity.';
comment on column public.order_lines.order_id   is 'Which order (orders.id).';
comment on column public.order_lines.event_id   is 'Which event.';
comment on column public.order_lines.tier_id    is 'Which tier of that event.';
comment on column public.order_lines.qty        is 'Number of tickets (1–10).';
comment on column public.order_lines.unit_price is 'Price per ticket at time of order, in pula.';

-- --------------------------------------------------------------- tickets --
comment on table  public.tickets is
  'One row per admitted person. Created when an admin confirms the order.';
comment on column public.tickets.code          is 'Code on the ticket / QR, e.g. MBO-T-XXXXXXXXXX.';
comment on column public.tickets.order_id      is 'Order this ticket came from.';
comment on column public.tickets.event_id      is 'Event it gets you into.';
comment on column public.tickets.tier_id       is 'Tier (General, VIP).';
comment on column public.tickets.checked_in_at is 'When it was scanned at the door; null = not used yet.';
comment on column public.tickets.checked_in_by is 'Admin user who scanned it.';

-- ---------------------------------------------------------------- admins --
comment on table  public.admins is
  'Signed-in users allowed to use the admin dashboard and door scanner.';
comment on column public.admins.user_id is 'Supabase Auth user (auth.users.id).';
