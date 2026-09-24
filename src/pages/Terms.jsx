import { Link } from 'react-router-dom'
import { ArrowLeft, Bot } from 'lucide-react'

export default function Terms() {
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
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight mb-8">Terms of Service</h1>
        <div className="space-y-6 text-muted leading-relaxed text-[15px]">
          <p>Last updated: September 2026</p>
          <p>
            By using Aiventre, you agree to the following terms. Please read them carefully before connecting your
            clinic.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">The service</h2>
          <p>
            Aiventre answers calls and messages to your clinic, books and reschedules appointments, and sends
            confirmations and reminders on your behalf, using the doctors, timings, prices and rules you give us.
            It does not give medical advice; medical questions, emergencies and complaints are handed to your staff.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">Your responsibilities</h2>
          <p>
            You are responsible for keeping your clinic information (doctors, timings, prices, services) accurate
            and for following up on conversations Aiventre flags to your staff. Aiventre only contacts people who
            contacted your clinic or are already your patients.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">Billing</h2>
          <p>
            Subscription plans are billed as agreed at signup. You may cancel at any time; access continues until
            the end of the current billing period.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">Contact</h2>
          <p>
            Questions about these terms can be sent to{' '}
            <a href="mailto:hello@aiventre.com" className="text-primary hover:underline">hello@aiventre.com</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
