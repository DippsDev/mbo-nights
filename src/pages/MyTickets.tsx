import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  findOrder,
  findOrders,
  getOrder,
  savedOrderTokens,
  keepOrderTokens,
  DEVICE_ORDER_LIMIT,
  saveOrderToken,
  STATUS_LABEL,
  TicketError,
  type Order,
} from "../lib/tickets";

/** What the customer should do next, per status. */
const NEXT: Record<Order["status"], string> = {
  awaiting_payment: "Pay & confirm",
  awaiting_confirmation: "View order",
  confirmed: "View tickets",
  rejected: "View order",
  expired: "View order",
};

function OrderList({ orders }: { orders: Order[] }) {
  return (
    <div className="product-boxes my-orders">
      {orders.map((o) => {
        const seats = o.lines.reduce((n, l) => n + l.qty, 0);
        const titles = [...new Set(o.lines.map((l) => l.title))].join(", ");
        return (
          <Link
            key={o.token}
            to={`/order/${o.token}`}
            className={`product-box my-order is-${o.status}`}
          >
            <span className="my-order-top">
              <span className="kicker">{o.ref}</span>
              <span className="my-order-status">{STATUS_LABEL[o.status]}</span>
            </span>
            <strong className="my-order-title">{titles || "Order"}</strong>
            <span className="demo-note">
              {seats} ticket{seats === 1 ? "" : "s"} · P{o.total} ·{" "}
              {new Date(o.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="link-arrow">{NEXT[o.status]} →</span>
          </Link>
        );
      })}
    </div>
  );
}

function useDeviceOrders() {
  const [tokens] = useState(savedOrderTokens);
  const [orders, setOrders] = useState<Order[] | undefined>(
    tokens.length ? undefined : [],
  );
  useEffect(() => {
    if (tokens.length === 0) return;
    void Promise.all(
      tokens.map((t) => getOrder(t).catch(() => null)),
    ).then((list) => {
      // null = couldn't load (offline etc.); don't forget orders over a bad connection.
      const failed = list.some((o) => o === null);
      // Newest 6 by order date; forget the rest (and any that no longer exist).
      const keep = list
        .filter((o): o is Order => Boolean(o))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, DEVICE_ORDER_LIMIT);
      if (!failed) keepOrderTokens(keep.map((o) => o.token));
      setOrders(keep);
    });
  }, [tokens]);
  return orders;
}

export default function MyTickets() {
  const navigate = useNavigate();
  const device = useDeviceOrders();

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
        list.forEach((o) => saveOrderToken(o.token));
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
        {device && device.length > 0 && (
          <>
            <h2 className="kicker">On this device</h2>
            <div className="device-orders">
              <OrderList orders={device} />
            </div>
          </>
        )}

        <div className="tickets-lookup">
          <div className="tickets-lookup-copy">
            <h2 className="kicker">
              {device?.length ? "Look up an order" : "Find your orders"}
            </h2>
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
                  {error}
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

        {found && found.length > 0 && <OrderList orders={found} />}
      </section>
    </main>
  );
}
