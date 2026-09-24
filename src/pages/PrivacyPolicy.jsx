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
          <p>Last updated: September 2026</p>
          <p>
            Aiventre ("we", "us") builds an AI front desk for clinics: it answers calls and messages, books
            appointments and sends reminders on the clinic's behalf. This policy explains what information we
            collect, how we use it, and the choices you have.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">What we collect</h2>
          <p>
            We collect the details clinics give us to set up their account. When a patient calls or messages a
            clinic that uses Aiventre, we process what they share in that conversation (such as name, phone
            number, the reason for the visit and the appointment time) so we can answer them and book on the
            clinic's behalf. We do not buy or scrape contact lists.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">How we use it</h2>
          <p>
            Data is used only to run the service for the clinic — answering enquiries, booking and rescheduling
            appointments, sending reminders, and showing conversations in the clinic's dashboard. We do not sell
            clinic or patient data, and we only message patients who contacted the clinic or are already its
            patients.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">Data security</h2>
          <p>
            Access to data is limited to the people and systems needed to run the service. Clinics can ask us to
            export or delete their data, and patients can ask the clinic or us to delete theirs, by writing to the
            address below.
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
