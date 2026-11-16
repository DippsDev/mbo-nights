import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  findOrder,
  findOrders,
  STATUS_LABEL,
  TicketError,
  type Order,
} from "../lib/tickets";
import { stubDate } from "../lib/date";

/** What the customer should do next, per status. */
const NEXT: Record<Order["status"], string> = {
  awaiting_payment: "Pay & confirm",
  awaiting_confirmation: "View order",
  confirmed: "View tickets",
  rejected: "View order",
  expired: "View order",
};

/** Orders grouped by what the customer needs to do; closed ones fold away. */
const GROUPS: {
  id: string;
  title: string;
  note: string;
  statuses: Order["status"][];
  closed?: boolean;
}[] = [
  {
    id: "confirmed",
    title: "Your tickets",
    note: "Paid and confirmed. Open one to show your QR codes at the door.",
    statuses: ["confirmed"],
  },
  {
    id: "pay",
    title: "To pay",
    note: "Seats are held until the timer runs out. Pay to keep them.",
    statuses: ["awaiting_payment"],
  },
  {
    id: "checking",
    title: "Being checked",
    note: "You have paid. We are matching your payment, usually within a few hours.",
    statuses: ["awaiting_confirmation"],
  },
  {
    id: "closed",
    title: "Past orders",
    note: "Expired or cancelled. These hold no seats.",
    statuses: ["rejected", "expired"],
    closed: true,
  },
];

function OrderTicket({ order }: { order: Order }) {
  const first = order.lines[0];
  const { day, month, weekday } = stubDate(first?.date ?? "");
  const seats = order.lines.reduce((n, l) => n + l.qty, 0);
  const titles = [...new Set(order.lines.map((l) => l.title))].join(" · ");
  const tiers = order.lines.map((l) => `${l.qty}× ${l.tierName}`).join(", ");
  const dead = order.status === "rejected" || order.status === "expired";
  return (
    <Link
      to={`/order/${order.token}`}
      className={`order-ticket is-${order.status}${dead ? " is-dead" : ""}`}
    >
      <span className="order-ticket-stub">
        <span className="order-ticket-small">{weekday}</span>
        <span className="order-ticket-day">{day || "—"}</span>
        <span className="order-ticket-small">{month}</span>
        {first?.time && <span className="order-ticket-time">{first.time}</span>}
      </span>
      <span className="order-ticket-body">
        <span className="order-ticket-top">
          <span className="kicker">{order.ref}</span>
          <span className="order-ticket-status">{STATUS_LABEL[order.status]}</span>
        </span>
        <strong className="display">{titles || "Order"}</strong>
        <span className="order-ticket-meta">
          {tiers}
          {first?.venue ? ` · ${first.venue}` : ""}
        </span>
        <span className="order-ticket-foot">
          <span className="link-arrow">{NEXT[order.status]} →</span>
          <span className="order-ticket-price">
            {seats} ticket{seats === 1 ? "" : "s"} · P{order.total}
          </span>
        </span>
      </span>
    </Link>
  );
}

function OrderGroups({ orders }: { orders: Order[] }) {
  return (
    <div className="order-groups">
      {GROUPS.map((g) => {
        const list = orders.filter((o) => g.statuses.includes(o.status));
        if (list.length === 0) return null;
        const head = (
          <>
            <h2 className="order-group-title">
              {g.title} <span className="order-group-count">{list.length}</span>
            </h2>
            <p className="order-group-note">{g.note}</p>
          </>
        );
        const body = (
          <div className="order-tickets">
            {list.map((o) => (
              <OrderTicket key={o.token} order={o} />
            ))}
          </div>
        );
        return g.closed ? (
          <details key={g.id} className="order-group is-closed">
            <summary>{head}</summary>
            {body}
          </details>
        ) : (
          <section key={g.id} className="order-group">
            {head}
            {body}
          </section>
        );
      })}
    </div>
  );
}

/** Pop-up with the customer's orders, grouped. Esc, the ✕ or the backdrop closes it. */
function OrdersPopup({ orders, onClose }: { orders: Order[]; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 240);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  });

  return createPortal(
    <div
      className={`orders-popup${closing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Your orders"
      onClick={close}
    >
      <div className="orders-popup-panel" onClick={(e) => e.stopPropagation()}>
        <div className="orders-popup-head">
          <p className="kicker">
            {orders.length} order{orders.length === 1 ? "" : "s"} found
          </p>
          <button type="button" className="orders-popup-close" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>
        <OrderGroups orders={orders} />
      </div>
    </div>,
    document.body,
  );
}

export default function MyTickets() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<"contact" | "ref">("contact");
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Order[] | undefined>(undefined);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "ref") {
        const token = await findOrder(ref, phone);
        if (token) return navigate(`/order/${token}`);
        setError("No order matches that reference and number.");
      } else {
        const list = await findOrders(phone, email);
        setFound(list);
        if (list.length === 0)
          setError("No orders match that number and email.");
      }
    } catch (err) {
      setError(
        err instanceof TicketError
          ? err.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page shop-page tickets-page">
      <header className="page-hero">
        <p className="kicker">Tickets</p>
        <h1 className="display lg">My tickets &amp; orders</h1>
        <p className="serif">
          Paid, unpaid or waiting on us — every order is here. Unpaid ones can
          still be paid until their hold runs out.
        </p>
      </header>

      <section className="section shop-section tickets-section">
        <div className="tickets-lookup">
          <div className="tickets-lookup-copy">
            <h2 className="kicker">Look up an order</h2>
            <p className="display">Find an order</p>
            <p className="serif">
              Use the cell number and email you booked with, or your order
              reference (it starts with MBO-).
            </p>
          </div>
          <div className="tickets-lookup-form">
            <div className="pay-methods" role="tablist">
              {(
                [
                  ["contact", "Cell + email"],
                  ["ref", "Reference"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  className={`pay-method${mode === id ? " is-on" : ""}`}
                  onClick={() => {
                    setMode(id);
                    setError("");
                    setFound(undefined);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <form className="form" onSubmit={submit}>
              {mode === "ref" && (
                <label className="field">
                  <span>Reference</span>
                  <input
                    value={ref}
                    onChange={(e) => setRef(e.target.value.toUpperCase())}
                    placeholder="MBO-XXXX"
                    autoCapitalize="characters"
                    required
                  />
                </label>
              )}
              <label className="field">
                <span>Cell number you booked with</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
              </label>
              {mode === "contact" && (
                <label className="field">
                  <span>Email you booked with</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}{" "}
                  <Link to="/help">Can’t find your order? Get help →</Link>
                </p>
              )}
              <button className="btn" type="submit" disabled={busy}>
                {busy
                  ? "Looking…"
                  : mode === "ref"
                    ? "Find order"
                    : "Find my orders"}
              </button>
            </form>
          </div>
        </div>

        {found && found.length > 0 && (
          <OrdersPopup orders={found} onClose={() => setFound(undefined)} />
        )}
      </section>
    </main>
  );
}
