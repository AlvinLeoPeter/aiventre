import { Link } from 'react-router-dom'
import { ArrowLeft, Bot } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary lift-on-hover mb-10">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="flex items-center gap-2 mb-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Bot className="h-5 w-5 text-white" strokeWidth={2.4} />
          </span>
          <span className="font-display font-bold text-lg">Aiventre</span>
        </div>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-muted leading-relaxed text-[15px]">
          <p>Last updated: July 2026</p>
          <p>
            Aiventre ("we", "us") builds AI-powered sales tools for small businesses. This policy explains what
            information we collect, how we use it, and the choices you have.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">What we collect</h2>
          <p>
            We collect the business and contact details you provide to us, along with information about the leads
            and customers you ask Aiventre to reach out to on your behalf, so we can send emails, place calls, and
            schedule appointments as instructed.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">How we use it</h2>
          <p>
            Data is used solely to operate your account — finding leads, sending outreach, handling calls, and
            managing bookings. We do not sell your data or your customers' data to third parties.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">Data security</h2>
          <p>
            All data is encrypted in transit and at rest. Access is limited to the systems required to deliver the
            service to you.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">Contact</h2>
          <p>
            Questions about this policy can be sent to{' '}
            <a href="mailto:hello@aiventre.com" className="text-primary hover:underline">hello@aiventre.com</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
