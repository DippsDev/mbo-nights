import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { isAdmin, signIn, signOut, TicketError, useSession } from '../lib/tickets'

/** Shows a sign-in form until the visitor is a signed-in admin, then renders children. */
function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof TicketError ? err.message : 'Couldn’t sign in.')
      setBusy(false)
    }
  }

  return (
    <main className="page flow">
      <header className="page-hero">
        <p className="kicker">Administrator</p>
        <h1 className="display lg">Sign in</h1>
      </header>
      <section className="section checkout-wrap" style={{ paddingTop: 0 }}>
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default function AdminGate({ children }: { children: ReactNode }) {
  const session = useSession()
  const [allowed, setAllowed] = useState<boolean | undefined>(undefined)
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) return
    let live = true
    isAdmin()
      .then((ok) => live && setAllowed(ok))
      .catch(() => live && setAllowed(false))
    return () => {
      live = false
      setAllowed(undefined)
    }
  }, [userId])

  if (session === undefined) return <main className="page flow" />
  if (!session) return <Login />
  if (allowed === undefined) return <main className="page flow" />
  if (!allowed) {
    return (
      <main className="page flow coming-soon">
        <p className="kicker">Administrator</p>
        <h1 className="display lg">No access</h1>
        <p className="serif">{session.user.email} isn’t set up as an admin.</p>
        <button className="btn" onClick={() => void signOut()}>
          Sign out
        </button>
      </main>
    )
  }
  return children
}
