import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useStore } from '../store.js'

function Section({ title, items }) {
  return items?.length ? (
      <section className="break-inside-avoid">
        <h2 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-primary-dark">{title}</h2>
        <p className="text-sm text-ink">{items.join(' · ')}</p>
      </section>
  ) : null
}

/* One-page capability profile for buyers. Print → "Save as PDF" to attach it. */
export default function PrintProfile() {
  const p = useStore((s) => s.profile)

  useEffect(() => {
    document.title = `${p.shop_name || 'Shop'} — capability profile`
  }, [p.shop_name])

  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-6 print:hidden">
        <Link to="/app/profile" className="text-sm text-primary underline">
          ← Edit profile
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <article className="mx-auto max-w-3xl px-6 py-10 print:py-0">
        <header className="border-b-2 border-ink pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Capability profile</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{p.shop_name || 'Your shop name'}</h1>
          <p className="mt-1 text-muted">{[p.city, p.state].filter(Boolean).join(', ')}</p>
          {p.summary && <p className="mt-3 max-w-2xl text-lg leading-snug">{p.summary}</p>}
        </header>

        <section className="mt-6 break-inside-avoid">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary-dark">Machines</h2>
          {p.machines.length ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-divider text-muted">
                  <th className="py-1.5 font-medium">Machine</th>
                  <th className="py-1.5 font-medium">Qty</th>
                  <th className="py-1.5 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {p.machines.map((m, i) => (
                  <tr key={i} className="border-b border-divider/60">
                    <td className="py-1.5 font-semibold">{[m.type, m.model].filter(Boolean).join(' ')}</td>
                    <td className="py-1.5 tabular-nums">{m.count}</td>
                    <td className="py-1.5 text-muted">{m.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">Add your machines in “My shop”.</p>
          )}
        </section>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Section title="Capabilities" items={p.capabilities} />
          <Section title="Materials" items={p.materials} />
          <Section title="Industries served" items={p.industries} />
          <Section title="Certifications" items={p.certifications} />
        </div>

        <footer className="mt-8 break-inside-avoid rounded-2xl bg-background p-5 print:border print:border-divider print:bg-white">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary-dark">Send us a drawing for a quote</p>
          <p className="mt-1 font-display text-lg font-bold">{p.contact_name || p.shop_name}</p>
          <p className="text-sm">{[p.phone, p.email].filter(Boolean).join(' · ') || 'Add your phone and email in “My shop”.'}</p>
        </footer>
      </article>
    </div>
  )
}
