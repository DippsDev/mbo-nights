import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useCart } from "../cart";
import PayMethodPicker from "../components/PayMethodPicker";
import {
  createOrder,
  HOLD_MINUTES,
  payMethod,
  saveOrderToken,
  TicketError,
  ticketRef,
} from "../lib/tickets";

export default function Checkout() {
  const { items, remove } = useCart();
  const navigate = useNavigate();
  const tickets = items.filter((i) => i.kind === "ticket");
  const total = tickets.reduce((n, i) => n + i.price * i.qty, 0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [payId, setPayId] = useState(payMethod().id);
  const pay = payMethod(payId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (tickets.length === 0 && !busy) return <Navigate to="/bag" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const order = await createOrder(
        { name, phone, email },
        tickets.map((i) => ({ ...ticketRef(i), qty: i.qty })),
      );
      saveOrderToken(order.token);
      tickets.forEach((i) => remove(i.key));
      navigate(`/order/${order.token}?pay=${pay.id}`, { replace: true });
    } catch (err) {
      setError(
        err instanceof TicketError
          ? err.message
          : "Something went wrong. Try again.",
      );
      setBusy(false);
    }
  };

  return (
    <main className="page flow">
      <header className="page-hero">
        <p className="kicker">Checkout · step 1 of 2</p>
        <h1 className="display lg">Your details</h1>
        <p className="serif">
          Tickets are issued to this name and sent to this number and email.
        </p>
      </header>
      <section className="section checkout-wrap" style={{ paddingTop: 0 }}>
        <form className="form checkout-split" onSubmit={submit} noValidate>
          <div className="checkout-main">
            <label className="field">
              <span>Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <div className="field-pair">
              <label className="field">
                <span>Cell number</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="71 234 567"
                  required
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
            </div>

            <fieldset className="field">
              <legend>
                <span>How will you pay?</span>
              </legend>
              <PayMethodPicker value={pay.id} onChange={setPayId} />
              <p className="demo-note">{pay.how}</p>
            </fieldset>
          </div>

          <aside className="checkout-side" aria-label="Order summary">
            <div className="order-summary">
              {tickets.map((i) => (
                <div className="summary-row" key={i.key}>
                  <span>
                    {i.qty} × {i.name}
                    <span className="demo-note"> · {i.detail}</span>
                  </span>
                  <span>P{i.price * i.qty}</span>
                </div>
              ))}
              <div className="checkout-total">
                <span>Total</span>
                <strong>P{total}</strong>
              </div>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Reserving…" : `Reserve & pay with ${pay.label}`}
            </button>
            <p className="demo-note">
              Your tickets are held for {HOLD_MINUTES / 60} hours while you pay.{" "}
              <Link to="/bag">Back to bag</Link>
            </p>
          </aside>
        </form>
      </section>
    </main>
  );
}
