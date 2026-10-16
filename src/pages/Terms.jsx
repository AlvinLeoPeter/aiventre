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
            By using Aiventre, you agree to the following terms. Please read them carefully. The service is in a
            pilot phase and may change.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">The service</h2>
          <p>
            Aiventre helps manufacturing job shops find potential buyers, draft outreach emails, sort replies and
            estimate machining time for quotes. It does not send messages or make calls for you.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">Your responsibilities</h2>
          <p>
            You decide what to send and to whom. Check each buyer and each draft before you contact anyone, keep
            outreach relevant and business-to-business, and respect any request not to be contacted again. You are
            responsible for the messages you send and for complying with applicable laws.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">AI output</h2>
          <p>
            AI-generated research, drafts and estimates can be incomplete or wrong. Machining time and price
            estimates are guidance only; you are responsible for the prices you quote. Verify company details at the
            source link provided.
          </p>
          <h2 className="font-display font-bold text-xl text-ink mt-8 mb-2">Your data</h2>
          <p>
            During the pilot your data is stored in your browser. Keep your own backups using the backup feature.
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
