import { PAY_METHODS } from '../lib/tickets'

/** Row of buttons for choosing how to pay. Renders nothing when only one method is set up. */
export default function PayMethodPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  if (PAY_METHODS.length < 2) return null
  return (
    <div className="pay-methods" role="radiogroup" aria-label="Payment method">
      {PAY_METHODS.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={m.id === value}
          disabled={m.disabled}
          title={m.disabled ? `${m.label} — coming soon` : undefined}
          className={`pay-method${m.id === value ? ' is-on' : ''}`}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
